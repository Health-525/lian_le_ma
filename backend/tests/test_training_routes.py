from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.routes.training import get_training_service, get_voice_service
from app.main import app
from app.models.enums import SupportedExercise
from app.models.schemas import SessionReport
from app.providers.form_analysis.live_service import ModelServiceError


class FakeTrainingService:
    def __init__(self) -> None:
        self.session_id = uuid4()

    def start(self, user_id, exercise, voice_id=None, mode="manual"):
        return {
            "session_id": str(self.session_id),
            "exercise": exercise.value,
            "exercise_label": "深蹲",
            "tip": "Keep the full body inside the frame.",
            "mode": mode,
        }

    def frame(self, session_id, image_data):
        return {
            "session_id": str(session_id),
            "active_exercise": SupportedExercise.SQUAT.value,
            "rep_count": 3,
            "rep_delta": 1,
            "phase": "ready",
            "status_color": "good",
            "primary_cue": "Nice rep",
            "secondary_cue": "",
            "correction_text": None,
            "speak_text": "第3次",
            "errors": [],
        }

    def stop(self, session_id):
        return SessionReport(
            session_id=session_id,
            form_score=88,
            correction_count=1,
            next_focus="Keep a stable rhythm.",
            total_reps=12,
            duration_seconds=180,
            estimated_calories=24.5,
            overall_score=86,
        )


class FakeVoiceService:
    def synthesize(self, text, voice_id=None):
        return type("Synth", (), {"text": text, "audio_bytes": None})(), None


client = TestClient(app)


def setup_module() -> None:
    app.dependency_overrides[get_training_service] = lambda: FakeTrainingService()
    app.dependency_overrides[get_voice_service] = lambda: FakeVoiceService()


def teardown_module() -> None:
    app.dependency_overrides.clear()


def test_training_route_flow() -> None:
    user_id = str(uuid4())
    start = client.post(
        "/api/training/session/start",
        json={
            "user_id": user_id,
            "exercise": SupportedExercise.SQUAT.value,
            "mode": "manual",
        },
    )
    assert start.status_code == 200
    session_id = start.json()["session_id"]

    frame = client.post(
        "/api/training/session/frame",
        json={"session_id": session_id, "image_data": "data:image/jpeg;base64,ZmFrZQ=="},
    )
    assert frame.status_code == 200
    assert frame.json()["rep_count"] == 3
    assert frame.json()["speech_text"] == "第3次"

    stop = client.post("/api/training/session/stop", json={"session_id": session_id})
    assert stop.status_code == 200
    assert stop.json()["estimated_calories"] == 24.5
    assert stop.json()["overall_score"] == 86


def test_training_frame_returns_upstream_model_error() -> None:
    class ErrorTrainingService(FakeTrainingService):
        def frame(self, session_id, image_data):
            raise ModelServiceError(400, "无法读取图像帧")

    app.dependency_overrides[get_training_service] = lambda: ErrorTrainingService()
    non_raising_client = TestClient(app, raise_server_exceptions=False)

    response = non_raising_client.post(
        "/api/training/session/frame",
        json={
            "session_id": str(uuid4()),
            "image_data": "data:image/jpeg;base64,ZmFrZQ==",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "无法读取图像帧"

    app.dependency_overrides[get_training_service] = lambda: FakeTrainingService()
