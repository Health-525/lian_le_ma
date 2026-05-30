from __future__ import annotations

from uuid import uuid4

from app.models.enums import ConfidenceLevel, FormStatus, SupportedExercise
from app.models.schemas import FormAnalysis, ProblemArea
from app.services.workout_summary import SummaryInput, build_session_report


def test_build_session_report_includes_calories_reps_and_score() -> None:
    sid = str(uuid4())
    report = build_session_report(
        SummaryInput(
            session_id=sid,
            duration_seconds=600,
            weight_kg=70,
            total_reps=30,
            rep_breakdown={
                SupportedExercise.SQUAT: 20,
                SupportedExercise.PUSH_UP: 10,
            },
            analyses=[
                FormAnalysis(
                    session_id=uuid4(),
                    exercise=SupportedExercise.SQUAT,
                    is_standard=True,
                    confidence=ConfidenceLevel.HIGH,
                    problem_areas=[],
                    status=FormStatus.CONCLUSIVE,
                ),
                FormAnalysis(
                    session_id=uuid4(),
                    exercise=SupportedExercise.SQUAT,
                    is_standard=False,
                    confidence=ConfidenceLevel.MEDIUM,
                    problem_areas=[ProblemArea(area="knee", severity=ConfidenceLevel.MEDIUM)],
                    status=FormStatus.CONCLUSIVE,
                ),
            ],
            next_focus="Keep the knees stable.",
        )
    )
    assert report.total_reps == 30
    assert report.estimated_calories > 0
    assert 0 <= report.overall_score <= 100
    assert report.exercise_breakdown
