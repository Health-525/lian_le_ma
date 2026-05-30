from pathlib import Path

from sqlalchemy import inspect

from app.core.database import _make_engine
from app.main import initialize_runtime_database


def test_initialize_runtime_database_creates_tables(tmp_path: Path) -> None:
    db_path = tmp_path / "runtime.db"
    engine = _make_engine(f"sqlite:///{db_path}")

    initialize_runtime_database(engine)

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    assert "training_sessions" in tables
    assert "session_reports" in tables
    assert "form_analyses" in tables
