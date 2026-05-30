"""Persistence access for available voice profiles."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import VoiceProviderType
from app.models.orm import VoiceProfileORM
from app.models.schemas import VoiceProfile


def _to_model(row: VoiceProfileORM) -> VoiceProfile:
    return VoiceProfile(
        voice_id=row.voice_id,
        user_id=UUID(row.user_id) if row.user_id else None,
        provider=VoiceProviderType(row.provider),
        provider_voice_id=row.provider_voice_id,
        display_name=row.display_name,
        cloned=row.cloned,
        sample_filename=row.sample_filename,
        created_at=row.created_at,
    )


class VoiceProfileRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(self, voice: VoiceProfile) -> VoiceProfile:
        row = self._session.get(VoiceProfileORM, voice.voice_id)
        if row is None:
            row = VoiceProfileORM(voice_id=voice.voice_id)
            self._session.add(row)
        row.user_id = str(voice.user_id) if voice.user_id else None
        row.provider = voice.provider.value
        row.provider_voice_id = voice.provider_voice_id
        row.display_name = voice.display_name
        row.cloned = voice.cloned
        row.sample_filename = voice.sample_filename
        row.created_at = voice.created_at
        self._session.commit()
        return _to_model(row)

    def list_for_user(self, user_id: UUID | None = None) -> list[VoiceProfile]:
        stmt = select(VoiceProfileORM).order_by(VoiceProfileORM.created_at.asc())
        rows = self._session.scalars(stmt).all()
        result: list[VoiceProfile] = []
        for row in rows:
            if row.user_id is None or user_id is None or row.user_id == str(user_id):
                result.append(_to_model(row))
        return result
