import json
from datetime import datetime
from typing import Literal, Optional
from urllib import error, request

from sqlalchemy.orm import Session

from config import get_settings
from models import AiRuntimeConfig

AIProvider = Literal["mock", "openai", "gemini"]
ALLOWED_AI_PROVIDERS: set[str] = {"mock", "openai", "gemini"}


def get_or_create_ai_runtime_config(db: Session) -> AiRuntimeConfig:
    settings = get_settings()
    config = db.query(AiRuntimeConfig).first()
    if config:
        if not (config.openai_model or "").strip():
            config.openai_model = settings.OPENAI_MODEL
        if not (config.gemini_model or "").strip():
            config.gemini_model = settings.GEMINI_MODEL
        return config

    config = AiRuntimeConfig(
        provider="mock",
        ai_enabled=True,
        openai_model=settings.OPENAI_MODEL,
        gemini_model=settings.GEMINI_MODEL,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def update_ai_runtime_config(
    db: Session,
    *,
    provider: str,
    ai_enabled: bool,
    openai_model: str,
    gemini_model: str,
    updated_by_user_id: Optional[int],
) -> AiRuntimeConfig:
    config = get_or_create_ai_runtime_config(db)
    settings = get_settings()
    config.provider = provider
    config.ai_enabled = ai_enabled
    config.openai_model = (openai_model or settings.OPENAI_MODEL).strip()
    config.gemini_model = (gemini_model or settings.GEMINI_MODEL).strip()
    config.updated_by_user_id = updated_by_user_id
    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    return config


def provider_readiness() -> dict[str, bool]:
    settings = get_settings()
    return {
        "mock": True,
        "openai": bool((settings.OPENAI_API_KEY or "").strip()),
        "gemini": bool((settings.GEMINI_API_KEY or "").strip()),
    }


def call_openai_text(prompt: str, *, max_tokens: int, model: Optional[str] = None) -> str:
    settings = get_settings()
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise ValueError("OpenAI API key is not configured.")

    payload = {
        "model": (model or settings.OPENAI_MODEL).strip(),
        "temperature": 0.3,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI request failed: {detail or exc.reason}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"OpenAI network error: {exc.reason}") from exc

    content = (
        body.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    return (content or "").strip()


def call_gemini_text(prompt: str, *, max_tokens: int, model: Optional[str] = None) -> str:
    settings = get_settings()
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{(model or settings.GEMINI_MODEL).strip()}:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": max_tokens,
        },
    }
    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini request failed: {detail or exc.reason}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Gemini network error: {exc.reason}") from exc

    candidates = body.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text_parts = [part.get("text", "") for part in parts if part.get("text")]
    return "\n".join(text_parts).strip()
