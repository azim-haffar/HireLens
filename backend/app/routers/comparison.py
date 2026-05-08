from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.supabase_client import supabase_admin
from app.models.cv import ParsedCV
from app.models.job import JobData
from app.services.match_scorer import compute_match_score
from app.services.ats_checker import run_ats_check

router = APIRouter()


class ComparisonRequest(BaseModel):
    cv_id_a: str
    cv_id_b: str
    job_id: str


class CVScoreSummary(BaseModel):
    cv_id: str
    name: str
    match_score: int
    ats_score: int
    skill_fit: float
    experience: float
    education: float
    keyword_coverage: float
    matched_skills: list[str]
    missing_skills: list[str]


class ComparisonResponse(BaseModel):
    cv_a: CVScoreSummary
    cv_b: CVScoreSummary
    winner: str
    verdict: str


def _score_cv(cv_id: str, user_id: str, job: JobData) -> CVScoreSummary:
    row = supabase_admin.table("cv_versions").select("parsed_data, raw_text").eq("id", cv_id).eq("user_id", user_id).single().execute()
    data = row.data["parsed_data"]
    data["raw_text"] = row.data.get("raw_text", "")
    cv = ParsedCV(**data)
    match = compute_match_score(cv, job)
    ats = run_ats_check(cv, job)
    return CVScoreSummary(
        cv_id=cv_id,
        name=cv.name,
        match_score=match.score,
        ats_score=ats.score,
        skill_fit=match.breakdown.skill_fit,
        experience=match.breakdown.experience,
        education=match.breakdown.education,
        keyword_coverage=match.breakdown.keyword_coverage,
        matched_skills=match.matched_skills,
        missing_skills=match.missing_skills,
    )


@router.post("/compare", response_model=ComparisonResponse)
async def compare_cvs(body: ComparisonRequest, user: dict = Depends(get_current_user)):
    """Compare two CVs against a single job description."""
    job_row = supabase_admin.table("jobs").select("parsed_data, raw_text").eq("id", body.job_id).eq("user_id", user["id"]).single().execute()
    job_data = job_row.data["parsed_data"]
    job_data["raw_text"] = job_row.data.get("raw_text", "")
    job = JobData(**job_data)

    a = _score_cv(body.cv_id_a, user["id"], job)
    b = _score_cv(body.cv_id_b, user["id"], job)

    if a.match_score > b.match_score:
        winner = a.name
        verdict = f"{a.name} wins with a {a.match_score} vs {b.match_score} match score."
    elif b.match_score > a.match_score:
        winner = b.name
        verdict = f"{b.name} wins with a {b.match_score} vs {a.match_score} match score."
    else:
        winner = "Tie"
        verdict = "Both CVs score equally. Consider ATS and skill fit details."

    return ComparisonResponse(cv_a=a, cv_b=b, winner=winner, verdict=verdict)
