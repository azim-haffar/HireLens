import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.models.application import ApplicationCreate, ApplicationUpdate
from app.database import get_supabase_service
from app.utils.helpers import require_user
from app.services.email import send_status_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/applications", tags=["Applications"])

VALID_STATUSES = {"saved", "applied", "interview", "offer", "rejected", "ghosted"}


@router.post("/")
async def create_application(
    body: ApplicationCreate,
    user: dict = Depends(require_user),
):
    logger.info("Create application user=%s analysis=%s", user["id"], body.analysis_id)
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

    score = analysis.data.get("score_result", {}).get("overall_score")
    job_id = analysis.data.get("job_id")
    job = db.table("jobs").select("title, company").eq("id", job_id).single().execute()
    job_data = job.data or {}

    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "analysis_id": body.analysis_id,
        "status": "saved",
        "notes": body.notes,
        "job_title": job_data.get("title"),
        "company": job_data.get("company"),
        "score": score,
        "created_at": now,
        "updated_at": now,
    }
    result = db.table("applications").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create application")

    logger.info("Application created id=%s user=%s", record["id"], user["id"])
    return result.data[0]


@router.get("/")
async def list_applications(user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("applications")
        .select("*")
        .eq("user_id", user["id"])
        .order("updated_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data or []


@router.patch("/{app_id}")
async def update_application(
    app_id: str,
    body: ApplicationUpdate,
    user: dict = Depends(require_user),
):
    if body.status is not None and body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {sorted(VALID_STATUSES)}",
        )

    db = get_supabase_service()
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.status is not None:
        update_data["status"] = body.status
    if body.notes is not None:
        update_data["notes"] = body.notes
    if body.applied_date is not None:
        update_data["applied_date"] = body.applied_date.isoformat()

    result = (
        db.table("applications")
        .update(update_data)
        .eq("id", app_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    logger.info("Application updated id=%s fields=%s user=%s", app_id, list(update_data.keys()), user["id"])
    updated = result.data[0]

    if body.status is not None:
        import asyncio
        asyncio.create_task(send_status_email(
            user_email=user["email"],
            status=body.status,
            job_title=updated.get("job_title"),
            company=updated.get("company"),
        ))

    return updated


@router.delete("/{app_id}")
async def delete_application(app_id: str, user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("applications")
        .delete()
        .eq("id", app_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    logger.info("Application deleted id=%s user=%s", app_id, user["id"])
    return {"message": "Application deleted"}
