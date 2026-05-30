"""Deterministic customization, meal guidance, and attempt guidance."""

from __future__ import annotations

from datetime import datetime
from math import floor

from app.deterministic.plan_generator import generate_plan
from app.models.enums import ConfidenceLevel, Gender, SupportedExercise, TrainingGoal
from app.models.schemas import (
    Assessment,
    AttemptGuidance,
    CustomPlanBundle,
    MealPlan,
    MealPlanDay,
    RecentLoadSample,
    UserProfile,
)
from app.repositories import MealPlanRepository, PlanRepository, ProfileRepository

_GOAL_CALORIE_DELTA: dict[TrainingGoal, int] = {
    TrainingGoal.FAT_LOSS: -300,
    TrainingGoal.MUSCLE_GAIN: 250,
    TrainingGoal.ENDURANCE: 100,
    TrainingGoal.GENERAL_FITNESS: 0,
}

_GOAL_PROTEIN_PER_KG: dict[TrainingGoal, float] = {
    TrainingGoal.FAT_LOSS: 2.0,
    TrainingGoal.MUSCLE_GAIN: 1.9,
    TrainingGoal.ENDURANCE: 1.6,
    TrainingGoal.GENERAL_FITNESS: 1.7,
}

_QUALITATIVE_GUIDANCE: dict[SupportedExercise, str] = {
    SupportedExercise.SQUAT: "Start with bodyweight or a very light goblet squat load.",
    SupportedExercise.LUNGE: "Start with bodyweight or light dumbbells only.",
    SupportedExercise.PUSH_UP: "Start with bodyweight, incline support if needed.",
    SupportedExercise.DUMBBELL_SHOULDER_PRESS: "Start with light dumbbells and stable overhead control.",
    SupportedExercise.DUMBBELL_ROWS: "Start with a light dumbbell and keep the torso stable.",
    SupportedExercise.BICEP_CURLS: "Start with light dumbbells and strict elbow control.",
    SupportedExercise.SITUPS: "Use bodyweight only.",
    SupportedExercise.TRICEP_EXTENSIONS: "Start with a light dumbbell and strict lockout.",
    SupportedExercise.LATERAL_SHOULDER_RAISES: "Start with very light dumbbells only.",
    SupportedExercise.JUMPING_JACKS: "Use bodyweight only.",
}


def _maintenance_calories(profile: UserProfile, assessment: Assessment) -> int:
    weight = profile.weight_kg or 65.0
    height = profile.height_cm or 170
    age = profile.age or 25
    if profile.gender == Gender.MALE:
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    elif profile.gender == Gender.FEMALE:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 80
    activity_factor = 1.2 + min(assessment.weekly_frequency, 7) * 0.08
    return int(round(bmr * activity_factor))


def _macro_targets(profile: UserProfile, assessment: Assessment, calories: int) -> tuple[int, int, int]:
    weight = profile.weight_kg or 65.0
    protein = max(90, int(round(weight * _GOAL_PROTEIN_PER_KG[assessment.goal])))
    fat = max(45, int(round(weight * 0.8)))
    remaining = max(0, calories - protein * 4 - fat * 9)
    carbs = max(80, int(round(remaining / 4)))
    return protein, carbs, fat


def _meal_suggestions(goal: TrainingGoal, day_index: int) -> list[str]:
    base = [
        "Breakfast: eggs or tofu, oats, and fruit.",
        "Lunch: rice, lean protein, and two vegetables.",
        "Dinner: potatoes or rice, fish or chicken, and greens.",
    ]
    if goal == TrainingGoal.MUSCLE_GAIN:
        base.append("Add yogurt, milk, or a protein snack after training.")
    elif goal == TrainingGoal.FAT_LOSS:
        base.append("Keep sauces light and prioritize high-fiber vegetables.")
    elif goal == TrainingGoal.ENDURANCE:
        base.append("Add an extra carb snack before longer sessions.")
    if day_index % 2 == 0:
        base.append("Hydration: include electrolytes or lightly salted water.")
    return base


def _estimate_1rm(sample: RecentLoadSample) -> float:
    return sample.weight_kg * (1 + sample.reps_completed / 30)


def build_attempt_guidance(samples: list[RecentLoadSample]) -> list[AttemptGuidance]:
    guidance: list[AttemptGuidance] = []
    for sample in samples:
        one_rm = _estimate_1rm(sample)
        training_max = round(one_rm * 0.75, 1)
        do_not_exceed = round(one_rm * 0.85, 1)
        guidance.append(
            AttemptGuidance(
                exercise=sample.exercise,
                estimated_training_max_kg=training_max,
                do_not_exceed_kg=do_not_exceed,
                confidence_label=ConfidenceLevel.MEDIUM
                if sample.reps_completed <= 12
                else ConfidenceLevel.LOW,
                explanation_note=(
                    "Conservative estimate from your recent completed load and reps. "
                    "Use it as an upper safety boundary, not a target to chase."
                ),
            )
        )
    return guidance


def fill_missing_attempt_guidance(
    samples: list[RecentLoadSample],
) -> list[AttemptGuidance]:
    provided = {sample.exercise for sample in samples}
    guidance = build_attempt_guidance(samples)
    for exercise, note in _QUALITATIVE_GUIDANCE.items():
        if exercise in provided:
            continue
        guidance.append(
            AttemptGuidance(
                exercise=exercise,
                confidence_label=ConfidenceLevel.LOW,
                explanation_note=note,
            )
        )
    return guidance


def build_meal_plan(profile: UserProfile, assessment: Assessment) -> MealPlan:
    maintenance = _maintenance_calories(profile, assessment)
    target = maintenance + _GOAL_CALORIE_DELTA[assessment.goal]
    target = max(1200, min(target, 4200))
    protein, carbs, fat = _macro_targets(profile, assessment, target)
    days = [
        MealPlanDay(
            day_index=day,
            calorie_target=target,
            protein_g=protein,
            carbs_g=carbs,
            fat_g=fat,
            meal_suggestions=_meal_suggestions(assessment.goal, day),
        )
        for day in range(1, 8)
    ]
    return MealPlan(
        user_id=profile.user_id,
        days=days,
        hydration_note="Aim for 30-35 ml of water per kg of body weight each day.",
        created_at=datetime.utcnow(),
    )


class CustomizationService:
    def __init__(
        self,
        profile_repo: ProfileRepository,
        plan_repo: PlanRepository,
        meal_repo: MealPlanRepository,
    ) -> None:
        self._profile_repo = profile_repo
        self._plan_repo = plan_repo
        self._meal_repo = meal_repo

    def upsert_profile(self, profile: UserProfile) -> UserProfile:
        return self._profile_repo.upsert(profile)

    def generate_bundle(
        self,
        profile: UserProfile,
        assessment: Assessment,
        samples: list[RecentLoadSample],
    ) -> CustomPlanBundle:
        profile = self._profile_repo.upsert(profile)
        assessment.user_id = profile.user_id
        training_plan = generate_plan(assessment)
        training_plan = self._plan_repo.add(training_plan)
        meal_plan = build_meal_plan(profile, assessment)
        attempt_guidance = fill_missing_attempt_guidance(samples)
        safety_notes = []
        if assessment.injury_risk:
            safety_notes.append(
                "Exercises loading your flagged risk areas were reduced or removed."
            )
        if profile.weight_kg is None or profile.height_cm is None:
            safety_notes.append(
                "Calories are a coarse estimate because height or weight is missing."
            )
        meal_plan, attempt_guidance, safety_notes = self._meal_repo.add(
            meal_plan, attempt_guidance, safety_notes
        )
        return CustomPlanBundle(
            profile=profile,
            assessment=assessment,
            training_plan=training_plan,
            meal_plan=meal_plan,
            attempt_guidance=attempt_guidance,
            safety_notes=safety_notes,
            generated_at=datetime.utcnow(),
        )
