from fastapi import HTTPException
from app.core.supabase_client import supabase_admin


def get_owned_record(table: str, record_id: str, user_id: str,
                     columns: str = "*", label: str = "Record") -> dict:
    """Service-role reads must constrain ownership before returning data."""
    result = (supabase_admin.table(table).select(columns)
              .eq("id", record_id).eq("user_id", user_id).limit(1).execute())
    if not result.data:
        # Do not reveal whether another user's record exists.
        raise HTTPException(status_code=404, detail=f"{label} not found.")
    return result.data[0]
