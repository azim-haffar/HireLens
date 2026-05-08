import json
import requests
from bs4 import BeautifulSoup
from app.core.groq_client import chat
from app.models.job import JobData

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0 Safari/537.36"
    )
}

EXTRACT_PROMPT = """Extract structured job information from the text below. Return valid JSON only.

Schema:
{
  "title": "string",
  "company": "string",
  "required_skills": ["string"],
  "nice_to_have": ["string"],
  "experience_level": "string",
  "education_requirement": "string"
}

Job Text:
"""


def scrape_job_url(url: str) -> str:
    """Fetch a job posting page and extract visible text."""
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove noise elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    # Prefer common job description containers
    for selector in [
        "[class*='description']",
        "[class*='job-detail']",
        "[class*='posting']",
        "article",
        "main",
    ]:
        container = soup.select_one(selector)
        if container:
            return container.get_text(separator="\n", strip=True)[:6000]

    return soup.get_text(separator="\n", strip=True)[:6000]


def extract_job_with_groq(text: str) -> JobData:
    """Use Groq to parse job text into structured JSON."""
    content = chat(
        messages=[{"role": "user", "content": EXTRACT_PROMPT + text}],
        json_mode=True,
    )
    data = json.loads(content)
    return JobData(**data, raw_text=text)
