from __future__ import annotations

from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.routes.voice import get_voice_service
from app.main import app
from app.models.enums import VoiceProviderType
from app.models.schemas import VoiceProfile


class FakeVoiceService:
    def list_options(self, user_id=None):
        return [
            VoiceProfile(
                voice_id="system-default",
                provider=VoiceProviderType.SYSTEM,
                display_name="System Voice",
            )
        ]

    def clone_voice(self, user_id, display_name, filename, content):
        return VoiceProfile(
            voice_id="cloned-123",
            user_id=user_id,
            provider=VoiceProviderType.SYSTEM,
            display_name=display_name,
            cloned=True,
            sample_filename=filename,
        )


client = TestClient(app)


def setup_module() -> None:
    app.dependency_overrides[get_voice_service] = lambda: FakeVoiceService()


def teardown_module() -> None:
    app.dependency_overrides.clear()


def test_list_voice_options() -> None:
    response = client.get("/api/voice/options")
    assert response.status_code == 200
    assert response.json()[0]["voice_id"] == "system-default"


def test_clone_voice() -> None:
    response = client.post(
        "/api/voice/clone",
        data={"user_id": str(uuid4()), "display_name": "Clone Me"},
        files={"sample": ("sample.mp3", BytesIO(b"fake-audio"), "audio/mpeg")},
    )
    assert response.status_code == 200
    assert response.json()["cloned"] is True
