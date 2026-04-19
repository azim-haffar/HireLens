import logging
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
from app.services.gemini import call_gemini

logger = logging.getLogger(__name__)

_ALLOWED_DOMAINS = {
    "linkedin.com",
    "www.linkedin.com",
    "indeed.com",
    "www.indeed.com",
    "glassdoor.com",
    "www.glassdoor.com",
    "stepstone.de",
    "www.stepstone.de",
    "xing.com",
    "www.xing.com",
    "jobs.lever.co",
    "greenhouse.io",
    "boards.greenhouse.io",
    "myworkdayjobs.com",
}


def _validate_job_url(url: str) -> None:
    """Raise HTTP 400 if the URL is not from an allowed job-board domain (SSRF guard)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("scheme")
        hostname = parsed.hostname or ""
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL format")

    # Reject bare IPs and non-allowlisted hostnames
    if not hostname or hostname.replace(".", "").isdigit():
        raise HTTPException(
            status_code=400,
            detail="URL must point to a supported job board (LinkedIn, Indeed, Glassdoor, etc.)",
        )

    # Check exact hostname or parent domain match
    allowed = any(
        hostname == domain or hostname.endswith(f".{domain}")
        for domain in _ALLOWED_DOMAINS
    )
    if not allowed:
        logger.warning("SSRF guard blocked domain: %s", hostname)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Domain '{hostname}' is not supported. "
                "Allowed: LinkedIn, Indeed, Glassdoor, StepStone, XING, Lever, Greenhouse, Workday."
            ),
        )


_JOB_BOARD_NAMES = {
    "linkedin", "linkedin corporation", "indeed", "glassdoor",
    "stepstone", "xing", "lever", "greenhouse", "workday",
}


def _extract_meta_hints(soup: BeautifulSoup) -> dict:
    """Extract job title and hiring company hints from page metadata."""
    hints = {}

    # og:title is often "Job Title at Company | Platform"
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        content = og_title["content"]
        if " at " in content:
            after_at = content.split(" at ", 1)[1]
            company = after_at.split(" | ")[0].split(" - ")[0].strip()
            if company and company.lower() not in _JOB_BOARD_NAMES:
                hints["company"] = company
        # Title is everything before " at " or " | "
        raw_title = content.split(" at ")[0].split(" | ")[0].strip()
        if raw_title:
            hints["title"] = raw_title

    # LinkedIn h1 selectors for job title
    if not hints.get("title"):
        for sel in [
            "h1.top-card-layout__title",
            "h1.topcard__title",
            "[data-test-id='job-title']",
            ".job-details-jobs-unified-top-card__job-title h1",
            "h1",
        ]:
            el = soup.select_one(sel)
            if el:
                title = el.get_text(strip=True)
                if title and len(title) < 120:
                    hints["title"] = title
                    break

    # Final fallback: page <title> tag — strip " | LinkedIn" suffix
    if not hints.get("title"):
        page_title = soup.find("title")
        if page_title:
            t = page_title.get_text(strip=True)
            t = t.split(" | ")[0].split(" - ")[0].strip()
            if t and t.lower() not in _JOB_BOARD_NAMES:
                hints["title"] = t

    # LinkedIn-specific selectors
    for sel in ["a.topcard__org-name-link", "span.topcard__flavor--bullet",
                "[data-test-id='job-details-company-name']",
                ".job-details-jobs-unified-top-card__company-name"]:
        el = soup.select_one(sel)
        if el:
            company = el.get_text(strip=True)
            if company and company.lower() not in _JOB_BOARD_NAMES:
                hints["company"] = company
                break

    return hints


def scrape_job_url(url: str) -> tuple[str, dict]:
    """Scrape job description text and metadata hints from a validated URL."""
    _validate_job_url(url)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    logger.info("Scraping job URL: %s", url)
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error("Failed to scrape job URL %s: %s", url, e)
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not fetch the job posting URL — the site is blocking automated requests. "
                "Please copy the job description text and use 'Paste text' mode instead."
            ),
        )

    soup = BeautifulSoup(response.text, "lxml")
    meta_hints = _extract_meta_hints(soup)

    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    for selector in [
        "[class*='job-description']",
        "[class*='description']",
        "[id*='job-description']",
        "[id*='description']",
        "article",
        "main",
    ]:
        el = soup.select_one(selector)
        if el and len(el.get_text(strip=True)) > 200:
            return el.get_text(separator="\n", strip=True), meta_hints

    return soup.get_text(separator="\n", strip=True)[:6000], meta_hints


def _clean_gemini_value(val) -> str | None:
    """Coerce Gemini string 'null'/'none'/'n/a' to Python None."""
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() in ("null", "none", "n/a", "not specified", "unknown", ""):
        return None
    return s


async def parse_job(url: str | None, text: str | None) -> dict:
    if not url and not text:
        raise HTTPException(status_code=400, detail="Provide either a URL or job description text")

    meta_hints: dict = {}
    if url:
        raw_text, meta_hints = scrape_job_url(url)
    else:
        raw_text = text

    if not raw_text or len(raw_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract job description content")

    logger.info("Parsing job description (length=%d) hints=%s", len(raw_text), meta_hints)

    hint_note = ""
    if meta_hints.get("company"):
        hint_note = (
            f'\nIMPORTANT: The hiring company extracted from page metadata is "{meta_hints["company"]}". '
            f'Use this as the "company" value unless the job description clearly states a different employer. '
            f'NEVER use the name of a job board (LinkedIn, Indeed, Glassdoor, etc.) as the company.'
        )

    prompt = f"""You are a job description parser. Extract structured information from the job posting below.
Return ONLY valid JSON with no additional text, explanation, or markdown fences.
Use JSON null (not the string "null") for any field that cannot be determined.
NEVER use a job board name (LinkedIn, Indeed, Glassdoor, StepStone, etc.) as the company name.{hint_note}

Job Posting:
{raw_text[:6000]}

Return this exact JSON structure:
{{
  "title": "job title",
  "company": "hiring company name",
  "location": "location or null",
  "type": "full-time / part-time / contract / remote",
  "description": "brief job summary",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1"],
  "required_experience_years": 0,
  "education_requirement": "Bachelor's / Master's / PhD or null",
  "responsibilities": ["responsibility1"],
  "keywords": ["important keyword1", "keyword2"],
  "salary_range": "range or null",
  "benefits": ["benefit1"]
}}"""

    parsed = await call_gemini(prompt)

    # Sanitise string "null" values Gemini sometimes returns
    for field in ("title", "company", "location", "salary_range", "education_requirement"):
        parsed[field] = _clean_gemini_value(parsed.get(field))

    # Apply meta hints as fallback if Gemini still returned nothing useful
    if not parsed.get("company") and meta_hints.get("company"):
        parsed["company"] = meta_hints["company"]
    if not parsed.get("title") and meta_hints.get("title"):
        parsed["title"] = meta_hints["title"]

    # Final guard: reject job board names that slipped through
    company = parsed.get("company", "") or ""
    if company.lower() in _JOB_BOARD_NAMES:
        parsed["company"] = meta_hints.get("company") or None

    parsed["raw_text"] = raw_text[:3000]
    return parsed
