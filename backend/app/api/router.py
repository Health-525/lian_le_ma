"""Aggregate API router."""

from fastapi import APIRouter

from app.api.routes.customization import router as customization_router
from app.api.routes.profile import router as profile_router
from app.api.routes.training import router as training_router
from app.api.routes.voice import router as voice_router

api_router = APIRouter(prefix="/api")
api_router.include_router(profile_router)
api_router.include_router(customization_router)
api_router.include_router(training_router)
api_router.include_router(voice_router)
