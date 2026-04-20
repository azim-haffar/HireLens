import asyncio
import json
import logging
import re
from groq import Groq
from fastapi import HTTPException
from app.config import get_settings

logger = logging.getLogger(__name__)

_client = None


def get_groq_client():
    global _client
    if _client is None:
        settings = get_settings()
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def _extract_json(text: str) -> dict | list:
    text = text.strip()
    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()
    # Remove trailing commas
    text = re.sub(r",\s*([}\]])", r"\1", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting the first JSON object or array from the text
    for pattern in (r"\{[\s\S]*\}", r"\[[\s\S]*\]"):
        match = re.search(pattern, text)
        if match:
            candidate = re.sub(r",\s*([}\]])", r"\1", match.group())
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass
    logger.error("Groq JSON parse failed | raw snippet: %.200s", text)
    raise HTTPException(status_code=502, detail="AI service returned invalid response")


async def call_groq(prompt: str) -> dict | list:
    client = get_groq_client()
    logger.info("Groq request starting (prompt length=%d)", len(prompt))

    def _sync_call():
        return client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=8192,
        )

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(_sync_call),
            timeout=60.0,
        )
    except asyncio.TimeoutError:
        logger.error("Groq API call timed out after 60s")
        raise HTTPException(status_code=504, detail="AI service timeout — please try again")
    except Exception as e:
        logger.error("Groq API error: %s", e)
        raise HTTPException(status_code=502, detail="AI service error — please try again")

    logger.info("Groq request completed")
    return _extract_json(response.choices[0].message.content)
