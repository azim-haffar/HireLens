import asyncio
import json
import logging
import re
from groq import Groq
from fastapi import HTTPException
from app.config import get_settings

logger = logging.getLogger(__name__)

_client = None

# Tried in order on capacity/rate-limit errors.
# llama-3.1-8b-instant has a separate 500k TPD bucket vs 100k for the 70b.
_MODELS = [
    ("llama-3.3-70b-versatile", 8192),   # best quality
    ("llama3-8b-8192",          4096),   # higher TPM
    ("llama-3.1-8b-instant",    2048),   # 500k TPD separate bucket
]


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


def _is_capacity_error(exc: Exception) -> bool:
    msg = str(exc)
    return (
        "429" in msg
        or "413" in msg
        or "rate_limit_exceeded" in msg
        or "model_decommissioned" in msg
    )


def _truncate_messages(messages: list, max_chars: int = 12000) -> list:
    """Trim the user prompt to avoid 413 errors on smaller models."""
    result = []
    for m in messages:
        if m["role"] == "user" and len(m["content"]) > max_chars:
            result.append({**m, "content": m["content"][:max_chars] + "\n\n[truncated for length]"})
        else:
            result.append(m)
    return result


def _make_call(model: str, messages: list, temperature: float, max_tokens: int):
    client = get_groq_client()
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def _call_with_fallback(messages: list, temperature: float, max_tokens: int) -> str:
    for i, (model, model_max_tokens) in enumerate(_MODELS):
        tokens = min(max_tokens, model_max_tokens)
        # Truncate prompt on fallback models to stay within their TPM limits
        msgs = _truncate_messages(messages) if i > 0 else messages
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(_make_call, model, msgs, temperature, tokens),
                timeout=60.0,
            )
            if i > 0:
                logger.info("Used fallback model %s (attempt %d)", model, i + 1)
            return response.choices[0].message.content
        except asyncio.TimeoutError:
            logger.error("Groq API timed out (model=%s)", model)
            raise HTTPException(status_code=504, detail="AI service timeout — please try again")
        except Exception as e:
            if _is_capacity_error(e):
                logger.warning("Capacity error on model %s: %s", model, e)
                continue
            logger.error("Groq API error (model=%s): %s", model, e)
            raise HTTPException(status_code=502, detail="AI service error — please try again")
    raise HTTPException(
        status_code=429,
        detail="Daily AI limit reached — please try again in a few hours",
    )


async def call_groq(prompt: str) -> dict | list:
    logger.info("Groq request starting (prompt length=%d)", len(prompt))
    content = await _call_with_fallback(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=8192,
    )
    logger.info("Groq request completed")
    return _extract_json(content)
