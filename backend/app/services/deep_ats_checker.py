import io
import json
import re
import pdfplumber
from app.core.groq_client import chat
from app.models.scoring import DeepATSRule, DeepATSResult

# ── Severity weights ─────────────────────────────────────────────────────────
WEIGHT = {"critical": 3, "warning": 2, "info": 1}

# ── Patterns ─────────────────────────────────────────────────────────────────
PRONOUN_RE = re.compile(r"\b(I|me|my|myself|we|our|us)\b", re.I)
QUANT_RE   = re.compile(r"\d+\s*(%|x|×|k|m|\$|users|customers|people|members|projects|hours|days|ms)", re.I)
SECTION_RE = re.compile(r"\b(experience|work history|employment|education|skills|summary|objective|projects|certifications)\b", re.I)
EMAIL_RE   = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE   = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")
DATE_RE    = re.compile(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,.]+\d{4}|\d{4}\s*[-–—]\s*(\d{4}|present|current)\b", re.I)
BULLET_RE  = re.compile(r"^[\s]*[•\-\*•‣◦⁃∙]\s+(.+)$", re.MULTILINE)

MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


# ── Python-deterministic rules ───────────────────────────────────────────────

def _rule_parsability(text: str, pdf_bytes: bytes) -> DeepATSRule:
    passed = len(text.strip()) > 100
    return DeepATSRule(
        id="parsability",
        category="Format",
        name="PDF Parsability",
        status="pass" if passed else "fail",
        severity="critical",
        score=100 if passed else 0,
        message="CV text is extractable by ATS parsers." if passed else "CV text could not be extracted — likely image-based or scanned.",
        fix="" if passed else "Export your CV as a text-based PDF, not a scanned image.",
        example="Use Word, Google Docs, or LaTeX to generate native PDF output.",
    )


def _rule_no_tables(pdf_bytes: bytes) -> DeepATSRule:
    table_count = 0
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.find_tables()
            table_count += len(tables)
    passed = table_count == 0
    return DeepATSRule(
        id="no_tables",
        category="Format",
        name="No Tables",
        status="pass" if passed else "warning",
        severity="warning",
        score=100 if passed else 40,
        message=f"No tables detected." if passed else f"Found {table_count} table(s) — many ATS systems misread table-based layouts.",
        fix="Replace tables with plain text sections and bullet points.",
        example="Skills: Python, React, SQL  (plain comma list, not a two-column table)",
    )


def _rule_file_size(pdf_bytes: bytes) -> DeepATSRule:
    size = len(pdf_bytes)
    passed = size <= MAX_FILE_BYTES
    kb = size // 1024
    return DeepATSRule(
        id="file_size",
        category="Format",
        name="File Size",
        status="pass" if passed else "warning",
        severity="warning",
        score=100 if passed else 50,
        message=f"File size is {kb} KB — within the recommended 5 MB limit." if passed else f"File size is {kb} KB — exceeds the 5 MB limit that some portals enforce.",
        fix="Compress or remove embedded images to reduce file size.",
        example="Remove high-resolution headshots or background images.",
    )


def _rule_required_sections(text: str) -> DeepATSRule:
    found = len(set(SECTION_RE.findall(text.lower())))
    passed = found >= 3
    return DeepATSRule(
        id="required_sections",
        category="Content",
        name="Required Sections",
        status="pass" if passed else "fail",
        severity="critical",
        score=100 if passed else 0,
        message=f"CV contains {found} standard section headings." if passed else f"Only {found} standard section(s) found — ATS expects Experience, Education, Skills at minimum.",
        fix="Add clearly labeled sections: Experience, Education, Skills, Summary.",
        example="## WORK EXPERIENCE\n## EDUCATION\n## SKILLS",
    )


def _rule_contact_info(text: str) -> DeepATSRule:
    has_email = bool(EMAIL_RE.search(text))
    has_phone = bool(PHONE_RE.search(text))
    passed = has_email and has_phone
    missing = []
    if not has_email: missing.append("email")
    if not has_phone: missing.append("phone")
    return DeepATSRule(
        id="contact_info",
        category="Content",
        name="Contact Information",
        status="pass" if passed else "fail",
        severity="critical",
        score=100 if passed else (50 if (has_email or has_phone) else 0),
        message="Email and phone number detected." if passed else f"Missing: {', '.join(missing)}.",
        fix="Include email and phone number at the top of your CV.",
        example="jane.doe@email.com  |  +1 (555) 000-0000",
    )


def _rule_quantified_achievements(text: str) -> DeepATSRule:
    matches = QUANT_RE.findall(text)
    count = len(matches)
    passed = count >= 3
    return DeepATSRule(
        id="quantified_achievements",
        category="Content",
        name="Quantified Achievements",
        status="pass" if passed else ("warning" if count >= 1 else "fail"),
        severity="warning",
        score=100 if passed else (60 if count >= 1 else 20),
        message=f"Found {count} quantified achievements." if passed else f"Only {count} quantified achievement(s) — recruiters want to see numbers.",
        fix="Add metrics to at least 3 bullet points (%, $, time saved, team size).",
        example="Reduced API latency by 40%, saving $12k/month in infrastructure costs.",
    )


def _rule_no_pronouns(text: str) -> DeepATSRule:
    hits = PRONOUN_RE.findall(text)
    count = len(hits)
    passed = count == 0
    return DeepATSRule(
        id="no_pronouns",
        category="Style",
        name="No First-Person Pronouns",
        status="pass" if passed else "warning",
        severity="warning",
        score=100 if passed else max(0, 100 - count * 10),
        message="No first-person pronouns detected." if passed else f"Found {count} first-person pronoun(s) — CVs should be written in third-person implied.",
        fix="Remove 'I', 'my', 'we', etc. Start bullets with action verbs.",
        example="'I led a team of 5' → 'Led a cross-functional team of 5 engineers'",
    )


def _rule_bullet_length(text: str) -> DeepATSRule:
    bullets = BULLET_RE.findall(text)
    if not bullets:
        return DeepATSRule(
            id="bullet_length", category="Style", name="Bullet Point Length",
            status="warning", severity="info", score=60,
            message="No bullet points detected — structured bullets improve ATS readability.",
            fix="Use bullet points for experience descriptions.",
            example="• Architected microservices platform handling 2M requests/day",
        )
    long_bullets  = [b for b in bullets if len(b.split()) > 30]
    short_bullets = [b for b in bullets if len(b.split()) < 5]
    bad = len(long_bullets) + len(short_bullets)
    passed = bad == 0
    return DeepATSRule(
        id="bullet_length",
        category="Style",
        name="Bullet Point Length",
        status="pass" if passed else "warning",
        severity="info",
        score=100 if passed else max(40, 100 - bad * 12),
        message=f"{len(bullets)} bullets checked — all within ideal length." if passed else f"{bad} bullet(s) are too long (>30 words) or too short (<5 words).",
        fix="Keep bullets between 10–25 words. One achievement, one bullet.",
        example="• Reduced checkout load time by 60% by migrating to edge caching",
    )


def _rule_no_keyword_stuffing(text: str) -> DeepATSRule:
    words = re.findall(r"\b\w{4,}\b", text.lower())
    if not words:
        return DeepATSRule(
            id="no_keyword_stuffing", category="Content", name="No Keyword Stuffing",
            status="pass", severity="warning", score=100,
            message="No keyword stuffing detected.",
            fix="", example="",
        )
    from collections import Counter
    freq = Counter(words)
    stuffed = [(w, c) for w, c in freq.items() if c > 12 and w not in {
        "and", "the", "for", "with", "that", "this", "from", "have", "been",
        "will", "were", "their", "team", "work", "using", "skills", "experience",
    }]
    passed = len(stuffed) == 0
    return DeepATSRule(
        id="no_keyword_stuffing",
        category="Content",
        name="No Keyword Stuffing",
        status="pass" if passed else "warning",
        severity="warning",
        score=100 if passed else 55,
        message="No suspicious keyword repetition detected." if passed else f"Possible keyword stuffing: {', '.join(w for w, _ in stuffed[:3])}.",
        fix="Use keywords naturally. Don't repeat the same term more than 8–10 times.",
        example="Instead of listing 'Python' 15 times, demonstrate it in context.",
    )


def _rule_date_formatting(text: str) -> DeepATSRule:
    dates = DATE_RE.findall(text)
    found = len(dates)
    passed = found >= 2
    return DeepATSRule(
        id="date_formatting",
        category="Content",
        name="Date Formatting",
        status="pass" if passed else "warning",
        severity="info",
        score=100 if passed else 50,
        message=f"Found {found} date range(s) — good temporal context for ATS." if passed else "No clear date ranges detected. ATS systems need dates to parse job tenure.",
        fix="Add start–end dates to every job: 'Jan 2021 – Mar 2023' or '2021–2023'.",
        example="Software Engineer, Acme Corp  |  Jan 2021 – Present",
    )


# ── AI-assisted rules (single Groq batch call) ────────────────────────────────

AI_RULES_PROMPT = """\
You are an expert ATS (Applicant Tracking System) auditor. Analyze the CV text below and evaluate the following 10 rules. Return a JSON object with exactly these keys. For each rule return an object with fields: status ("pass"|"warning"|"fail"), score (0-100), message (1 sentence, specific to THIS cv), fix (1 sentence actionable advice), example (short concrete example string).

Rules to evaluate:
1. single_column         – Is the layout single-column? Multi-column confuses many ATS.
2. section_header_clarity – Are section headers clearly labeled (e.g. EXPERIENCE, EDUCATION)?
3. action_verbs          – Does experience use strong action verbs (led, built, designed…)?
4. keyword_density       – Are relevant industry/technical keywords present throughout?
5. skills_section_structured – Is there a dedicated skills section (not buried in body)?
6. tech_soft_separated   – Are technical and soft skills clearly separated?
7. abbreviations_spelled – Are abbreviations spelled out at first use (e.g. "NLP (Natural Language Processing)")?
8. no_graphics_in_skills – Are the skills free of star ratings, bar charts, or visual meters?
9. consistency           – Are formatting, tense, and date formats consistent throughout?
10. summary_present      – Is there a professional summary/objective at the top?

Return exactly this JSON shape (no extra keys):
{
  "single_column":          {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "section_header_clarity": {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "action_verbs":           {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "keyword_density":        {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "skills_section_structured": {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "tech_soft_separated":    {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "abbreviations_spelled":  {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "no_graphics_in_skills":  {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "consistency":            {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."},
  "summary_present":        {"status": "...", "score": 0, "message": "...", "fix": "...", "example": "..."}
}

CV TEXT (first 5000 chars):
"""

AI_RULE_META = {
    "single_column":          ("Format",  "Single Column Layout",         "critical"),
    "section_header_clarity": ("Format",  "Section Header Clarity",       "warning"),
    "action_verbs":           ("Content", "Strong Action Verbs",          "warning"),
    "keyword_density":        ("Content", "Keyword Density",              "warning"),
    "skills_section_structured": ("Content", "Dedicated Skills Section",  "warning"),
    "tech_soft_separated":    ("Content", "Tech vs Soft Skills Separation","info"),
    "abbreviations_spelled":  ("Style",   "Abbreviations Spelled Out",    "info"),
    "no_graphics_in_skills":  ("Format",  "No Graphical Skill Meters",    "warning"),
    "consistency":            ("Style",   "Formatting Consistency",       "warning"),
    "summary_present":        ("Content", "Professional Summary Present", "info"),
}


def _run_ai_rules(text: str) -> list[DeepATSRule]:
    try:
        raw = chat(
            messages=[{"role": "user", "content": AI_RULES_PROMPT + text[:5000]}],
            json_mode=True,
            temperature=0.1,
        )
        data = json.loads(raw)
    except Exception:
        return _ai_rules_fallback()

    results = []
    for rule_id, (category, name, severity) in AI_RULE_META.items():
        rd = data.get(rule_id, {})
        status = rd.get("status", "warning")
        if status not in ("pass", "warning", "fail"):
            status = "warning"
        results.append(DeepATSRule(
            id=rule_id,
            category=category,
            name=name,
            status=status,
            severity=severity,
            score=int(rd.get("score", 50)),
            message=rd.get("message", "Unable to evaluate this rule."),
            fix=rd.get("fix", "Review this section manually."),
            example=rd.get("example", ""),
        ))
    return results


def _ai_rules_fallback() -> list[DeepATSRule]:
    return [
        DeepATSRule(
            id=rule_id, category=category, name=name, status="warning",
            severity=severity, score=50,
            message="AI evaluation unavailable — please review manually.",
            fix="Check this criterion manually against ATS best practices.",
            example="",
        )
        for rule_id, (category, name, severity) in AI_RULE_META.items()
    ]


# ── Scoring ───────────────────────────────────────────────────────────────────

def _compute_score(rules: list[DeepATSRule]) -> int:
    total_weight = 0
    weighted_sum = 0.0
    for r in rules:
        w = WEIGHT[r.severity]
        total_weight += w
        weighted_sum += r.score * w
    if total_weight == 0:
        return 0
    return round(weighted_sum / total_weight)


def _grade(score: int) -> str:
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    if score >= 40: return "D"
    return "F"


# ── Public entry point ────────────────────────────────────────────────────────

def run_deep_ats_check(pdf_bytes: bytes) -> DeepATSResult:
    text = _extract_text(pdf_bytes)

    python_rules: list[DeepATSRule] = [
        _rule_parsability(text, pdf_bytes),
        _rule_no_tables(pdf_bytes),
        _rule_file_size(pdf_bytes),
        _rule_required_sections(text),
        _rule_contact_info(text),
        _rule_quantified_achievements(text),
        _rule_no_pronouns(text),
        _rule_bullet_length(text),
        _rule_no_keyword_stuffing(text),
        _rule_date_formatting(text),
    ]

    ai_rules = _run_ai_rules(text)
    all_rules = python_rules + ai_rules

    score = _compute_score(all_rules)
    grade = _grade(score)

    passed  = sum(1 for r in all_rules if r.status == "pass")
    failed  = sum(1 for r in all_rules if r.status == "fail")
    warned  = sum(1 for r in all_rules if r.status == "warning")
    summary = f"{passed}/{len(all_rules)} checks passed. {failed} critical issue(s), {warned} warning(s). ATS score: {score}/100 (Grade {grade})."

    failing = [r for r in all_rules if r.status in ("fail", "warning")]
    top_fixes = sorted(failing, key=lambda r: WEIGHT[r.severity], reverse=True)[:5]

    return DeepATSResult(
        overall_score=score,
        grade=grade,
        summary=summary,
        rules=all_rules,
        top_fixes=top_fixes,
    )


def _extract_text(pdf_bytes: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n".join(pages).strip()
    except Exception:
        return ""
