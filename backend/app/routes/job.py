import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from app.models.job import JobInputRequest
from app.services.job_scraper import parse_job
from app.database import get_supabase_service
from app.utils.helpers import require_user
from app.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/job", tags=["Job"])


@router.post("/")
@limiter.limit("10/minute")
async def create_job(
    request: Request,
    body: JobInputRequest,
    user: dict = Depends(require_user),
):
    logger.info("Job create request user=%s url=%s", user["id"], body.url)
    parsed_data = await parse_job(url=body.url, text=body.text)

    def _null(v):
        if v is None: return None
        return None if str(v).strip().lower() in ("null","none","n/a","") else str(v).strip()

    db = get_supabase_service()
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": _null(parsed_data.get("title")),
        "company": _null(parsed_data.get("company")),
        "source_url": body.url,
        "parsed_data": parsed_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = db.table("jobs").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save job")

    logger.info("Job saved id=%s user=%s", record["id"], user["id"])
    return result.data[0]


@router.get("/")
async def list_jobs(user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("jobs")
        .select("id, title, company, source_url, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data or []


@router.get("/{job_id}")
async def get_job(job_id: str, user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data


@router.delete("/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("jobs")
        .delete()
        .eq("id", job_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    logger.info("Job deleted id=%s user=%s", job_id, user["id"])
    return {"message": "Job deleted"}
