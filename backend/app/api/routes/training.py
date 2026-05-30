"""Training session routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.enums import SupportedExercise
from app.models.schemas import SessionReport
from app.providers.form_analysis.live_service import (
    LiveModelServiceClient,
    ModelServiceError,
)
from app.repositories.profile_repository import ProfileRepository
from app.repositories.session_repository import SessionRepository
from app.services.training_service import TrainingService
from app.services.voice_service import VoiceService
from app.repositories.voice_profile_repository import VoiceProfileRepository


class StartTrainingRequest(BaseModel):
    user_id: UUID
    exercise: SupportedExercise
    mode: str = "manual"
    voice_id: str | None = None


class FrameTrainingRequest(BaseModel):
    session_id: UUID
    image_data: str


class StopTrainingRequest(BaseModel):
    session_id: UUID


class VoiceSynthesisRequest(BaseModel):
    text: str
    voice_id: str | None = None


router = APIRouter(prefix="/training", tags=["training"])


def _raise_model_service_error(exc: ModelServiceError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


def get_training_service(session: Session = Depends(get_session)) -> TrainingService:
    return TrainingService(
        SessionRepository(session),
        ProfileRepository(session),
        LiveModelServiceClient(),
    )


def get_voice_service(session: Session = Depends(get_session)) -> VoiceService:
    return VoiceService(VoiceProfileRepository(session))


@router.post("/session/start")
def start_training(
    payload: StartTrainingRequest,
    service: TrainingService = Depends(get_training_service),
) -> dict:
    try:
        return service.start(
            payload.user_id,
            payload.exercise,
            payload.voice_id,
            payload.mode,
        )
    except ModelServiceError as exc:
        _raise_model_service_error(exc)


@router.post("/session/frame")
def analyze_frame(
    payload: FrameTrainingRequest,
    service: TrainingService = Depends(get_training_service),
    voice_service: VoiceService = Depends(get_voice_service),
) -> dict:
    try:
        result = service.frame(payload.session_id, payload.image_data)
    except ModelServiceError as exc:
        _raise_model_service_error(exc)
    if result.get("speak_text"):
        synthesis, audio_url = voice_service.synthesize(
            result["speak_text"], result.get("voice_id")
        )
        result["audio_url"] = audio_url
        result["speech_text"] = synthesis.text
    else:
        result["audio_url"] = None
        result["speech_text"] = None
    return result


@router.post("/session/voice")
def synthesize_training_voice(
    payload: VoiceSynthesisRequest,
    voice_service: VoiceService = Depends(get_voice_service),
) -> dict:
    synthesis, audio_url = voice_service.synthesize(payload.text, payload.voice_id)
    return {"text": synthesis.text, "audio_url": audio_url}


@router.post("/session/stop", response_model=SessionReport)
def stop_training(
    payload: StopTrainingRequest,
    service: TrainingService = Depends(get_training_service),
) -> SessionReport:
    try:
        return service.stop(payload.session_id)
    except ModelServiceError as exc:
        _raise_model_service_error(exc)
