"""Minimax-backed voice provider."""

from __future__ import annotations

import base64
from pathlib import Path

import httpx

from app.core.config import get_settings
from app.providers.voice.base import VoiceCloneResult, VoiceProvider, VoiceSynthesisResult


class MinimaxVoiceProvider(VoiceProvider):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.MINIMAX_API_KEY:
            raise ValueError("MINIMAX_API_KEY is required")
        self._api_key = settings.MINIMAX_API_KEY
        self._group_id = settings.MINIMAX_GROUP_ID
        self._model = settings.MINIMAX_VOICE_MODEL
        self._base_url = "https://api.minimaxi.chat/v1"

    def _headers(self) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self._api_key}"}
        if self._group_id:
            headers["GroupId"] = self._group_id
        return headers

    def synthesize(self, text: str, voice_id: str | None = None) -> VoiceSynthesisResult:
        payload = {
            "model": self._model,
            "text": text,
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3",
            },
            "voice_setting": {
                "voice_id": voice_id or "female-shaonv",
                "speed": 1.0,
                "vol": 1.0,
                "pitch": 0,
            },
        }
        response = httpx.post(
            f"{self._base_url}/t2a_v2",
            json=payload,
            headers=self._headers(),
            timeout=40.0,
        )
        response.raise_for_status()
        data = response.json()
        audio_base64 = (
            data.get("data", {}).get("audio")
            or data.get("audio")
            or data.get("result", {}).get("audio")
        )
        audio_bytes = base64.b64decode(audio_base64) if audio_base64 else None
        return VoiceSynthesisResult(text=text, audio_bytes=audio_bytes)

    def clone_voice(self, sample_path: Path, display_name: str) -> VoiceCloneResult:
        with sample_path.open("rb") as handle:
            upload = httpx.post(
                f"{self._base_url}/files/upload",
                files={"file": (sample_path.name, handle, "audio/mpeg")},
                headers=self._headers(),
                timeout=60.0,
            )
        upload.raise_for_status()
        file_id = (
            upload.json().get("data", {}).get("file_id")
            or upload.json().get("file_id")
            or upload.json().get("id")
        )
        response = httpx.post(
            f"{self._base_url}/voice_clone",
            json={
                "prompt_audio": file_id,
                "voice_name": display_name,
            },
            headers=self._headers(),
            timeout=60.0,
        )
        response.raise_for_status()
        data = response.json()
        provider_voice_id = (
            data.get("data", {}).get("voice_id")
            or data.get("voice_id")
            or data.get("id")
        )
        return VoiceCloneResult(
            provider_voice_id=provider_voice_id,
            display_name=display_name,
        )
