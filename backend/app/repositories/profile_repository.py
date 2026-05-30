"""Persistence access for user profiles."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.enums import Gender
from app.models.orm import UserProfileORM
from app.models.schemas import UserProfile


def _to_model(row: UserProfileORM) -> UserProfile:
    return UserProfile(
        user_id=UUID(row.user_id),
        name=row.name,
        gender=Gender(row.gender),
        age=row.age,
        height_cm=row.height_cm,
        weight_kg=row.weight_kg,
        updated_at=row.updated_at,
    )


class ProfileRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(self, profile: UserProfile) -> UserProfile:
        row = self._session.get(UserProfileORM, str(profile.user_id))
        if row is None:
            row = UserProfileORM(user_id=str(profile.user_id))
            self._session.add(row)
        row.name = profile.name
        row.gender = profile.gender.value
        row.age = profile.age
        row.height_cm = profile.height_cm
        row.weight_kg = profile.weight_kg
        row.updated_at = profile.updated_at
        self._session.commit()
        return _to_model(row)

    def get(self, user_id: UUID) -> UserProfile | None:
        row = self._session.get(UserProfileORM, str(user_id))
        return _to_model(row) if row is not None else None
