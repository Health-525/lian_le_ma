"""Customization routes."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.schemas import (
    Assessment,
    CustomPlanBundle,
    RecentLoadSample,
    UserProfile,
)
from app.repositories.meal_plan_repository import MealPlanRepository
from app.repositories.plan_repository import PlanRepository
from app.repositories.profile_repository import ProfileRepository
from app.services.customization_service import CustomizationService


class CustomizationRequest(BaseModel):
    profile: UserProfile
    assessment: Assessment
    recent_load_samples: list[RecentLoadSample] = Field(default_factory=list)


router = APIRouter(prefix="/customization", tags=["customization"])


def get_customization_service(session: Session = Depends(get_session)) -> CustomizationService:
    return CustomizationService(
        ProfileRepository(session),
        PlanRepository(session),
        MealPlanRepository(session),
    )


@router.post("/plan", response_model=CustomPlanBundle)
def generate_custom_plan(
    payload: CustomizationRequest,
    service: CustomizationService = Depends(get_customization_service),
) -> CustomPlanBundle:
    return service.generate_bundle(
        payload.profile,
        payload.assessment,
        payload.recent_load_samples,
    )
