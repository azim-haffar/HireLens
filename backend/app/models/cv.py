from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CVUploadResponse(BaseModel):
    id: str
    filename: str
    parsed_data: dict
    created_at: datetime


class ParsedCV(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    projects: list[dict] = []
    certifications: list[str] = []
    languages: list[str] = []
    raw_text: str = ""
