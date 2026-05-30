"""Profile routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.schemas import UserProfile
from app.repositories.profile_repository import ProfileRepository
from app.services.customization_service import CustomizationService
from app.repositories.plan_repository import PlanRepository
from app.repositories.meal_plan_repository import MealPlanRepository

router = APIRouter(prefix="/profile", tags=["profile"])


def get_customization_service(session: Session = Depends(get_session)) -> CustomizationService:
    return CustomizationService(
        ProfileRepository(session),
        PlanRepository(session),
        MealPlanRepository(session),
    )


@router.post("/upsert", response_model=UserProfile)
def upsert_profile(
    profile: UserProfile,
    service: CustomizationService = Depends(get_customization_service),
) -> UserProfile:
    return service.upsert_profile(profile)
