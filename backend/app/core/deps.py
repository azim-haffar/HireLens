from fastapi import Header, HTTPException, status
from app.core.supabase_client import supabase


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Validate Bearer token and return Supabase user dict."""
    scheme, _, token = (authorization or "").partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required", headers={"WWW-Authenticate": "Bearer"})
    try:
        result = supabase.auth.get_user(token)
        if not result.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"id": result.user.id, "email": result.user.email}
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
