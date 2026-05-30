"""Persistence access for generated meal plans and attempt guidance."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.orm import MealPlanORM
from app.models.schemas import AttemptGuidance, MealPlan, MealPlanDay


def _to_model(row: MealPlanORM) -> tuple[MealPlan, list[AttemptGuidance], list[str]]:
    meal_plan = MealPlan(
        user_id=UUID(row.user_id),
        days=[MealPlanDay.model_validate(day) for day in row.days],
        hydration_note=row.hydration_note,
        created_at=row.created_at,
    )
    guidance = [AttemptGuidance.model_validate(item) for item in row.attempt_guidance]
    safety_notes = list(row.safety_notes or [])
    return meal_plan, guidance, safety_notes


class MealPlanRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(
        self,
        meal_plan: MealPlan,
        attempt_guidance: list[AttemptGuidance],
        safety_notes: list[str],
    ) -> tuple[MealPlan, list[AttemptGuidance], list[str]]:
        row = MealPlanORM(
            user_id=str(meal_plan.user_id),
            days=[day.model_dump(mode="json") for day in meal_plan.days],
            hydration_note=meal_plan.hydration_note,
            attempt_guidance=[item.model_dump(mode="json") for item in attempt_guidance],
            safety_notes=list(safety_notes),
            created_at=meal_plan.created_at,
        )
        self._session.add(row)
        self._session.commit()
        return _to_model(row)

    def get_current(
        self, user_id: UUID
    ) -> tuple[MealPlan, list[AttemptGuidance], list[str]] | None:
        stmt = (
            select(MealPlanORM)
            .where(MealPlanORM.user_id == str(user_id))
            .order_by(MealPlanORM.created_at.desc(), MealPlanORM.id.desc())
            .limit(1)
        )
        row = self._session.scalars(stmt).first()
        return _to_model(row) if row is not None else None
