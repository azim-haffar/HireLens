import io
import logging
import pdfplumber
from fastapi import UploadFile, HTTPException
from app.services.gemini import call_gemini

logger = logging.getLogger(__name__)

_PDF_MAGIC = b"%PDF"


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


async def parse_cv(file: UploadFile) -> dict:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    if not content[:4] == _PDF_MAGIC:
        logger.warning("Rejected file '%s': invalid PDF magic bytes", file.filename)
        raise HTTPException(status_code=400, detail="Invalid PDF file — magic bytes check failed")

    logger.info("Parsing CV '%s' (%d bytes)", file.filename, len(content))

    raw_text = extract_text_from_pdf(content)
    if not raw_text:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    prompt = f"""You are a CV parser. Extract structured information from the CV text below.
Return ONLY valid JSON with no additional text, explanation, or markdown fences.

CV Text:
{raw_text[:8000]}

Return this exact JSON structure:
{{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone or null",
  "location": "city/country or null",
  "summary": "professional summary or null",
  "skills": ["skill1", "skill2"],
  "experience": [
    {{
      "title": "job title",
      "company": "company name",
      "duration": "dates",
      "years": 0.0,
      "description": "responsibilities",
      "achievements": ["measurable achievement 1"]
    }}
  ],
  "education": [
    {{
      "degree": "degree name",
      "institution": "school name",
      "year": "graduation year",
      "field": "field of study"
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "what it does",
      "technologies": ["tech1"]
    }}
  ],
  "certifications": ["cert1"],
  "languages": ["English"],
  "total_years_experience": 0.0,
  "raw_text": ""
}}"""

    parsed = await call_gemini(prompt)
    parsed["raw_text"] = raw_text[:5000]
    return parsed
