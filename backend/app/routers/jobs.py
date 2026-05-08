import uuid
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.supabase_client import supabase_admin
from app.models.job import JobIngestRequest, JobIngestResponse
from app.services.job_scraper import scrape_job_url, extract_job_with_groq

router = APIRouter()


@router.get("/list")
async def list_jobs(user: dict = Depends(get_current_user)):
    """List all saved jobs for the current user."""
    result = (
        supabase_admin.table("jobs")
        .select("id, parsed_data, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    """Delete a saved job owned by the current user."""
    existing = (
        supabase_admin.table("jobs")
        .select("id")
        .eq("id", job_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found.")
    supabase_admin.table("jobs").delete().eq("id", job_id).execute()


@router.post("/ingest", response_model=JobIngestResponse)
async def ingest_job(
    body: JobIngestRequest,
    user: dict = Depends(get_current_user),
):
    """Ingest a job posting from URL or raw text."""
    if not body.url and not body.text:
        raise HTTPException(status_code=400, detail="Provide a URL or text.")

    if body.url:
        try:
            raw_text = scrape_job_url(body.url)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Failed to scrape URL: {exc}")
    else:
        raw_text = body.text

    job = extract_job_with_groq(raw_text)

    job_id = str(uuid.uuid4())
    supabase_admin.table("jobs").insert({
        "id": job_id,
        "user_id": user["id"],
        "url": body.url or "",
        "raw_text": raw_text,
        "parsed_data": job.model_dump(exclude={"raw_text"}),
    }).execute()

    return JobIngestResponse(job_id=job_id, job=job)
