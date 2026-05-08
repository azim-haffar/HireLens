import json
from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.groq_client import chat
from app.models.scoring import RoastResult
from app.services.cv_parser import extract_text_from_pdf, parse_cv_with_groq

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

ROAST_PROMPT = """You are a senior engineer who has reviewed over a thousand CVs. You are exhausted, \
unimpressed, and have zero patience for mediocrity. Your job is to roast this CV with surgical \
precision — not to motivate, not to encourage, not to soften the blow. Be sarcastic, direct, and \
specific. Every sentence should sting because it is true.

Rules:
- No "however", no "but", no "consider", no "you might want to", no silver linings
- No generic advice. Point to the exact problem on this exact CV
- The tagline must be 1-5 words, savage, and memorable — e.g. "Forgettable.", \
"A list of technologies, not a person.", "Tries too hard.", "Almost impressive.", \
"Technically present, professionally absent."
- Each category feedback must open with a cutting one-liner, then explain what is wrong specifically
- The brutal_feedback verdict must be 2-4 sentences that would make the candidate wince but \
immediately understand exactly what is broken and why it matters
- The one "positive" must be real — not a consolation prize, not vague. If there is nothing \
genuinely good, say "It's a PDF. That's the best I can say."
- Score honestly: most CVs deserve 35-65. A 90+ is extremely rare.

CV Text:
{cv_text}

Return JSON only:
{{
  "overall_score": <0-100 integer>,
  "tagline": "<1-5 word savage summary>",
  "breakdown": [
    {{"category": "Formatting", "score": <0-100>, "feedback": "<cutting one-liner>. <specific critique>"}},
    {{"category": "Skills Presentation", "score": <0-100>, "feedback": "<cutting one-liner>. <specific critique>"}},
    {{"category": "Experience Descriptions", "score": <0-100>, "feedback": "<cutting one-liner>. <specific critique>"}},
    {{"category": "Achievements", "score": <0-100>, "feedback": "<cutting one-liner>. <specific critique>"}},
    {{"category": "Overall Impact", "score": <0-100>, "feedback": "<cutting one-liner>. <specific critique>"}}
  ],
  "positive": "<one specific, genuine strength — no padding>",
  "brutal_feedback": "<2-4 sentences: precise, specific, painful, actionable>"
}}"""


@router.post("/cv", response_model=RoastResult)
@limiter.limit("3/hour")
async def roast_cv(request: Request, file: UploadFile = File(...)):
    """Public endpoint: roast a CV. Rate limited to 3/hour per IP. No auth required."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 3MB.")

    raw_text = extract_text_from_pdf(pdf_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    content = chat(
        messages=[{"role": "user", "content": ROAST_PROMPT.format(cv_text=raw_text[:4000])}],
        json_mode=True,
        temperature=0.7,
    )
    data = json.loads(content)
    return RoastResult(**data)
