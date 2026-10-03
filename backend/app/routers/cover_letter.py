from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.ownership import get_owned_record
from app.core.groq_client import chat
from app.core.supabase_client import supabase_admin
from app.models.cv import ParsedCV
from app.models.job import JobData

router = APIRouter()


class CoverLetterRequest(BaseModel):
    cv_id: str
    job_id: str


class CoverLetterResponse(BaseModel):
    subject: str
    body: str


PROMPT = """Write a tailored cover letter for this job application. Return JSON only.

Candidate: {name}
Skills: {skills}
Experience: {experience}
Job: {title} at {company}
Required skills: {required_skills}
Experience level: {level}

Return:
{{
  "subject": "Application for {title} — {name}",
  "body": "Full cover letter text..."
}}

Guidelines: Professional but warm tone. 3 paragraphs. Reference specific skills from the job. No generic filler."""


@router.post("/generate", response_model=CoverLetterResponse)
async def generate_cover_letter(body: CoverLetterRequest, user: dict = Depends(get_current_user)):
    """Generate a tailored cover letter for the CV + job combination."""
    cv_row = get_owned_record("cv_versions", body.cv_id, user["id"], "parsed_data", "CV")

    job_row = get_owned_record("jobs", body.job_id, user["id"], "parsed_data", "Job")

    cv = ParsedCV(**cv_row["parsed_data"])
    job = JobData(**job_row["parsed_data"])

    exp_summary = "; ".join(f"{e.title} at {e.company}" for e in cv.experience[:3])

    import json
    prompt = PROMPT.format(
        name=cv.name,
        skills=", ".join(cv.skills[:15]),
        experience=exp_summary,
        title=job.title,
        company=job.company,
        required_skills=", ".join(job.required_skills[:10]),
        level=job.experience_level,
    )

    content = chat([{"role": "user", "content": prompt}], json_mode=True)
    data = json.loads(content)
    return CoverLetterResponse(**data)
