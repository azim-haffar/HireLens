import json
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.utils.helpers import require_user
from app.database import get_supabase_service
from app.services.groq_client import get_groq_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    analysis_id: str
    messages: list[ChatMessage]


def _build_system_prompt(cv: dict, job: dict, score: dict, ats: dict) -> str:
    cv_data = cv.get("parsed_data", {})
    job_data = job.get("parsed_data", {})

    name = cv_data.get("name", "the candidate")
    skills = cv_data.get("skills", cv_data.get("technical_skills", []))
    experience = cv_data.get("experience", cv_data.get("work_experience", []))
    top_role = experience[0] if experience else {}

    job_title = job.get("title") or job_data.get("title", "this role")
    company = job.get("company") or job_data.get("company", "the company")
    required_skills = job_data.get("required_skills", job_data.get("skills", []))

    overall_score = score.get("overall_score", "N/A")
    verdict = score.get("verdict", "")
    matched = score.get("matched_skills", [])
    missing = score.get("missing_skills", [])
    ats_issues = [f for f in ats.get("flags", []) if f.get("severity") in ("critical", "warning")]

    return f"""You are HireLens AI, a career coaching assistant with full context about this candidate's CV and target job.

CANDIDATE: {name}
Skills: {', '.join(skills[:15]) if skills else 'not specified'}
Most recent role: {top_role.get('title', '')} at {top_role.get('company', '')}
Years experience: {cv_data.get('total_years_experience', cv_data.get('years_experience', 'unknown'))}

TARGET JOB: {job_title} at {company}
Required skills: {', '.join(required_skills[:12]) if required_skills else 'not specified'}

ANALYSIS RESULTS:
- Match score: {overall_score}/100 ({verdict})
- Matched skills: {', '.join(matched[:10]) if matched else 'none'}
- Missing skills: {', '.join(missing[:10]) if missing else 'none'}
- ATS issues: {len(ats_issues)} ({', '.join([f.get('check','') for f in ats_issues[:3]])}...)

Your role:
- Give specific, actionable career advice based on this exact CV and job
- Help rewrite bullet points, suggest skills to learn, explain ATS issues
- Be concise and direct — no generic advice
- Use the candidate's actual data in every answer
- Keep responses under 250 words unless a rewrite is requested"""


@router.post("/")
async def chat(body: ChatRequest, user: dict = Depends(require_user)):
    db = get_supabase_service()

    # Fetch analysis
    analysis_res = (
        db.table("analyses")
        .select("cv_id, job_id, score_result, ats_report")
        .eq("id", body.analysis_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not analysis_res.data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    analysis = analysis_res.data

    # Fetch CV and job in parallel
    cv_res = db.table("cvs").select("parsed_data").eq("id", analysis["cv_id"]).single().execute()
    job_res = db.table("jobs").select("title, company, parsed_data").eq("id", analysis["job_id"]).single().execute()

    cv = cv_res.data or {}
    job = job_res.data or {}
    score = analysis.get("score_result") or {}
    ats = analysis.get("ats_report") or {}

    system_prompt = _build_system_prompt(cv, job, score, ats)

    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages]

    async def stream_response():
        client = get_groq_client()

        def _sync_stream():
            return client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.4,
                max_tokens=512,
                stream=True,
            )

        try:
            stream = await asyncio.to_thread(_sync_stream)
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield f"data: {json.dumps({'content': content})}\n\n"
        except Exception as e:
            logger.error("Chat stream error: %s", e)
            yield f"data: {json.dumps({'error': 'AI service error'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")
