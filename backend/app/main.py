from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routers import (
    cv,
    jobs,
    ats,
    match,
    explain,
    interview,
    cover_letter,
    comparison,
    tracker,
    history,
    roast,
    chat,
)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="HireLens API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


app.include_router(cv.router, prefix="/cv", tags=["CV"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(ats.router, prefix="/ats", tags=["ATS"])
app.include_router(match.router, prefix="/match", tags=["Match"])
app.include_router(explain.router, prefix="/explain", tags=["Explain"])
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(cover_letter.router, prefix="/cover-letter", tags=["Cover Letter"])
app.include_router(comparison.router, prefix="/comparison", tags=["Comparison"])
app.include_router(tracker.router, prefix="/tracker", tags=["Tracker"])
app.include_router(history.router, prefix="/history", tags=["History"])
app.include_router(roast.router, prefix="/roast", tags=["Roast"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
