from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.groq_client import stream
from app.core.supabase_client import supabase_admin
from app.models.cv import ParsedCV
from app.models.job import JobData

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    cv_id: str
    job_id: str
    messages: list[ChatMessage]


SYSTEM_PROMPT = """You are a career coach assistant embedded in HireLens, an AI-powered recruitment analysis tool.

Current analysis context:
Candidate: {name}
Skills: {skills}
Experience: {experience}
Job: {job_title} at {company}
Required skills: {required_skills}

Answer questions about the candidate's fit for this role, give actionable advice, and help with interview prep."""


@router.post("/stream")
async def chat_stream(body: ChatRequest, user: dict = Depends(get_current_user)):
    """Stream AI chat responses scoped to the current CV + job analysis."""
    cv_row = supabase_admin.table("cv_versions").select("parsed_data").eq("id", body.cv_id).eq("user_id", user["id"]).single().execute()
    if not cv_row.data:
        raise HTTPException(status_code=404, detail="CV not found.")

    job_row = supabase_admin.table("jobs").select("parsed_data").eq("id", body.job_id).eq("user_id", user["id"]).single().execute()
    if not job_row.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    cv = ParsedCV(**cv_row.data["parsed_data"])
    job = JobData(**job_row.data["parsed_data"])

    system_content = SYSTEM_PROMPT.format(
        name=cv.name,
        skills=", ".join(cv.skills[:15]),
        experience=", ".join(f"{e.title} at {e.company}" for e in cv.experience[:3]),
        job_title=job.title,
        company=job.company,
        required_skills=", ".join(job.required_skills[:10]),
    )

    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages[-10:]]

    def event_stream():
        for chunk in stream(messages):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
