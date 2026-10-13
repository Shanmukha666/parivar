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


def _build_payload(system_instruction: str, contents: list[dict[str, Any]], model: str, temperature: float, max_output_tokens: int) -> dict[str, Any]:
    is_gemini3 = "3." in model or "gemini-3" in model
    generation_config: dict[str, Any] = {
        "temperature": temperature,
        "max_output_tokens": max(max_output_tokens, 1024),
    }
    if is_gemini3:
        generation_config["thinking_config"] = {"thinking_level": "low"}
    return {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generation_config": generation_config,
    }


async def generate_text(
    *,
    system_instruction: str,
    contents: Iterable[dict[str, Any]],
    api_key: str | None = None,
    max_output_tokens: int = 1024,
    temperature: float = 0.2,
) -> str:
    """Generate text with Gemini's REST API with automatic model fallback."""
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise GeminiNotConfigured("GEMINI_API_KEY is not configured")

    primary_model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    fallback_model = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash")
    contents_list = list(contents)

    active_model = primary_model
    payload = _build_payload(system_instruction, contents_list, active_model, temperature, max_output_tokens)
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent"

    response = None
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                endpoint,
                headers={"Content-Type": "application/json", "x-goog-api-key": key},
                json=payload,
            )
    except httpx.HTTPError:
        response = None

    # If primary failed with 400, 404, 429, 500, 503 or network error, try fallback
    if (response is None or response.is_error) and fallback_model and fallback_model != active_model:
        active_model = fallback_model
        payload = _build_payload(system_instruction, contents_list, active_model, temperature, max_output_tokens)
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                response = await client.post(
                    endpoint,
                    headers={"Content-Type": "application/json", "x-goog-api-key": key},
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise GeminiError("Gemini fallback request failed") from exc

    if response is None:
        raise GeminiError("Gemini request failed: network error")
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

