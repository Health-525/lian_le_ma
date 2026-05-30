"""Pydantic domain models shared by routes, services, and repositories."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.enums import (
    ConfidenceLevel,
    ConsentType,
    Entitlement,
    FormStatus,
    Gender,
    InjuryRiskArea,
    PermissionScope,
    SupportedExercise,
    TrainingGoal,
    Venue,
    VoiceProviderType,
    VoiceCommand,
)

HEIGHT_CM_MIN, HEIGHT_CM_MAX = 100, 230
WEIGHT_KG_MIN, WEIGHT_KG_MAX = 30, 250
AGE_MIN, AGE_MAX = 12, 90
WEEKLY_FREQUENCY_MIN, WEEKLY_FREQUENCY_MAX = 1, 7
DIFFICULTY_MIN, DIFFICULTY_MAX = 1, 5
FORM_SCORE_MIN, FORM_SCORE_MAX = 0, 100
OVERALL_SCORE_MIN, OVERALL_SCORE_MAX = 0, 100
PLAN_DAYS = 7


class UserProfile(BaseModel):
    """Persisted user profile used by customization and workout summary."""

    user_id: UUID = Field(default_factory=uuid4)
    name: str = Field(default="Lian Le Ma User", min_length=1)
    gender: Gender = Gender.UNSET
    age: Optional[int] = Field(default=None, ge=AGE_MIN, le=AGE_MAX)
    height_cm: Optional[int] = Field(default=None, ge=HEIGHT_CM_MIN, le=HEIGHT_CM_MAX)
    weight_kg: Optional[float] = Field(default=None, ge=WEIGHT_KG_MIN, le=WEIGHT_KG_MAX)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Assessment(BaseModel):
    """User customization and workout planning input."""

    user_id: UUID = Field(default_factory=uuid4)
    goal: TrainingGoal
    venue: Venue
    equipment: list[str] = Field(default_factory=list)
    weekly_frequency: int = Field(
        ..., ge=WEEKLY_FREQUENCY_MIN, le=WEEKLY_FREQUENCY_MAX
    )
    injury_risk: list[InjuryRiskArea] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RecentLoadSample(BaseModel):
    """Recent lift sample used for conservative load guidance."""

    exercise: SupportedExercise
    weight_kg: float = Field(..., ge=0)
    reps_completed: int = Field(..., ge=1, le=30)
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class PlanExercise(BaseModel):
    """One exercise entry inside the 7-day training plan."""

    name: str
    exercise: Optional[SupportedExercise] = None
    sets: int = Field(..., ge=1)
    reps: Optional[int] = Field(default=None, ge=1)
    duration_sec: Optional[int] = Field(default=None, ge=1)
    rest_sec: int = Field(..., ge=0)
    difficulty: int = Field(..., ge=DIFFICULTY_MIN, le=DIFFICULTY_MAX)


class PlanDay(BaseModel):
    """One day inside the 7-day training plan."""

    day_index: int = Field(..., ge=1, le=PLAN_DAYS)
    is_rest_day: bool = False
    exercises: list[PlanExercise] = Field(default_factory=list)


class TrainingPlan(BaseModel):
    """Seven-day training plan."""

    user_id: UUID
    days: list[PlanDay] = Field(..., min_length=PLAN_DAYS, max_length=PLAN_DAYS)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MealPlanDay(BaseModel):
    """One day of meal guidance."""

    day_index: int = Field(..., ge=1, le=PLAN_DAYS)
    calorie_target: int = Field(..., ge=1000, le=6000)
    protein_g: int = Field(..., ge=0, le=500)
    carbs_g: int = Field(..., ge=0, le=800)
    fat_g: int = Field(..., ge=0, le=300)
    meal_suggestions: list[str] = Field(default_factory=list)


class MealPlan(BaseModel):
    """Seven-day meal guidance."""

    user_id: UUID
    days: list[MealPlanDay] = Field(..., min_length=PLAN_DAYS, max_length=PLAN_DAYS)
    hydration_note: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AttemptGuidance(BaseModel):
    """Conservative upper-bound training guidance."""

    exercise: SupportedExercise
    estimated_training_max_kg: Optional[float] = Field(default=None, ge=0)
    do_not_exceed_kg: Optional[float] = Field(default=None, ge=0)
    confidence_label: ConfidenceLevel = ConfidenceLevel.LOW
    explanation_note: str


class CustomPlanBundle(BaseModel):
    """Response bundle for the customization tab."""

    profile: UserProfile
    assessment: Assessment
    training_plan: TrainingPlan
    meal_plan: MealPlan
    attempt_guidance: list[AttemptGuidance] = Field(default_factory=list)
    safety_notes: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ProblemArea(BaseModel):
    """Detected posture problem area."""

    area: str
    severity: ConfidenceLevel = ConfidenceLevel.MEDIUM


class FormAnalysis(BaseModel):
    """One frame-analysis result persisted for a training session."""

    session_id: UUID
    exercise: SupportedExercise
    is_standard: bool
    confidence: ConfidenceLevel
    problem_areas: list[ProblemArea] = Field(default_factory=list)
    status: FormStatus = FormStatus.CONCLUSIVE
    correction_text: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceCommandEvent(BaseModel):
    """One recognized voice command event during training."""

    session_id: UUID
    command: VoiceCommand
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SetRecord(BaseModel):
    """One set or motion-total record inside a session."""

    exercise: Optional[SupportedExercise] = None
    reps: Optional[int] = Field(default=None, ge=0)
    difficulty: int = Field(..., ge=DIFFICULTY_MIN, le=DIFFICULTY_MAX)


class ExerciseBreakdown(BaseModel):
    """Per-exercise summary inside the workout report."""

    exercise: SupportedExercise
    reps: int = Field(..., ge=0)
    estimated_calories: float = Field(..., ge=0)


class SessionReport(BaseModel):
    """Post-workout report."""

    session_id: UUID
    form_score: int = Field(..., ge=FORM_SCORE_MIN, le=FORM_SCORE_MAX)
    risk_notes: list[str] = Field(default_factory=list)
    correction_count: int = Field(..., ge=0)
    next_focus: str
    summary_text: Optional[str] = None
    total_reps: int = Field(default=0, ge=0)
    duration_seconds: float = Field(default=0, ge=0)
    estimated_calories: float = Field(default=0, ge=0)
    overall_score: int = Field(
        default=0, ge=OVERALL_SCORE_MIN, le=OVERALL_SCORE_MAX
    )
    exercise_breakdown: list[ExerciseBreakdown] = Field(default_factory=list)


class TrainingSession(BaseModel):
    """Persisted training session."""

    session_id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    sets: list[SetRecord] = Field(default_factory=list)
    form_analyses: list[FormAnalysis] = Field(default_factory=list)
    voice_commands: list[VoiceCommandEvent] = Field(default_factory=list)
    report: Optional[SessionReport] = None


class PermissionRecord(BaseModel):
    """Persisted device permission record."""

    user_id: UUID
    scope: PermissionScope
    granted: bool
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ConsentRecord(BaseModel):
    """Persisted sensitive-data consent record."""

    user_id: UUID
    consent_type: ConsentType = ConsentType.SENSITIVE_HEALTH
    granted: bool
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserEntitlement(BaseModel):
    """Subscription and usage-quota metadata."""

    user_id: UUID
    entitlement: Entitlement = Entitlement.FREE
    free_quota_used: int = Field(default=0, ge=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceProfile(BaseModel):
    """Voice metadata available to the user."""

    voice_id: str
    user_id: Optional[UUID] = None
    provider: VoiceProviderType = VoiceProviderType.SYSTEM
    provider_voice_id: Optional[str] = None
    display_name: str
    cloned: bool = False
    sample_filename: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
