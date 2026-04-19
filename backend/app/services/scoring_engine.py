import logging
from app.services.gemini import call_gemini

logger = logging.getLogger(__name__)


def _get_list(data: dict, *keys) -> list:
    """Return the first non-empty list found under any of the given keys."""
    for k in keys:
        v = data.get(k)
        if isinstance(v, list) and v:
            return v
    return []


async def score_cv_against_job(cv_data: dict, job_data: dict) -> dict:
    # Normalise key variants Gemini might return
    skills = _get_list(cv_data, 'skills', 'technical_skills', 'skill_list', 'competencies')
    experience = _get_list(cv_data, 'experience', 'work_experience', 'employment_history', 'jobs')
    education = _get_list(cv_data, 'education', 'educational_background', 'qualifications')
    projects = _get_list(cv_data, 'projects', 'project_list')
    certs = _get_list(cv_data, 'certifications', 'certificates', 'courses')
    years_exp = cv_data.get('total_years_experience') or cv_data.get('years_experience') or 0

    logger.info(
        "Scoring CV keys=%s | skills=%d experience=%d education=%d",
        list(cv_data.keys()), len(skills), len(experience), len(education)
    )

    prompt = f"""You are a senior technical recruiter. Score this CV against the job requirements and provide a detailed assessment.

CV Data:
- Name: {cv_data.get('name')}
- Skills: {skills}
- Total years experience: {years_exp}
- Experience: {experience}
- Education: {education}
- Projects: {projects}
- Certifications: {certs}

Job Requirements:
- Title: {job_data.get('title')}
- Company: {job_data.get('company')}
- Required Skills: {job_data.get('required_skills', [])}
- Preferred Skills: {job_data.get('preferred_skills', [])}
- Required Experience Years: {job_data.get('required_experience_years', 0)}
- Education Requirement: {job_data.get('education_requirement')}
- Keywords: {job_data.get('keywords', [])}
- Responsibilities: {job_data.get('responsibilities', [])}

Score each dimension and compute an overall weighted score:
- Skill match: 40% weight
- Experience relevance: 30% weight
- Education fit: 15% weight
- Keyword coverage: 15% weight

Return ONLY valid JSON:
{{
  "overall_score": 0-100,
  "verdict": "strong|moderate|weak|rejected",
  "verdict_color": "green|yellow|orange|red",
  "matched_skills": ["skill1"],
  "missing_skills": ["skill2"],
  "skill_match_score": 0-100,
  "experience_score": 0-100,
  "education_score": 0-100,
  "keyword_score": 0-100,
  "reasons": [
    "Specific positive or negative reason 1",
    "Specific reason 2"
  ],
  "recommendations": [
    "Actionable improvement 1",
    "Actionable improvement 2"
  ]
}}

Verdict thresholds: strong=80+, moderate=60-79, weak=40-59, rejected=<40"""

    return await call_gemini(prompt)
