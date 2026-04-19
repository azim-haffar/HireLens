from app.services.gemini import call_gemini


async def check_ats(cv_data: dict, job_data: dict) -> dict:
    cv_text = cv_data.get("raw_text", "")
    skills = cv_data.get("skills", [])
    experience = cv_data.get("experience", [])
    education = cv_data.get("education", [])
    job_keywords = job_data.get("keywords", [])
    required_skills = job_data.get("required_skills", [])

    prompt = f"""You are an ATS (Applicant Tracking System) expert. Analyze this CV against the job requirements and check for common ATS rejection issues.

CV Summary:
- Skills: {skills}
- Experience entries: {len(experience)}
- Education entries: {len(education)}
- CV Text excerpt: {cv_text[:3000]}

Job Requirements:
- Required skills: {required_skills}
- Keywords: {job_keywords}
- Title: {job_data.get('title')}

Check ALL 10 of these ATS rules and return results for each:
1. Missing required keywords from job description
2. No measurable achievements (lacks numbers, percentages, metrics)
3. Missing contact information (email/phone)
4. Inconsistent date formatting
5. Use of tables, columns, or graphics (ATS unfriendly)
6. Missing job title/role alignment
7. No clear skills section
8. File format or encoding issues (infer from text quality)
9. Generic objective statement instead of targeted summary
10. Missing or weak action verbs in experience bullets

Return ONLY valid JSON:
{{
  "score": 0-100,
  "issues": [
    {{
      "rule": "rule name",
      "severity": "critical|warning|info",
      "description": "specific issue found",
      "suggestion": "how to fix it"
    }}
  ],
  "passed_checks": ["rule that passed"],
  "overall_assessment": "2-3 sentence ATS readiness summary"
}}"""

    return await call_gemini(prompt)
