import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.ownership import get_owned_record
from app.core.groq_client import chat
from app.core.supabase_client import supabase_admin
from app.models.cv import ParsedCV
from app.models.job import JobData

router = APIRouter()


class InterviewRequest(BaseModel):
    cv_id: str
    job_id: str


class InterviewQuestion(BaseModel):
    question: str
    type: str
    framework: str
    answer_outline: str


class InterviewResponse(BaseModel):
    questions: list[InterviewQuestion]


PROMPT = """Generate exactly 10 interview questions for this role. Return JSON only.

Role: {title} at {company}
Required skills: {skills}
Experience level: {level}
Candidate background: {background}

Return this exact JSON structure:
{{
  "questions": [
    {{
      "question": "...",
      "type": "technical|behavioural|situational",
      "framework": "STAR|Technical",
      "answer_outline": "Brief answer guide..."
    }}
  ]
}}

Mix: 4 technical, 3 behavioural, 3 situational."""


@router.post("/generate", response_model=InterviewResponse)
async def generate_interview(body: InterviewRequest, user: dict = Depends(get_current_user)):
    """Generate 10 role-specific interview questions with answer frameworks."""
    cv_row = get_owned_record("cv_versions", body.cv_id, user["id"], "parsed_data", "CV")

    job_row = get_owned_record("jobs", body.job_id, user["id"], "parsed_data", "Job")

    cv = ParsedCV(**cv_row["parsed_data"])
    job = JobData(**job_row["parsed_data"])

    background = f"{', '.join(e.title for e in cv.experience[:3])} | Skills: {', '.join(cv.skills[:10])}"

    prompt = PROMPT.format(
        title=job.title,
        company=job.company,
        skills=", ".join(job.required_skills[:15]),
        level=job.experience_level,
        background=background,
    )

    content = chat([{"role": "user", "content": prompt}], json_mode=True)
    data = json.loads(content)
    return InterviewResponse(**data)
