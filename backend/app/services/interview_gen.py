from app.services.gemini import call_gemini


async def generate_interview_questions(cv_data: dict, job_data: dict, score_data: dict) -> list:
    missing_skills = score_data.get("missing_skills", [])
    matched_skills = score_data.get("matched_skills", [])

    prompt = f"""You are an expert technical interviewer. Generate exactly 10 likely interview questions for this candidate based on their CV and the job they are applying for. Focus on skill gaps and areas that need verification.

Candidate:
- Name: {cv_data.get('name')}
- Skills: {cv_data.get('skills', [])}
- Experience: {cv_data.get('experience', [])}
- Missing skills for this role: {missing_skills}
- Matched skills: {matched_skills}

Job:
- Title: {job_data.get('title')}
- Company: {job_data.get('company')}
- Required Skills: {job_data.get('required_skills', [])}
- Responsibilities: {job_data.get('responsibilities', [])}

Generate a mix: 4 technical, 3 behavioral, 3 situational/role-specific.
For missing skills, craft probing questions to assess potential.

Return ONLY valid JSON array of exactly 10 objects:
[
  {{
    "question": "the interview question",
    "category": "technical|behavioral|situational",
    "difficulty": "easy|medium|hard",
    "why_asked": "why interviewers ask this (1 sentence)",
    "suggested_answer": "strong answer framework with key points to mention (3-5 sentences)"
  }}
]"""

    return await call_gemini(prompt)
