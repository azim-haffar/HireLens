from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class ApplicationCreate(BaseModel):
    analysis_id: str
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[date] = None


class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    analysis_id: str
    status: str
    notes: Optional[str]
    job_title: Optional[str]
    company: Optional[str]
    score: Optional[int]
    applied_date: Optional[date]
    created_at: datetime
    updated_at: datetime
