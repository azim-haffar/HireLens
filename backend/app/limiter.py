from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _get_user_or_ip(request: Request) -> str:
    """Rate-limit key: first 20 chars of Bearer token, or remote IP."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer ") and len(auth) > 27:
        return f"user:{auth[7:27]}"
    return get_remote_address(request)


limiter = Limiter(key_func=_get_user_or_ip)
