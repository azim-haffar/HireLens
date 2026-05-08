import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.supabase_client import supabase_admin
from app.models.cv import ParsedCV
from app.models.job import JobData
from app.models.scoring import MatchResult
from app.services.match_scorer import compute_match_score

router = APIRouter()


class MatchRequest(BaseModel):
    cv_id: str
    job_id: str


@router.post("/score", response_model=MatchResult)
async def score_match(body: MatchRequest, user: dict = Depends(get_current_user)):
    """Compute weighted match score between CV and job."""
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

    result = compute_match_score(cv, job)

    # Persist analysis
    analysis_id = str(uuid.uuid4())
    supabase_admin.table("analyses").insert({
        "id": analysis_id,
        "user_id": user["id"],
        "cv_id": body.cv_id,
        "job_id": body.job_id,
        "match_score": result.score,
        "ats_score": None,
        "breakdown": result.breakdown.model_dump(),
    }).execute()

    return result
