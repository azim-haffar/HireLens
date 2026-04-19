import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from app.services.cv_parser import parse_cv
from app.database import get_supabase_service
from app.utils.helpers import require_user
from app.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/cv", tags=["CV"])


@router.post("/upload")
@limiter.limit("10/minute")
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(require_user),
):
    logger.info("CV upload request from user=%s filename=%s", user["id"], file.filename)
    parsed_data = await parse_cv(file)

    db = get_supabase_service()
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "filename": file.filename,
        "parsed_data": parsed_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = db.table("cvs").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save CV")

    logger.info("CV saved id=%s user=%s", record["id"], user["id"])
    return result.data[0]


@router.get("/")
async def list_cvs(user: dict = Depends(require_user)):
    logger.info("List CVs user=%s", user["id"])
    db = get_supabase_service()
    result = (
        db.table("cvs")
        .select("id, filename, created_at, parsed_data->name, parsed_data->skills")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data or []


@router.get("/{cv_id}")
async def get_cv(cv_id: str, user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = (
        db.table("cvs")
        .select("*")
        .eq("id", cv_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="CV not found")
    return result.data


@router.delete("/{cv_id}")
async def delete_cv(cv_id: str, user: dict = Depends(require_user)):
    db = get_supabase_service()
    result = db.table("cvs").delete().eq("id", cv_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="CV not found")
    logger.info("CV deleted id=%s user=%s", cv_id, user["id"])
    return {"message": "CV deleted"}
