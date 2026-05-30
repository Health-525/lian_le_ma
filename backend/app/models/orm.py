"""SQLAlchemy ORM models for backend persistence."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserProfileORM(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False, default="unset")
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class AssessmentORM(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        CheckConstraint(
            "weekly_frequency >= 1 AND weekly_frequency <= 7",
            name="ck_assessment_weekly_frequency",
        ),
    )

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    goal: Mapped[str] = mapped_column(String(32), nullable=False)
    venue: Mapped[str] = mapped_column(String(16), nullable=False)
    equipment: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    weekly_frequency: Mapped[int] = mapped_column(Integer, nullable=False)
    injury_risk: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class TrainingPlanORM(Base):
    __tablename__ = "training_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    days: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True, nullable=False
    )


class MealPlanORM(Base):
    __tablename__ = "meal_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    days: Mapped[list] = mapped_column(JSON, nullable=False)
    hydration_note: Mapped[str] = mapped_column(String, nullable=False)
    attempt_guidance: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    safety_notes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True, nullable=False
    )


class TrainingSessionORM(Base):
    __tablename__ = "training_sessions"

    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True, nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    sets: Mapped[list["SetRecordORM"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SetRecordORM.id",
    )
    form_analyses: Mapped[list["FormAnalysisORM"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="FormAnalysisORM.id",
    )
    voice_commands: Mapped[list["VoiceCommandEventORM"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="VoiceCommandEventORM.id",
    )
    report: Mapped["SessionReportORM | None"] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        uselist=False,
    )


class SetRecordORM(Base):
    __tablename__ = "set_records"
    __table_args__ = (
        CheckConstraint(
            "difficulty >= 1 AND difficulty <= 5", name="ck_set_difficulty"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("training_sessions.session_id"), nullable=False
    )
    exercise: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)

    session: Mapped[TrainingSessionORM] = relationship(back_populates="sets")


class FormAnalysisORM(Base):
    __tablename__ = "form_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("training_sessions.session_id"), nullable=False
    )
    exercise: Mapped[str] = mapped_column(String(64), nullable=False)
    is_standard: Mapped[bool] = mapped_column(Boolean, nullable=False)
    confidence: Mapped[str] = mapped_column(String(16), nullable=False)
    problem_areas: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    correction_text: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    session: Mapped[TrainingSessionORM] = relationship(back_populates="form_analyses")


class VoiceCommandEventORM(Base):
    __tablename__ = "voice_command_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("training_sessions.session_id"), nullable=False
    )
    command: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    session: Mapped[TrainingSessionORM] = relationship(
        back_populates="voice_commands"
    )


class SessionReportORM(Base):
    __tablename__ = "session_reports"
    __table_args__ = (
        CheckConstraint(
            "form_score >= 0 AND form_score <= 100", name="ck_report_form_score"
        ),
        CheckConstraint(
            "overall_score >= 0 AND overall_score <= 100",
            name="ck_report_overall_score",
        ),
    )

    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("training_sessions.session_id"), primary_key=True
    )
    form_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_notes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    correction_count: Mapped[int] = mapped_column(Integer, nullable=False)
    next_focus: Mapped[str] = mapped_column(String, nullable=False)
    summary_text: Mapped[str | None] = mapped_column(String, nullable=True)
    total_reps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    estimated_calories: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    exercise_breakdown: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    session: Mapped[TrainingSessionORM] = relationship(back_populates="report")


class PermissionRecordORM(Base):
    __tablename__ = "permission_records"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    scope: Mapped[str] = mapped_column(String(16), primary_key=True)
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class ConsentRecordORM(Base):
    __tablename__ = "consent_records"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    consent_type: Mapped[str] = mapped_column(String(32), primary_key=True)
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class UserEntitlementORM(Base):
    __tablename__ = "user_entitlements"
    __table_args__ = (
        CheckConstraint("free_quota_used >= 0", name="ck_entitlement_quota"),
    )

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    entitlement: Mapped[str] = mapped_column(String(8), default="free", nullable=False)
    free_quota_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class VoiceProfileORM(Base):
    __tablename__ = "voice_profiles"

    voice_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    provider_voice_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    cloned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sample_filename: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
