import asyncio
import json
import logging
import re
from groq import Groq, RateLimitError
from fastapi import HTTPException
from app.config import get_settings

logger = logging.getLogger(__name__)

_client = None

# Primary model tried first; fallback used on 429 rate-limit errors.
_PRIMARY_MODEL  = "llama-3.3-70b-versatile"
_FALLBACK_MODEL = "llama-3.1-8b-instant"


def get_groq_client():
    global _client
    if _client is None:
        settings = get_settings()
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def _extract_json(text: str) -> dict | list:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()
    text = re.sub(r",\s*([}\]])", r"\1", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
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


def _make_call(model: str, messages: list, temperature: float, max_tokens: int):
    client = get_groq_client()
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def _call_with_fallback(messages: list, temperature: float, max_tokens: int) -> str:
    for model in (_PRIMARY_MODEL, _FALLBACK_MODEL):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(_make_call, model, messages, temperature, max_tokens),
                timeout=60.0,
            )
            if model != _PRIMARY_MODEL:
                logger.info("Used fallback model %s", model)
            return response.choices[0].message.content
        except RateLimitError:
            logger.warning("Rate limit on model %s, trying next", model)
            continue
        except asyncio.TimeoutError:
            logger.error("Groq API timed out (model=%s)", model)
            raise HTTPException(status_code=504, detail="AI service timeout — please try again")
        except Exception as e:
            logger.error("Groq API error (model=%s): %s", model, e)
            raise HTTPException(status_code=502, detail="AI service error — please try again")
    raise HTTPException(status_code=429, detail="AI service is busy — please try again in a few minutes")


async def call_groq(prompt: str) -> dict | list:
    logger.info("Groq request starting (prompt length=%d)", len(prompt))
    content = await _call_with_fallback(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=8192,
    )
    logger.info("Groq request completed")
    return _extract_json(content)


def get_stream_model() -> str:
    """Return the model name to use for streaming chat (honours fallback at call time)."""
    return _PRIMARY_MODEL
