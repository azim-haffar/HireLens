from fastapi import APIRouter, Depends, Query
from app.core.deps import get_current_user
from app.core.supabase_client import supabase_admin

router = APIRouter()


@router.get("/analyses")
async def list_analyses(
    user: dict = Depends(get_current_user),
    search: str = Query("", description="Search by job title or company"),
):
    """List all past analyses for the current user, optionally filtered."""
    query = (
        supabase_admin.table("analyses")
        .select("id, cv_id, job_id, match_score, ats_score, breakdown, created_at, jobs(parsed_data)")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
    )
    result = query.execute()
    rows = result.data or []

    if search:
        search_lower = search.lower()
        rows = [
            r for r in rows
            if search_lower in (r.get("jobs", {}) or {}).get("parsed_data", {}).get("title", "").lower()
            or search_lower in (r.get("jobs", {}) or {}).get("parsed_data", {}).get("company", "").lower()
        ]

    return rows
