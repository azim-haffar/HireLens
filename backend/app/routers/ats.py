import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.supabase_client import supabase_admin
from app.models.cv import ParsedCV
from app.models.job import JobData
from app.models.scoring import ATSResult, DeepATSResult
from app.services.ats_checker import run_ats_check
from app.services.deep_ats_checker import run_deep_ats_check

router = APIRouter()

# ── In-memory rate limiter for /deep-check (unauthenticated path) ─────────────
# Stores list of request timestamps per IP
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT   = 5      # max requests
RATE_WINDOW  = 3600   # per hour (seconds)
MAX_PDF_SIZE = 5 * 1024 * 1024  # 5 MB


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window_start = now - RATE_WINDOW
    timestamps = [t for t in _rate_store[ip] if t > window_start]
    if len(timestamps) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT} deep checks per hour for unauthenticated requests.",
        )
    timestamps.append(now)
    _rate_store[ip] = timestamps


def _try_get_user(authorization: str | None) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    from app.core.supabase_client import supabase
    try:
        result = supabase.auth.get_user(authorization.removeprefix("Bearer ").strip())
        return {"id": result.user.id, "email": result.user.email} if result.user else None
    except Exception:
        return None


class ATSRequest(BaseModel):
    cv_id: str
    job_id: str


@router.post("/check", response_model=ATSResult)
async def check_ats(body: ATSRequest, user: dict = Depends(get_current_user)):
    """Run ATS check on a CV against a job posting."""
    cv_row = supabase_admin.table("cv_versions").select("parsed_data").eq("id", body.cv_id).eq("user_id", user["id"]).single().execute()
    if not cv_row.data:
        raise HTTPException(status_code=404, detail="CV not found.")

    job_row = supabase_admin.table("jobs").select("parsed_data, raw_text").eq("id", body.job_id).eq("user_id", user["id"]).single().execute()
    if not job_row.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    cv = ParsedCV(**cv_row.data["parsed_data"])
    job = JobData(**job_row.data["parsed_data"], raw_text=job_row.data.get("raw_text", ""))

    return run_ats_check(cv, job)


@router.post("/deep-check", response_model=DeepATSResult)
async def deep_check_ats(
    cv: UploadFile = File(...),
    authorization: str | None = Header(default=None),
    x_forwarded_for: str | None = Header(default=None),
    x_real_ip: str | None = Header(default=None),
):
    """
    Standalone 20-rule ATS audit. Accepts a PDF upload only — no job required.
    Unauthenticated: 5 requests/hour per IP.
    Authenticated (valid Bearer token): unlimited.
    """
    user = _try_get_user(authorization)

    if user is None:
        ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else (x_real_ip or "unknown")
        _check_rate_limit(ip)

    if cv.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await cv.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 5 MB limit.")

    return run_deep_ats_check(pdf_bytes)
