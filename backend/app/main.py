import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import get_settings
from app.limiter import limiter
from app.routes import cv, job, analysis, applications, cover_letter, chat

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Sentry (optional — only when SENTRY_DSN is set) ──────────────────────────
try:
    import sentry_sdk  # type: ignore
    if settings.sentry_dsn:
        sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)
        logger.info("Sentry initialised")
except ImportError:
    pass

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="HireLens API",
    description="AI-powered recruitment screening engine",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
)

# ── Rate limiter ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Security headers ──────────────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hire-lens-topaz.vercel.app",
        "https://hire-lens-git-main-lightnin1s-projects.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(cv.router)
app.include_router(job.router)
app.include_router(analysis.router)
app.include_router(applications.router)
app.include_router(cover_letter.router)
app.include_router(chat.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "HireLens API"}
