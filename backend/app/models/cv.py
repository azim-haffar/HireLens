from pydantic import BaseModel
from typing import Optional


class Experience(BaseModel):
    title: str
    company: str
    duration: str
    description: str = ""


class Education(BaseModel):
    degree: str
    institution: str
    year: str = ""


class ParsedCV(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    skills: list[str] = []
    experience: list[Experience] = []
    education: list[Education] = []
    projects: list[str] = []
    raw_text: str = ""


class CVUploadResponse(BaseModel):
    cv_id: str
    parsed: ParsedCV
