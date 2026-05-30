"""Environment-backed application settings."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent
DEFAULT_DATABASE_URL = "sqlite:///./dev.db"
DEFAULT_MODEL_SERVICE_URL = "http://127.0.0.1:4000"
DEFAULT_BACKEND_HOST = "0.0.0.0"
DEFAULT_BACKEND_PORT = 8000
DEFAULT_VOICE_OUTPUT_DIR = str(BACKEND_DIR / "runtime" / "audio")
DEFAULT_VOICE_SAMPLE_DIR = str(BACKEND_DIR / "runtime" / "samples")


class Settings(BaseModel):
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    MODEL_SERVICE_URL: str = DEFAULT_MODEL_SERVICE_URL
    BACKEND_HOST: str = DEFAULT_BACKEND_HOST
    BACKEND_PORT: int = DEFAULT_BACKEND_PORT
    OPENROUTER_API_KEY: str | None = None
    ELEVENLABS_API_KEY: str | None = None
    MINIMAX_API_KEY: str | None = None
    MINIMAX_GROUP_ID: str | None = None
    MINIMAX_VOICE_MODEL: str = "speech-2.5-hd-preview"
    VOICE_OUTPUT_DIR: str = DEFAULT_VOICE_OUTPUT_DIR
    VOICE_SAMPLE_DIR: str = DEFAULT_VOICE_SAMPLE_DIR
    PUBLIC_BASE_URL: str = f"http://127.0.0.1:{DEFAULT_BACKEND_PORT}"


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _from_environment() -> Settings:
    return Settings(
        DATABASE_URL=_clean(os.getenv("DATABASE_URL")) or DEFAULT_DATABASE_URL,
        MODEL_SERVICE_URL=_clean(os.getenv("MODEL_SERVICE_URL"))
        or DEFAULT_MODEL_SERVICE_URL,
        BACKEND_HOST=_clean(os.getenv("BACKEND_HOST")) or DEFAULT_BACKEND_HOST,
        BACKEND_PORT=int(_clean(os.getenv("BACKEND_PORT")) or DEFAULT_BACKEND_PORT),
        OPENROUTER_API_KEY=_clean(os.getenv("OPENROUTER_API_KEY")),
        ELEVENLABS_API_KEY=_clean(os.getenv("ELEVENLABS_API_KEY")),
        MINIMAX_API_KEY=_clean(os.getenv("MINIMAX_API_KEY")),
        MINIMAX_GROUP_ID=_clean(os.getenv("MINIMAX_GROUP_ID")),
        MINIMAX_VOICE_MODEL=_clean(os.getenv("MINIMAX_VOICE_MODEL"))
        or "speech-2.5-hd-preview",
        VOICE_OUTPUT_DIR=_clean(os.getenv("VOICE_OUTPUT_DIR"))
        or DEFAULT_VOICE_OUTPUT_DIR,
        VOICE_SAMPLE_DIR=_clean(os.getenv("VOICE_SAMPLE_DIR"))
        or DEFAULT_VOICE_SAMPLE_DIR,
        PUBLIC_BASE_URL=_clean(os.getenv("PUBLIC_BASE_URL"))
        or f"http://127.0.0.1:{DEFAULT_BACKEND_PORT}",
    )


@lru_cache
def get_settings() -> Settings:
    load_dotenv(REPO_ROOT / ".env", override=False)
    load_dotenv(BACKEND_DIR / ".env", override=False)
    settings = _from_environment()
    Path(settings.VOICE_OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.VOICE_SAMPLE_DIR).mkdir(parents=True, exist_ok=True)
    return settings
