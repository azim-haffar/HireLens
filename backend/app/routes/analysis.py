import asyncio
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from app.models.analysis import AnalysisRequest, CompareRequest
from app.services.ats_checker import check_ats
from app.services.scoring_engine import score_cv_against_job
from app.services.interview_gen import generate_interview_questions
from app.database import get_supabase_service
from app.utils.helpers import require_user
from app.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])


def _fetch_cv(db, cv_id: str, user_id: str) -> dict:
    result = db.table("cvs").select("*").eq("id", cv_id).eq("user_id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
    return result.data["parsed_data"]


def _fetch_job(db, job_id: str, user_id: str) -> dict:
    result = db.table("jobs").select("*").eq("id", job_id).eq("user_id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return result.data["parsed_data"]


@router.post("/")
@limiter.limit("5/minute")
async def run_analysis(
    request: Request,
    body: AnalysisRequest,
    user: dict = Depends(require_user),
):
    logger.info("Analysis request user=%s cv=%s job=%s", user["id"], body.cv_id, body.job_id)
    db = get_supabase_service()
    cv_data = _fetch_cv(db, body.cv_id, user["id"])
    job_data = _fetch_job(db, body.job_id, user["id"])

    logger.info("CV parsed_data keys: %s", list(cv_data.keys()) if isinstance(cv_data, dict) else type(cv_data))
    logger.info("Job parsed_data keys: %s", list(job_data.keys()) if isinstance(job_data, dict) else type(job_data))

    # Run ATS check and scoring concurrently; handle individual failures gracefully
    results = await asyncio.gather(
        check_ats(cv_data, job_data),
        score_cv_against_job(cv_data, job_data),
        return_exceptions=True,
    )
    ats_report, score_result = results

    if isinstance(ats_report, Exception):
        logger.error("ATS check failed: %s", ats_report)
        ats_report = {
            "score": 0,
            "issues": [],
            "passed_checks": [],
            "overall_assessment": "ATS check temporarily unavailable",
        }

    if isinstance(score_result, Exception):
        logger.error("Scoring failed: %s", score_result)
        score_result = {
            "overall_score": 0,
            "verdict": "unknown",
            "matched_skills": [],
            "missing_skills": [],
            "skill_match_score": 0,
            "experience_score": 0,
            "education_score": 0,
            "keyword_score": 0,
            "reasons": [],
            "recommendations": [],
        }

    # Generate interview questions with actual score context
    try:
        interview_questions = await generate_interview_questions(cv_data, job_data, score_result)
    except Exception as e:
        logger.error("Interview generation failed: %s", e)
        interview_questions = []

    record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "cv_id": body.cv_id,
        "job_id": body.job_id,
        "ats_report": ats_report,
        "score_result": score_result,
        "interview_questions": interview_questions,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = db.table("analyses").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save analysis")

    logger.info("Analysis saved id=%s user=%s score=%s", record["id"], user["id"], score_result.get("overall_score"))
    return result.data[0]


@router.post("/compare")
async def compare_cvs(
    body: CompareRequest,
    user: dict = Depends(require_user),
):
    logger.info("Compare request user=%s v1=%s v2=%s", user["id"], body.cv_id_v1, body.cv_id_v2)
    db = get_supabase_service()
    cv_v1 = _fetch_cv(db, body.cv_id_v1, user["id"])
    cv_v2 = _fetch_cv(db, body.cv_id_v2, user["id"])
    job_data = _fetch_job(db, body.job_id, user["id"])

    score_v1, score_v2 = await asyncio.gather(
        score_cv_against_job(cv_v1, job_data),
        score_cv_against_job(cv_v2, job_data),
    )

    from app.services.gemini import call_gemini
    summary_prompt = f"""Compare these two CV scores for the same job and summarize improvements.
V1 Score: {score_v1.get('overall_score')}, verdict: {score_v1.get('verdict')}
V2 Score: {score_v2.get('overall_score')}, verdict: {score_v2.get('verdict')}
V1 missing: {score_v1.get('missing_skills', [])}
V2 missing: {score_v2.get('missing_skills', [])}

Return ONLY valid JSON:
{{
  "improvement_areas": ["area1", "area2"],
  "summary": "2-3 sentence comparison summary"
}}"""
    comparison = await call_gemini(summary_prompt)

    return {
        "v1_score": score_v1,
        "v2_score": score_v2,
        "improvement_areas": comparison.get("improvement_areas", []),
        "summary": comparison.get("summary", ""),
    }


@router.get("/")
async def list_analyses(user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("analyses")
        .select("id, cv_id, job_id, created_at, score_result->overall_score, score_result->verdict")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    analyses = result.data or []

    # Enrich each analysis with job title + company
    job_ids = list({a["job_id"] for a in analyses if a.get("job_id")})
    if job_ids:
        jobs_result = (
            db.table("jobs")
            .select("id, title, company")
            .in_("id", job_ids)
            .execute()
        )
        jobs_map = {j["id"]: j for j in (jobs_result.data or [])}
        for a in analyses:
            job = jobs_map.get(a.get("job_id"), {})
            a["job_title"] = job.get("title")
            a["job_company"] = job.get("company")

    return analyses


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("analyses")
        .select("*")
        .eq("id", analysis_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result.data
