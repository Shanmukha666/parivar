"""Small, provider-specific Gemini client used by FastAPI AI workflows."""

import os
from typing import Any, Iterable

import httpx


class GeminiError(RuntimeError):
    """Gemini could not produce a usable response."""


class GeminiNotConfigured(GeminiError):
    """The server has no Gemini API key."""


def is_configured(api_key: str | None = None) -> bool:
    return bool(api_key or os.getenv("GEMINI_API_KEY"))


async def generate_text(
    *,
    system_instruction: str,
    contents: Iterable[dict[str, Any]],
    api_key: str | None = None,
    max_output_tokens: int = 1024,
    temperature: float = 0.2,
) -> str:
    """Generate text with Gemini's REST API without a second AI SDK dependency."""
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise GeminiNotConfigured("GEMINI_API_KEY is not configured")

    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": list(contents),
        "generation_config": {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                endpoint,
                headers={"Content-Type": "application/json", "x-goog-api-key": key},
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise GeminiError("Gemini request failed") from exc

    if response.status_code == 429:
        raise GeminiError("Gemini rate limit reached")
    if response.is_error:
        raise GeminiError(f"Gemini request failed with status {response.status_code}")

    try:
        parts = response.json()["candidates"][0]["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise GeminiError("Gemini returned an unusable response") from exc
    if not text:
        raise GeminiError("Gemini returned an empty response")
    return text
