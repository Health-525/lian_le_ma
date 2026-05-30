"""Backend-owned training session lifecycle."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4

from app.models.enums import ConfidenceLevel, FormStatus, SupportedExercise
from app.models.schemas import (
    FormAnalysis,
    ProblemArea,
    SessionReport,
    SetRecord,
    TrainingSession,
)
from app.providers.form_analysis.live_service import LiveModelServiceClient
from app.repositories.profile_repository import ProfileRepository
from app.repositories.session_repository import SessionRepository
from app.services.workout_summary import SummaryInput, build_session_report

MODEL_TO_APP: dict[str, SupportedExercise] = {
    "squat": SupportedExercise.SQUAT,
    "squats": SupportedExercise.SQUAT,
    "lunge": SupportedExercise.LUNGE,
    "lunges": SupportedExercise.LUNGE,
    "push_up": SupportedExercise.PUSH_UP,
    "pushups": SupportedExercise.PUSH_UP,
    "dumbbell_shoulder_press": SupportedExercise.DUMBBELL_SHOULDER_PRESS,
    "dumbbell_rows": SupportedExercise.DUMBBELL_ROWS,
    "bicep_curls": SupportedExercise.BICEP_CURLS,
    "situps": SupportedExercise.SITUPS,
    "tricep_extensions": SupportedExercise.TRICEP_EXTENSIONS,
    "lateral_shoulder_raises": SupportedExercise.LATERAL_SHOULDER_RAISES,
    "jumping_jacks": SupportedExercise.JUMPING_JACKS,
}

APP_TO_MODEL: dict[SupportedExercise, str] = {
    value: key
    for key, value in MODEL_TO_APP.items()
    if key
    in {
        "squats",
        "lunges",
        "pushups",
        "dumbbell_shoulder_press",
        "dumbbell_rows",
        "bicep_curls",
        "situps",
        "tricep_extensions",
        "lateral_shoulder_raises",
        "jumping_jacks",
    }
}

_RUNTIME_STORE: dict[UUID, "RuntimeTrainingSession"] = {}


@dataclass
class RuntimeTrainingSession:
    backend_session_id: UUID
    user_id: UUID
    selected_exercise: SupportedExercise
    model_session_id: str
    mode: str
    voice_id: str | None
    started_at: datetime
    last_rep_count: int = 0
    correction_count: int = 0
    last_status_color: str = "idle"
    rep_breakdown: dict[SupportedExercise, int] = field(default_factory=dict)
    analyses: list[FormAnalysis] = field(default_factory=list)
    next_focus: str = "Keep a stable and safe range of motion."


class TrainingService:
    def __init__(
        self,
        session_repo: SessionRepository,
        profile_repo: ProfileRepository,
        model_client: LiveModelServiceClient | None = None,
    ) -> None:
        self._session_repo = session_repo
        self._profile_repo = profile_repo
        self._model_client = model_client or LiveModelServiceClient()
        self._runtime = _RUNTIME_STORE

    def start(
        self,
        user_id: UUID,
        exercise: SupportedExercise,
        voice_id: str | None = None,
        mode: str = "manual",
    ) -> dict:
        backend_session_id = uuid4()
        training_session = TrainingSession(
            session_id=backend_session_id,
            user_id=user_id,
            started_at=datetime.utcnow(),
        )
        self._session_repo.create(training_session)
        model_payload = self._model_client.start_session(APP_TO_MODEL[exercise], mode)
        runtime = RuntimeTrainingSession(
            backend_session_id=backend_session_id,
            user_id=user_id,
            selected_exercise=exercise,
            model_session_id=model_payload["session_id"],
            mode=mode,
            voice_id=voice_id,
            started_at=training_session.started_at,
        )
        self._runtime[backend_session_id] = runtime
        return {
            "session_id": str(backend_session_id),
            "model_session_id": runtime.model_session_id,
            "exercise": exercise.value,
            "exercise_label": model_payload.get("exercise_label"),
            "tip": model_payload.get("tip"),
            "mode": mode,
        }

    def frame(self, backend_session_id: UUID, image_data: str) -> dict:
        runtime = self._runtime[backend_session_id]
        payload = self._model_client.analyze_frame(
            runtime.model_session_id, image_data, runtime.mode
        )
        active = MODEL_TO_APP.get(
            payload.get("active_exercise") or payload.get("exercise") or APP_TO_MODEL[runtime.selected_exercise],
            runtime.selected_exercise,
        )
        rep_count = int(payload.get("rep_count") or 0)
        rep_delta = max(0, rep_count - runtime.last_rep_count)
        runtime.last_rep_count = rep_count
        if rep_delta:
            runtime.rep_breakdown[active] = runtime.rep_breakdown.get(active, 0) + rep_delta
        correction_text = " ".join(
            part for part in [payload.get("primary_cue"), payload.get("secondary_cue")] if part
        ).strip() or None
        analysis = FormAnalysis(
            session_id=backend_session_id,
            exercise=active,
            is_standard=(payload.get("status_color") == "good"),
            confidence=ConfidenceLevel.HIGH
            if payload.get("status_color") in {"good", "alert"}
            else ConfidenceLevel.MEDIUM,
            problem_areas=[
                ProblemArea(
                    area=item.get("code", "unknown"),
                    severity=ConfidenceLevel.HIGH
                    if float(item.get("severity", 0)) >= 0.85
                    else ConfidenceLevel.MEDIUM,
                )
                for item in (payload.get("errors") or [])
                if item.get("code") != "no_person"
            ],
            status=FormStatus.INCONCLUSIVE
            if payload.get("recognition_state") == "no_person"
            else FormStatus.CONCLUSIVE,
            correction_text=correction_text,
        )
        runtime.analyses.append(analysis)
        runtime.next_focus = payload.get("primary_cue") or runtime.next_focus
        if not analysis.is_standard:
            runtime.correction_count += 1
        self._session_repo.add_form_analysis(backend_session_id, analysis)

        speak_text = payload.get("speak_text") or ""
        if rep_delta and not speak_text:
            speak_text = f"{rep_count}次"
        elif rep_delta and payload.get("status_color") == "good":
            speak_text = f"第{rep_count}次，继续保持"

        return {
            "session_id": str(backend_session_id),
            "active_exercise": active.value,
            "rep_count": rep_count,
            "rep_delta": rep_delta,
            "phase": payload.get("phase"),
            "status_color": payload.get("status_color", "idle"),
            "primary_cue": payload.get("primary_cue"),
            "secondary_cue": payload.get("secondary_cue"),
            "correction_text": correction_text,
            "speak_text": speak_text or None,
            "recognition_state": payload.get("recognition_state", runtime.mode),
            "errors": payload.get("errors", []),
        }

    def stop(self, backend_session_id: UUID) -> SessionReport:
        runtime = self._runtime.pop(backend_session_id)
        model_payload = self._model_client.stop_session(runtime.model_session_id)
        profile = self._profile_repo.get(runtime.user_id)
        duration = (datetime.utcnow() - runtime.started_at).total_seconds()
        summary = build_session_report(
            SummaryInput(
                session_id=str(backend_session_id),
                duration_seconds=duration,
                weight_kg=profile.weight_kg if profile else None,
                total_reps=sum(runtime.rep_breakdown.values()),
                rep_breakdown=runtime.rep_breakdown,
                analyses=runtime.analyses,
                next_focus=model_payload.get("summary", {}).get("next_focus")
                or runtime.next_focus,
            )
        )
        for exercise, reps in runtime.rep_breakdown.items():
            self._session_repo.add_set(
                backend_session_id,
                SetRecord(exercise=exercise, reps=reps, difficulty=3),
            )
        self._session_repo.mark_ended(backend_session_id, datetime.utcnow())
        self._session_repo.set_report(backend_session_id, summary)
        return summary
