import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.cover_letter import generate_cover_letter
from app.database import get_supabase_service
from app.utils.helpers import require_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/cover-letter", tags=["Cover Letter"])


class CoverLetterRequest(BaseModel):
    analysis_id: str


@router.post("/")
async def create_cover_letter(
    body: CoverLetterRequest,
    user: dict = Depends(require_user),
):
    logger.info("Cover letter request user=%s analysis=%s", user["id"], body.analysis_id)
    db = get_supabase_service()

    analysis = (
        db.table("analyses")
        .select("*")
        .eq("id", body.analysis_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not analysis.data:
        raise HTTPException(status_code=404, detail="Analysis not found")

    cv = (
        db.table("cvs")
        .select("parsed_data")
        .eq("id", analysis.data["cv_id"])
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    job = (
        db.table("jobs")
        .select("parsed_data")
        .eq("id", analysis.data["job_id"])
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not cv.data or not job.data:
        raise HTTPException(status_code=404, detail="CV or Job not found")

    result = await generate_cover_letter(
        cv_data=cv.data["parsed_data"],
        job_data=job.data["parsed_data"],
        score_data=analysis.data.get("score_result", {}),
    )

    # Cache cover letter back to analysis record (fire-and-forget — don't fail if caching fails)
    try:
        db.table("analyses").update({"cover_letter": result}).eq("id", body.analysis_id).execute()
        logger.info("Cover letter cached analysis=%s user=%s", body.analysis_id, user["id"])
    except Exception as e:
        logger.warning("Cover letter cache failed analysis=%s: %s", body.analysis_id, e)

    return result
