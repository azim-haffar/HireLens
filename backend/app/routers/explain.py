from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.ownership import get_owned_record
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
    cv_row = get_owned_record("cv_versions", body.cv_id, user["id"], "parsed_data, raw_text", "CV")

    job_row = get_owned_record("jobs", body.job_id, user["id"], "parsed_data, raw_text", "Job")

    cv_data = cv_row["parsed_data"]
    cv_data["raw_text"] = cv_row.get("raw_text", "")
    cv = ParsedCV(**cv_data)

    job_data = job_row["parsed_data"]
    job_data["raw_text"] = job_row.get("raw_text", "")
    job = JobData(**job_data)

    match_result = compute_match_score(cv, job)
    ats_result = run_ats_check(cv, job)

    prompt = _build_explain_prompt(cv, job, match_result.score, ats_result.score)

    def event_stream():
        for chunk in stream([{"role": "user", "content": prompt}]):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
