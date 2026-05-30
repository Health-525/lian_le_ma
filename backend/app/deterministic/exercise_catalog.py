"""Deterministic exercise catalog used by plan generation."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.enums import InjuryRiskArea, SupportedExercise, Venue


@dataclass(frozen=True)
class ExerciseDef:
    name: str
    required_equipment: frozenset[str] = field(default_factory=frozenset)
    venues: frozenset[Venue] = field(default_factory=frozenset)
    loads: frozenset[InjuryRiskArea] = field(default_factory=frozenset)
    supported: SupportedExercise | None = None


CATALOG: tuple[ExerciseDef, ...] = (
    ExerciseDef(
        name="深蹲",
        loads=frozenset({InjuryRiskArea.KNEE}),
        supported=SupportedExercise.SQUAT,
    ),
    ExerciseDef(
        name="弓步蹲",
        loads=frozenset({InjuryRiskArea.KNEE}),
        supported=SupportedExercise.LUNGE,
    ),
    ExerciseDef(
        name="俯卧撑",
        loads=frozenset({InjuryRiskArea.SHOULDER, InjuryRiskArea.WRIST}),
        supported=SupportedExercise.PUSH_UP,
    ),
    ExerciseDef(
        name="哑铃肩推",
        required_equipment=frozenset({"dumbbell"}),
        loads=frozenset({InjuryRiskArea.SHOULDER}),
        supported=SupportedExercise.DUMBBELL_SHOULDER_PRESS,
    ),
    ExerciseDef(
        name="哑铃划船",
        required_equipment=frozenset({"dumbbell"}),
        loads=frozenset({InjuryRiskArea.LOWER_BACK}),
        supported=SupportedExercise.DUMBBELL_ROWS,
    ),
    ExerciseDef(
        name="二头弯举",
        required_equipment=frozenset({"dumbbell"}),
        supported=SupportedExercise.BICEP_CURLS,
    ),
    ExerciseDef(name="仰卧起坐", supported=SupportedExercise.SITUPS),
    ExerciseDef(
        name="三头屈伸",
        required_equipment=frozenset({"dumbbell"}),
        loads=frozenset({InjuryRiskArea.SHOULDER}),
        supported=SupportedExercise.TRICEP_EXTENSIONS,
    ),
    ExerciseDef(
        name="侧平举",
        required_equipment=frozenset({"dumbbell"}),
        loads=frozenset({InjuryRiskArea.SHOULDER}),
        supported=SupportedExercise.LATERAL_SHOULDER_RAISES,
    ),
    ExerciseDef(
        name="开合跳",
        loads=frozenset({InjuryRiskArea.KNEE}),
        supported=SupportedExercise.JUMPING_JACKS,
    ),
)


def available_exercises(
    equipment: set[str], venue: Venue, injury_risk: set[InjuryRiskArea]
) -> list[ExerciseDef]:
    """Return exercises compatible with the user's equipment and injury profile."""

    result: list[ExerciseDef] = []
    for ex in CATALOG:
        if not ex.required_equipment.issubset(equipment):
            continue
        if ex.venues and venue not in ex.venues:
            continue
        if ex.loads & injury_risk:
            continue
        result.append(ex)
    return result
