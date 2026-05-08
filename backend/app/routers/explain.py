from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.groq_client import stream
from app.core.supabase_client import supabase_admin
from app.models.cv import ParsedCV
from app.models.job import JobData
from app.services.match_scorer import compute_match_score
from app.services.ats_checker import run_ats_check

router = APIRouter()


class ExplainRequest(BaseModel):
    cv_id: str
    job_id: str


def _build_explain_prompt(cv: ParsedCV, job: JobData, match_score: int, ats_score: int) -> str:
    return f"""You are a career coach. Explain in plain English why this candidate scored {match_score}/100 match and {ats_score}/100 ATS for the {job.title} role at {job.company}.

Candidate skills: {', '.join(cv.skills[:20])}
Required skills: {', '.join(job.required_skills[:20])}
Experience entries: {len(cv.experience)}
Experience level required: {job.experience_level}

Be specific, constructive, and encouraging. 3-4 paragraphs. Mention what's strong and what to improve."""


@router.post("/stream")
async def explain_stream(body: ExplainRequest, user: dict = Depends(get_current_user)):
    """Stream plain-English AI explanation of the analysis scores."""
    cv_row = supabase_admin.table("cv_versions").select("parsed_data, raw_text").eq("id", body.cv_id).eq("user_id", user["id"]).single().execute()
    if not cv_row.data:
        raise HTTPException(status_code=404, detail="CV not found.")

    job_row = supabase_admin.table("jobs").select("parsed_data, raw_text").eq("id", body.job_id).eq("user_id", user["id"]).single().execute()
    if not job_row.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    cv_data = cv_row.data["parsed_data"]
    cv_data["raw_text"] = cv_row.data.get("raw_text", "")
    cv = ParsedCV(**cv_data)

    job_data = job_row.data["parsed_data"]
    job_data["raw_text"] = job_row.data.get("raw_text", "")
    job = JobData(**job_data)

    match_result = compute_match_score(cv, job)
    ats_result = run_ats_check(cv, job)

    prompt = _build_explain_prompt(cv, job, match_result.score, ats_result.score)

    def event_stream():
        for chunk in stream([{"role": "user", "content": prompt}]):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
