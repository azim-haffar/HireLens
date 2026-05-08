from pydantic import BaseModel
from typing import Optional


class JobData(BaseModel):
    title: str
    company: str
    required_skills: list[str] = []
    nice_to_have: list[str] = []
    experience_level: str = ""
    education_requirement: str = ""
    raw_text: str = ""


class JobIngestRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None


class JobIngestResponse(BaseModel):
    job_id: str
    job: JobData
