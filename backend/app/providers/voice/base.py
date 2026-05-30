"""Voice provider abstractions."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass
class VoiceSynthesisResult:
    text: str
    audio_bytes: bytes | None = None
    mime_type: str = "audio/mpeg"


@dataclass
class VoiceCloneResult:
    provider_voice_id: str
    display_name: str


class VoiceProvider(Protocol):
    def synthesize(self, text: str, voice_id: str | None = None) -> VoiceSynthesisResult: ...

    def clone_voice(self, sample_path: Path, display_name: str) -> VoiceCloneResult: ...
