"""FastAPI application entrypoint."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import create_all
from app.core.logging import configure_logging
from app.core.secrets import MissingSecretError


def initialize_runtime_database(target_engine=None) -> None:
    """Create runtime tables for local development if they do not exist yet."""
    create_all(target_engine)


configure_logging()
settings = get_settings()
initialize_runtime_database()

app = FastAPI(
    title="Lian Le Ma Backend",
    description="Unified backend for training, customization, and voice flows",
    version="0.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
app.mount(
    "/runtime/audio",
    StaticFiles(directory=Path(settings.VOICE_OUTPUT_DIR)),
    name="runtime-audio",
)


@app.exception_handler(MissingSecretError)
async def missing_secret_handler(
    request: Request, exc: MissingSecretError
) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": "service_unavailable", "missing": exc.secret_name},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
