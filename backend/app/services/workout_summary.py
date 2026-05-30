"""Workout summary scoring and calorie estimation."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from app.models.enums import SupportedExercise
from app.models.schemas import ExerciseBreakdown, FormAnalysis, SessionReport

_EXERCISE_MET: dict[SupportedExercise, float] = {
    SupportedExercise.SQUAT: 6.0,
    SupportedExercise.LUNGE: 5.8,
    SupportedExercise.PUSH_UP: 8.0,
    SupportedExercise.DUMBBELL_SHOULDER_PRESS: 6.5,
    SupportedExercise.DUMBBELL_ROWS: 6.2,
    SupportedExercise.BICEP_CURLS: 4.8,
    SupportedExercise.SITUPS: 5.0,
    SupportedExercise.TRICEP_EXTENSIONS: 4.8,
    SupportedExercise.LATERAL_SHOULDER_RAISES: 4.5,
    SupportedExercise.JUMPING_JACKS: 8.5,
}


@dataclass
class SummaryInput:
    session_id: str
    duration_seconds: float
    weight_kg: float | None
    total_reps: int
    rep_breakdown: dict[SupportedExercise, int]
    analyses: list[FormAnalysis]
    next_focus: str


def estimate_calories(
    weight_kg: float | None,
    duration_seconds: float,
    rep_breakdown: dict[SupportedExercise, int],
) -> tuple[float, list[ExerciseBreakdown]]:
    weight = weight_kg or 65.0
    hours = max(duration_seconds, 1.0) / 3600.0
    total_reps = sum(rep_breakdown.values()) or 1
    breakdown: list[ExerciseBreakdown] = []
    total = 0.0
    for exercise, reps in rep_breakdown.items():
        share = reps / total_reps
        calories = ((_EXERCISE_MET.get(exercise, 5.0) * 3.5 * weight) / 200.0) * hours * share
        calories = round(calories, 1)
        breakdown.append(
            ExerciseBreakdown(
                exercise=exercise,
                reps=reps,
                estimated_calories=calories,
            )
        )
        total += calories
    if not breakdown:
        total = round(((5.0 * 3.5 * weight) / 200.0) * hours, 1)
    return round(total, 1), breakdown


def build_session_report(payload: SummaryInput) -> SessionReport:
    correction_count = sum(1 for item in payload.analyses if not item.is_standard)
    form_hits = sum(1 for item in payload.analyses if item.is_standard)
    total_frames = len(payload.analyses)
    form_score = 80
    if total_frames:
        form_score = round(100 * form_hits / total_frames)
    total_calories, breakdown = estimate_calories(
        payload.weight_kg, payload.duration_seconds, payload.rep_breakdown
    )
    completion_bonus = min(20, payload.total_reps)
    consistency_penalty = min(30, correction_count * 2)
    overall_score = max(
        0,
        min(100, round(form_score * 0.6 + completion_bonus - consistency_penalty * 0.2)),
    )
    risk_notes = []
    if correction_count:
        counts = Counter(
            area.area
            for analysis in payload.analyses
            for area in analysis.problem_areas
        )
        for code, count in counts.most_common(3):
            risk_notes.append(f"{code}: {count} frames")
    summary_text = (
        f"You completed {payload.total_reps} reps in "
        f"{round(payload.duration_seconds, 1)} seconds and burned about "
        f"{total_calories} kcal."
    )
    return SessionReport(
        session_id=payload.session_id,
        form_score=form_score,
        risk_notes=risk_notes,
        correction_count=correction_count,
        next_focus=payload.next_focus,
        summary_text=summary_text,
        total_reps=payload.total_reps,
        duration_seconds=round(payload.duration_seconds, 1),
        estimated_calories=total_calories,
        overall_score=overall_score,
        exercise_breakdown=breakdown,
    )
