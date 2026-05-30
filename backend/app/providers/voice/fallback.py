"""Fallback voice provider when external TTS is unavailable."""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from app.providers.voice.base import VoiceCloneResult, VoiceProvider, VoiceSynthesisResult


class FallbackVoiceProvider(VoiceProvider):
    def synthesize(self, text: str, voice_id: str | None = None) -> VoiceSynthesisResult:
        return VoiceSynthesisResult(text=text, audio_bytes=None)

    def clone_voice(self, sample_path: Path, display_name: str) -> VoiceCloneResult:
        return VoiceCloneResult(
            provider_voice_id=f"local-{uuid4().hex[:12]}",
            display_name=display_name,
        )
