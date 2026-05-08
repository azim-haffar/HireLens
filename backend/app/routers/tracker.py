import uuid
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.supabase_client import supabase_admin
from app.models.tracker import ApplicationCreate, ApplicationUpdate
from app.services.email_service import send_status_notification

router = APIRouter()

NOTIFY_STATUSES = {"interview", "offer", "rejected"}


@router.get("/applications")
async def list_applications(user: dict = Depends(get_current_user)):
    """List all applications for the current user."""
    result = (
        supabase_admin.table("applications")
        .select("*")
        .eq("user_id", user["id"])
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/applications")
async def create_application(body: ApplicationCreate, user: dict = Depends(get_current_user)):
    """Create a new application in the tracker."""
    app_id = str(uuid.uuid4())
    row = {
        "id": app_id,
        "user_id": user["id"],
        "job_title": body.job_title,
        "company": body.company,
        "job_url": body.job_url,
        "status": "saved",
        "cv_id": body.cv_id,
        "analysis_id": body.analysis_id,
    }
    supabase_admin.table("applications").insert(row).execute()
    return {"id": app_id, **row}


@router.patch("/applications/{app_id}")
async def update_application_status(
    app_id: str,
    body: ApplicationUpdate,
    user: dict = Depends(get_current_user),
):
    """Update application status and send notification email if applicable."""
    row = (
        supabase_admin.table("applications")
        .select("user_id, job_title, company")
        .eq("id", app_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    supabase_admin.table("applications").update({"status": body.status}).eq("id", app_id).execute()

    if body.status in NOTIFY_STATUSES:
        send_status_notification(
            to_email=user["email"],
            status=body.status,
            job_title=row.data["job_title"],
            company=row.data["company"],
        )

    return {"id": app_id, "status": body.status}


@router.delete("/applications/{app_id}")
async def delete_application(app_id: str, user: dict = Depends(get_current_user)):
    """Delete an application."""
    supabase_admin.table("applications").delete().eq("id", app_id).eq("user_id", user["id"]).execute()
    return {"deleted": True}
