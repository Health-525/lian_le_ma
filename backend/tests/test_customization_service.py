from __future__ import annotations

from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base
from app.models import orm  # noqa: F401
from app.models.enums import Gender, SupportedExercise, TrainingGoal, Venue
from app.models.schemas import Assessment, RecentLoadSample, UserProfile
from app.repositories.meal_plan_repository import MealPlanRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.profile_repository import ProfileRepository
from app.services.customization_service import CustomizationService


def make_session() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_generate_bundle_returns_training_meal_and_attempt_guidance() -> None:
    session = make_session()
    try:
        service = CustomizationService(
            ProfileRepository(session),
            PlanRepository(session),
            MealPlanRepository(session),
        )
        uid = uuid4()
        bundle = service.generate_bundle(
            UserProfile(
                user_id=uid,
                name="Tester",
                gender=Gender.MALE,
                age=28,
                height_cm=178,
                weight_kg=75,
            ),
            Assessment(
                user_id=uid,
                goal=TrainingGoal.MUSCLE_GAIN,
                venue=Venue.GYM,
                equipment=["dumbbell"],
                weekly_frequency=4,
            ),
            [
                RecentLoadSample(
                    exercise=SupportedExercise.DUMBBELL_SHOULDER_PRESS,
                    weight_kg=18,
                    reps_completed=8,
                )
            ],
        )
        assert len(bundle.training_plan.days) == 7
        assert len(bundle.meal_plan.days) == 7
        assert bundle.attempt_guidance
        assert any(
            item.exercise == SupportedExercise.DUMBBELL_SHOULDER_PRESS
            and item.do_not_exceed_kg is not None
            for item in bundle.attempt_guidance
        )
    finally:
        session.close()
