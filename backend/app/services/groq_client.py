import asyncio
import json
import logging
import re
from groq import Groq
from fastapi import HTTPException
from app.config import get_settings

logger = logging.getLogger(__name__)

_client = None

# Primary tried first; fallback on 429/413 capacity errors.
# gemma2-9b-it has 15k TPM (vs 6k for the 70b/8b models) on the free tier.
_PRIMARY_MODEL  = "llama-3.3-70b-versatile"
_FALLBACK_MODEL = "llama3-8b-8192"


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
    """True for errors that warrant trying the next model."""
    msg = str(exc)
    return (
        "429" in msg
        or "413" in msg
        or "rate_limit_exceeded" in msg
        or "model_decommissioned" in msg
    )


def _make_call(model: str, messages: list, temperature: float, max_tokens: int):
    client = get_groq_client()
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def _call_with_fallback(messages: list, temperature: float, max_tokens: int) -> str:
    # Use smaller max_tokens on fallback to stay within the 15k TPM window
    fallback_max_tokens = min(max_tokens, 4096)
    configs = [
        (_PRIMARY_MODEL,  max_tokens),
        (_FALLBACK_MODEL, fallback_max_tokens),
    ]
    for model, tokens in configs:
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(_make_call, model, messages, temperature, tokens),
                timeout=60.0,
            )
            if model != _PRIMARY_MODEL:
                logger.info("Used fallback model %s (max_tokens=%d)", model, tokens)
            return response.choices[0].message.content
        except asyncio.TimeoutError:
            logger.error("Groq API timed out (model=%s)", model)
            raise HTTPException(status_code=504, detail="AI service timeout — please try again")
        except Exception as e:
            if _is_capacity_error(e):
                logger.warning("Capacity error on model %s, trying next: %s", model, e)
                continue
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
