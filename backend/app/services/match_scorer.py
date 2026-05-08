from app.models.cv import ParsedCV
from app.models.job import JobData
from app.models.scoring import MatchBreakdown, MatchResult


def _skill_fit(cv: ParsedCV, job: JobData) -> tuple[float, list[str], list[str]]:
    cv_skills = {s.lower() for s in cv.skills}
    required = {s.lower() for s in job.required_skills}
    nice = {s.lower() for s in job.nice_to_have}
    all_job_skills = required | nice

    if not all_job_skills:
        return 1.0, [], []

    matched = cv_skills & all_job_skills
    missing = required - cv_skills

    score = len(matched) / len(all_job_skills)
    # Bonus weight for matching required vs nice-to-have
    if required:
        req_matched = cv_skills & required
        score = (len(req_matched) / len(required)) * 0.7 + (len(matched) / len(all_job_skills)) * 0.3

    return min(score, 1.0), list(matched), list(missing)


def _experience_score(cv: ParsedCV, job: JobData) -> float:
    level = (job.experience_level or "").lower()
    count = len(cv.experience)
    if "senior" in level or "lead" in level or "principal" in level:
        return min(count / 4, 1.0)
    elif "junior" in level or "entry" in level or "graduate" in level:
        return 1.0 if count >= 1 else 0.5
    elif "mid" in level or "intermediate" in level:
        return min(count / 2, 1.0)
    return min(count / 2, 1.0)


def _education_score(cv: ParsedCV, job: JobData) -> float:
    req = (job.education_requirement or "").lower()
    if not req:
        return 1.0
    if not cv.education:
        return 0.0
    degree_text = " ".join(e.degree.lower() for e in cv.education)
    if "phd" in req or "doctorate" in req:
        return 1.0 if "phd" in degree_text or "doctor" in degree_text else 0.5
    if "master" in req:
        return 1.0 if "master" in degree_text or "msc" in degree_text else 0.6
    if "bachelor" in req or "degree" in req:
        return 1.0 if any(w in degree_text for w in ["bachelor", "bsc", "ba", "bs"]) else 0.7
    return 1.0


def _keyword_coverage(cv: ParsedCV, job: JobData) -> float:
    job_keywords = set(job.required_skills + job.nice_to_have)
    if not job_keywords:
        return 1.0
    raw = (cv.raw_text or "").lower()
    hits = sum(1 for kw in job_keywords if kw.lower() in raw)
    return hits / len(job_keywords)


def compute_match_score(cv: ParsedCV, job: JobData) -> MatchResult:
    """Compute weighted match score: skills 35%, experience 25%, education 15%, keywords 25%."""
    skill_score, matched_skills, missing_skills = _skill_fit(cv, job)
    exp_score = _experience_score(cv, job)
    edu_score = _education_score(cv, job)
    kw_score = _keyword_coverage(cv, job)

    weighted = (
        skill_score * 0.35
        + exp_score * 0.25
        + edu_score * 0.15
        + kw_score * 0.25
    )
    final_score = round(weighted * 100)

    return MatchResult(
        score=final_score,
        breakdown=MatchBreakdown(
            skill_fit=round(skill_score * 100, 1),
            experience=round(exp_score * 100, 1),
            education=round(edu_score * 100, 1),
            keyword_coverage=round(kw_score * 100, 1),
        ),
        matched_skills=matched_skills,
        missing_skills=missing_skills,
    )
