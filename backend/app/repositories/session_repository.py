"""Training session persistence."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import (
    ConfidenceLevel,
    FormStatus,
    SupportedExercise,
    VoiceCommand,
)
from app.models.orm import (
    FormAnalysisORM,
    SessionReportORM,
    SetRecordORM,
    TrainingSessionORM,
    VoiceCommandEventORM,
)
from app.models.schemas import (
    ExerciseBreakdown,
    FormAnalysis,
    ProblemArea,
    SessionReport,
    SetRecord,
    TrainingSession,
    VoiceCommandEvent,
)


def _form_to_model(row: FormAnalysisORM) -> FormAnalysis:
    return FormAnalysis(
        session_id=UUID(row.session_id),
        exercise=SupportedExercise(row.exercise),
        is_standard=row.is_standard,
        confidence=ConfidenceLevel(row.confidence),
        problem_areas=[ProblemArea.model_validate(p) for p in (row.problem_areas or [])],
        status=FormStatus(row.status),
        correction_text=row.correction_text,
        created_at=row.created_at,
    )


def _report_to_model(row: SessionReportORM | None) -> SessionReport | None:
    if row is None:
        return None
    return SessionReport(
        session_id=UUID(row.session_id),
        form_score=row.form_score,
        risk_notes=list(row.risk_notes or []),
        correction_count=row.correction_count,
        next_focus=row.next_focus,
        summary_text=row.summary_text,
        total_reps=row.total_reps,
        duration_seconds=row.duration_seconds,
        estimated_calories=row.estimated_calories,
        overall_score=row.overall_score,
        exercise_breakdown=[
            ExerciseBreakdown.model_validate(item)
            for item in (row.exercise_breakdown or [])
        ],
    )


def _to_model(row: TrainingSessionORM) -> TrainingSession:
    return TrainingSession(
        session_id=UUID(row.session_id),
        user_id=UUID(row.user_id),
        started_at=row.started_at,
        ended_at=row.ended_at,
        sets=[
            SetRecord(
                exercise=SupportedExercise(s.exercise) if s.exercise else None,
                reps=s.reps,
                difficulty=s.difficulty,
            )
            for s in row.sets
        ],
        form_analyses=[_form_to_model(f) for f in row.form_analyses],
        voice_commands=[
            VoiceCommandEvent(
                session_id=UUID(v.session_id),
                command=VoiceCommand(v.command),
                created_at=v.created_at,
            )
            for v in row.voice_commands
        ],
        report=_report_to_model(row.report),
    )


class SessionRepository:
    """Persistence access for training sessions and their child records."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, training_session: TrainingSession) -> TrainingSession:
        row = TrainingSessionORM(
            session_id=str(training_session.session_id),
            user_id=str(training_session.user_id),
            started_at=training_session.started_at,
            ended_at=training_session.ended_at,
        )
        self._session.add(row)
        self._session.commit()
        return _to_model(row)

    def get(self, session_id: UUID) -> TrainingSession | None:
        row = self._session.get(TrainingSessionORM, str(session_id))
        return _to_model(row) if row is not None else None

    def add_form_analysis(self, session_id: UUID, analysis: FormAnalysis) -> FormAnalysis:
        row = FormAnalysisORM(
            session_id=str(session_id),
            exercise=analysis.exercise.value,
            is_standard=analysis.is_standard,
            confidence=analysis.confidence.value,
            problem_areas=[p.model_dump(mode="json") for p in analysis.problem_areas],
            status=analysis.status.value,
            correction_text=analysis.correction_text,
            created_at=analysis.created_at,
        )
        self._session.add(row)
        self._session.commit()
        return _form_to_model(row)

    def add_set(self, session_id: UUID, record: SetRecord) -> None:
        self._session.add(
            SetRecordORM(
                session_id=str(session_id),
                exercise=record.exercise.value if record.exercise else None,
                reps=record.reps,
                difficulty=record.difficulty,
            )
        )
        self._session.commit()

    def add_voice_command(self, session_id: UUID, event: VoiceCommandEvent) -> None:
        self._session.add(
            VoiceCommandEventORM(
                session_id=str(session_id),
                command=event.command.value,
                created_at=event.created_at,
            )
        )
        self._session.commit()

    def set_report(self, session_id: UUID, report: SessionReport) -> SessionReport:
        row = self._session.get(SessionReportORM, str(session_id))
        if row is None:
            row = SessionReportORM(session_id=str(session_id))
            self._session.add(row)
        row.form_score = report.form_score
        row.risk_notes = list(report.risk_notes)
        row.correction_count = report.correction_count
        row.next_focus = report.next_focus
        row.summary_text = report.summary_text
        row.total_reps = report.total_reps
        row.duration_seconds = report.duration_seconds
        row.estimated_calories = report.estimated_calories
        row.overall_score = report.overall_score
        row.exercise_breakdown = [
            item.model_dump(mode="json") for item in report.exercise_breakdown
        ]
        self._session.commit()
        return report

    def mark_ended(self, session_id: UUID, ended_at) -> None:
        row = self._session.get(TrainingSessionORM, str(session_id))
        if row is not None:
            row.ended_at = ended_at
            self._session.commit()

    def list_by_user(
        self, user_id: UUID, *, limit: int = 20, offset: int = 0
    ) -> list[TrainingSession]:
        stmt = (
            select(TrainingSessionORM)
            .where(TrainingSessionORM.user_id == str(user_id))
            .order_by(TrainingSessionORM.started_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [_to_model(r) for r in self._session.scalars(stmt).all()]
