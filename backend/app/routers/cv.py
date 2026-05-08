import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.supabase_client import supabase_admin
from app.models.cv import CVUploadResponse
from app.services.cv_parser import extract_text_from_pdf, parse_cv_with_groq

router = APIRouter()


@router.post("/upload", response_model=CVUploadResponse)
async def upload_cv(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a PDF CV, extract text, parse with Groq, store in Supabase."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    raw_text = extract_text_from_pdf(pdf_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    parsed = parse_cv_with_groq(raw_text)

    cv_id = str(uuid.uuid4())
    supabase_admin.table("cv_versions").insert({
        "id": cv_id,
        "user_id": user["id"],
        "filename": file.filename,
        "raw_text": raw_text,
        "parsed_data": parsed.model_dump(exclude={"raw_text"}),
    }).execute()

    return CVUploadResponse(cv_id=cv_id, parsed=parsed)


@router.get("/versions")
async def list_cv_versions(user: dict = Depends(get_current_user)):
    """List all CV versions for the current user."""
    result = (
        supabase_admin.table("cv_versions")
        .select("id, filename, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/versions/{cv_id}", status_code=204)
async def delete_cv(cv_id: str, user: dict = Depends(get_current_user)):
    """Delete a CV version owned by the current user."""
    existing = (
        supabase_admin.table("cv_versions")
        .select("id")
        .eq("id", cv_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="CV not found.")
    supabase_admin.table("cv_versions").delete().eq("id", cv_id).execute()
