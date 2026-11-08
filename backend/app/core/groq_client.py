from groq import Groq
from fastapi import HTTPException
from app.core.config import settings

client = Groq(api_key=settings.groq_api_key)

# Fallback chain in order of capability
MODELS = [
    "llama-3.3-70b-versatile",
    "llama3-8b-8192",
    "llama-3.1-8b-instant",
]


def chat(messages: list[dict], json_mode: bool = False, temperature: float = 0.2) -> str:
    """Call Groq with automatic model fallback."""
    kwargs = {
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 4096,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last_exc = None
    for model in MODELS:
        try:
            response = client.chat.completions.create(model=model, **kwargs)
            return response.choices[0].message.content
        except Exception as exc:
            last_exc = exc
            continue

    raise HTTPException(status_code=503, detail="The analysis service is unavailable. Please try again.") from None


def stream(messages: list[dict], temperature: float = 0.3):
    """Yield text chunks from Groq with fallback."""
    last_exc = None
    for model in MODELS:
        emitted = False
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=2048,
                stream=True,
            )
            for chunk in response:
                if chunk.choices[0].delta.content:
                    emitted = True
                    yield chunk.choices[0].delta.content
            return
        except Exception as exc:
            if emitted:
                raise RuntimeError("The analysis stream was interrupted.") from None
            last_exc = exc
            continue

    raise RuntimeError("The analysis service is unavailable.") from None
