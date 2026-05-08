import re
from app.models.cv import ParsedCV
from app.models.job import JobData
from app.models.scoring import ATSRule, ATSResult

ACTION_VERBS = {
    "led", "built", "developed", "designed", "implemented", "managed", "created",
    "improved", "increased", "reduced", "delivered", "launched", "architected",
    "optimized", "collaborated", "mentored", "spearheaded", "drove", "established",
}

QUANTIFIED_PATTERN = re.compile(r"\d+\s*(%|x|k|m|\$|users|people|members|projects|hours)", re.I)


def _keyword_match(cv: ParsedCV, job: JobData) -> ATSRule:
    all_skills = {s.lower() for s in cv.skills}
    required = {s.lower() for s in job.required_skills}
    if not required:
        return ATSRule(rule="Keyword Match", passed=True, severity="info", suggestion="No required skills specified.")
    matched = all_skills & required
    ratio = len(matched) / len(required)
    passed = ratio >= 0.6
    return ATSRule(
        rule="Keyword Match",
        passed=passed,
        severity="critical" if not passed else "info",
        suggestion="" if passed else f"Add missing skills: {', '.join(required - matched)}",
    )


def _section_presence(cv: ParsedCV, _job: JobData) -> ATSRule:
    has_all = bool(cv.experience) and bool(cv.education) and bool(cv.skills)
    return ATSRule(
        rule="Required Sections",
        passed=has_all,
        severity="critical" if not has_all else "info",
        suggestion="" if has_all else "CV is missing experience, education, or skills section.",
    )


def _skill_coverage(cv: ParsedCV, job: JobData) -> ATSRule:
    if not job.required_skills:
        return ATSRule(rule="Skill Coverage", passed=True, severity="info", suggestion="")
    cv_skills_lower = {s.lower() for s in cv.skills}
    required_lower = {s.lower() for s in job.required_skills}
    coverage = len(cv_skills_lower & required_lower) / len(required_lower)
    passed = coverage >= 0.5
    return ATSRule(
        rule="Skill Coverage",
        passed=passed,
        severity="warning" if not passed else "info",
        suggestion="" if passed else f"Skill coverage is {int(coverage*100)}%. Aim for ≥50%.",
    )


def _experience_years(cv: ParsedCV, job: JobData) -> ATSRule:
    level = (job.experience_level or "").lower()
    years = len(cv.experience)
    if "senior" in level or "lead" in level:
        passed = years >= 3
        suggestion = "Senior roles typically require 3+ positions/tenures on the CV." if not passed else ""
    elif "junior" in level or "entry" in level or "graduate" in level:
        passed = True
        suggestion = ""
    else:
        passed = years >= 1
        suggestion = "Add at least one work experience entry." if not passed else ""
    return ATSRule(rule="Experience Years", passed=passed, severity="warning" if not passed else "info", suggestion=suggestion)


def _education_match(cv: ParsedCV, job: JobData) -> ATSRule:
    req = (job.education_requirement or "").lower()
    if not req:
        return ATSRule(rule="Education Match", passed=True, severity="info", suggestion="")
    has_edu = bool(cv.education)
    passed = has_edu
    return ATSRule(
        rule="Education Match",
        passed=passed,
        severity="warning" if not passed else "info",
        suggestion="" if passed else "Add your education credentials.",
    )


def _action_verbs(cv: ParsedCV, _job: JobData) -> ATSRule:
    text = " ".join(e.description for e in cv.experience).lower()
    found = ACTION_VERBS & set(re.findall(r"\b\w+\b", text))
    passed = len(found) >= 3
    return ATSRule(
        rule="Action Verbs",
        passed=passed,
        severity="warning" if not passed else "info",
        suggestion="" if passed else "Use strong action verbs like: led, built, improved, delivered.",
    )


def _quantified_achievements(cv: ParsedCV, _job: JobData) -> ATSRule:
    text = " ".join(e.description for e in cv.experience)
    matches = QUANTIFIED_PATTERN.findall(text)
    passed = len(matches) >= 2
    return ATSRule(
        rule="Quantified Achievements",
        passed=passed,
        severity="warning" if not passed else "info",
        suggestion="" if passed else "Add numbers to achievements (e.g., 'improved performance by 30%').",
    )


def _job_title_alignment(cv: ParsedCV, job: JobData) -> ATSRule:
    job_title_words = set((job.title or "").lower().split())
    cv_titles = " ".join(e.title for e in cv.experience).lower()
    overlap = any(w in cv_titles for w in job_title_words if len(w) > 3)
    return ATSRule(
        rule="Job Title Alignment",
        passed=overlap,
        severity="info",
        suggestion="" if overlap else "Consider aligning your job titles closer to the target role.",
    )


def _formatting(cv: ParsedCV, _job: JobData) -> ATSRule:
    raw = cv.raw_text or ""
    has_structure = len(raw) > 200 and "\n" in raw
    return ATSRule(
        rule="Formatting",
        passed=has_structure,
        severity="warning" if not has_structure else "info",
        suggestion="" if has_structure else "CV appears to lack structured text. Check your PDF formatting.",
    )


def _contact_info(cv: ParsedCV, _job: JobData) -> ATSRule:
    has_contact = bool(cv.email or cv.phone)
    return ATSRule(
        rule="Contact Information",
        passed=has_contact,
        severity="critical" if not has_contact else "info",
        suggestion="" if has_contact else "Add email or phone number so recruiters can contact you.",
    )


RULES = [
    _keyword_match,
    _section_presence,
    _skill_coverage,
    _experience_years,
    _education_match,
    _action_verbs,
    _quantified_achievements,
    _job_title_alignment,
    _formatting,
    _contact_info,
]

SEVERITY_WEIGHT = {"critical": 15, "warning": 7, "info": 3}


def run_ats_check(cv: ParsedCV, job: JobData) -> ATSResult:
    """Run all 10 ATS rules and compute a 0-100 score."""
    results = [rule(cv, job) for rule in RULES]

    deductions = sum(SEVERITY_WEIGHT[r.severity] for r in results if not r.passed)
    score = max(0, 100 - deductions)

    passed_count = sum(1 for r in results if r.passed)
    summary = f"{passed_count}/{len(results)} checks passed. ATS Score: {score}/100."
    return ATSResult(score=score, rules=results, summary=summary)
