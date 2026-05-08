from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


ApplicationStatus = Literal["saved", "applied", "interview", "offer", "rejected", "ghosted"]


class ApplicationCreate(BaseModel):
    job_title: str
    company: str
    job_url: str = ""
    cv_id: Optional[str] = None
    analysis_id: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus


class Application(BaseModel):
    id: str
    user_id: str
    job_title: str
    company: str
    job_url: str
    status: ApplicationStatus
    cv_id: Optional[str]
    analysis_id: Optional[str]
    created_at: datetime
    updated_at: datetime
