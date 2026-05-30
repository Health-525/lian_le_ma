"""Voice option and clone routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.repositories.voice_profile_repository import VoiceProfileRepository
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/voice", tags=["voice"])


def get_voice_service(session: Session = Depends(get_session)) -> VoiceService:
    return VoiceService(VoiceProfileRepository(session))


@router.get("/options")
def list_voice_options(
    user_id: UUID | None = None,
    service: VoiceService = Depends(get_voice_service),
) -> list[dict]:
    return [voice.model_dump(mode="json") for voice in service.list_options(user_id)]


@router.post("/clone")
async def clone_voice(
    user_id: UUID = Form(...),
    display_name: str = Form(...),
    sample: UploadFile = File(...),
    service: VoiceService = Depends(get_voice_service),
) -> dict:
    content = await sample.read()
    voice = service.clone_voice(user_id, display_name, sample.filename or "sample.mp3", content)
    return voice.model_dump(mode="json")
