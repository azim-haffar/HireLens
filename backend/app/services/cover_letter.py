from app.services.groq_client import call_groq


async def generate_cover_letter(cv_data: dict, job_data: dict, score_data: dict) -> dict:
    matched_skills = score_data.get("matched_skills", [])
    experience = cv_data.get("experience", [])
    top_exp = experience[0] if experience else {}

    prompt = f"""You are a professional cover letter writer. Write a compelling, tailored cover letter for this candidate.

Candidate:
- Name: {cv_data.get('name', 'Candidate')}
- Email: {cv_data.get('email', '')}
- Top skills: {cv_data.get('skills', [])[:10]}
- Most recent role: {top_exp.get('title', '')} at {top_exp.get('company', '')}
- Years experience: {cv_data.get('total_years_experience', 0)}
- Summary: {cv_data.get('summary', '')}

Target Job:
- Title: {job_data.get('title')}
- Company: {job_data.get('company', 'the company')}
- Key requirements: {job_data.get('required_skills', [])[:8]}
- Responsibilities: {job_data.get('responsibilities', [])[:4]}

Matched skills to highlight: {matched_skills[:6]}

Requirements:
- Professional tone, 3-4 paragraphs
- Opening: hook with genuine enthusiasm for the specific role/company
- Body: connect 2-3 specific achievements/skills to job requirements
- Closing: clear call to action
- Do NOT use generic phrases like "I am writing to apply"
- Use specific, confident language

Return ONLY valid JSON:
{{
  "subject_line": "compelling email subject line",
  "cover_letter": "full cover letter text with proper paragraphs separated by \\n\\n",
  "key_highlights": ["highlight 1", "highlight 2", "highlight 3"]
}}"""

    return await call_groq(prompt)
