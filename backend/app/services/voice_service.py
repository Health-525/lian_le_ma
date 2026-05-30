"""Voice service for options, synthesis, and cloning."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

from app.core.config import get_settings
from app.models.enums import VoiceProviderType
from app.models.schemas import VoiceProfile
from app.providers.voice.base import VoiceSynthesisResult
from app.providers.voice.fallback import FallbackVoiceProvider
from app.providers.voice.minimax import MinimaxVoiceProvider
from app.repositories.voice_profile_repository import VoiceProfileRepository


DEFAULT_VOICES = [
    VoiceProfile(
        voice_id="system-default",
        provider=VoiceProviderType.SYSTEM,
        display_name="System Voice",
    ),
    VoiceProfile(
        voice_id="system-energetic",
        provider=VoiceProviderType.SYSTEM,
        display_name="Energetic Coach",
    ),
    VoiceProfile(
        voice_id="system-calm",
        provider=VoiceProviderType.SYSTEM,
        display_name="Calm Coach",
    ),
]


class VoiceService:
    def __init__(self, repo: VoiceProfileRepository) -> None:
        self._repo = repo
        self._settings = get_settings()
        self._output_dir = Path(self._settings.VOICE_OUTPUT_DIR)
        self._sample_dir = Path(self._settings.VOICE_SAMPLE_DIR)

    def _provider(self):
        if self._settings.MINIMAX_API_KEY:
            try:
                return MinimaxVoiceProvider()
            except Exception:
                return FallbackVoiceProvider()
        return FallbackVoiceProvider()

    def list_options(self, user_id: UUID | None = None) -> list[VoiceProfile]:
        stored = self._repo.list_for_user(user_id)
        existing_ids = {voice.voice_id for voice in stored}
        return DEFAULT_VOICES + [voice for voice in stored if voice.voice_id not in existing_ids or voice.cloned]

    def synthesize(self, text: str, voice_id: str | None = None) -> tuple[VoiceSynthesisResult, str | None]:
        provider_voice_id = voice_id
        for stored in self._repo.list_for_user():
            if stored.voice_id == voice_id and stored.provider_voice_id:
                provider_voice_id = stored.provider_voice_id
                break
        result = self._provider().synthesize(text, provider_voice_id)
        if not result.audio_bytes:
            return result, None
        filename = f"{uuid4().hex}.mp3"
        output_path = self._output_dir / filename
        output_path.write_bytes(result.audio_bytes)
        return result, f"/runtime/audio/{filename}"

    def clone_voice(
        self,
        user_id: UUID,
        display_name: str,
        filename: str,
        content: bytes,
    ) -> VoiceProfile:
        sample_name = f"{uuid4().hex}-{filename}"
        sample_path = self._sample_dir / sample_name
        sample_path.write_bytes(content)
        clone_result = self._provider().clone_voice(sample_path, display_name)
        voice = VoiceProfile(
            voice_id=f"cloned-{uuid4().hex[:10]}",
            user_id=user_id,
            provider=VoiceProviderType.MINIMAX
            if self._settings.MINIMAX_API_KEY
            else VoiceProviderType.SYSTEM,
            provider_voice_id=clone_result.provider_voice_id,
            display_name=display_name,
            cloned=True,
            sample_filename=sample_name,
        )
        return self._repo.upsert(voice)
