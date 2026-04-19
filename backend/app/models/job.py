from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobInputRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None


class ParsedJob(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    description: str = ""
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    required_experience_years: Optional[int] = None
    education_requirement: Optional[str] = None
    responsibilities: list[str] = []
    keywords: list[str] = []


class JobResponse(BaseModel):
    id: str
    title: Optional[str]
    company: Optional[str]
    parsed_data: dict
    source_url: Optional[str]
    created_at: datetime
