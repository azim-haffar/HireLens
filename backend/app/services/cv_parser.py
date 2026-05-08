import io
import json
import pdfplumber
from app.core.groq_client import chat
from app.models.cv import ParsedCV

PARSE_PROMPT = """Extract structured information from this CV text. Return valid JSON only.

Schema:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "skills": ["string"],
  "experience": [{"title": "string", "company": "string", "duration": "string", "description": "string"}],
  "education": [{"degree": "string", "institution": "string", "year": "string"}],
  "projects": ["string"]
}

CV Text:
"""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pdfplumber."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages).strip()


def parse_cv_with_groq(raw_text: str) -> ParsedCV:
    """Use Groq to parse raw CV text into structured JSON."""
    content = chat(
        messages=[{"role": "user", "content": PARSE_PROMPT + raw_text[:6000]}],
        json_mode=True,
    )
    data = json.loads(content)
    parsed = ParsedCV(**data, raw_text=raw_text)
    return parsed
