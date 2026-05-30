"""HTTP bridge to the existing Flask model service."""

from __future__ import annotations

import httpx

from app.core.config import get_settings


class ModelServiceError(Exception):
    """Raised when the upstream pose/model service cannot fulfill a request."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class LiveModelServiceClient:
    def __init__(self, base_url: str | None = None) -> None:
        self._base_url = (base_url or get_settings().MODEL_SERVICE_URL).rstrip("/")

    @staticmethod
    def _extract_error_detail(response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            payload = None

        if isinstance(payload, dict):
            for key in ("error", "detail", "message"):
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()

        text = response.text.strip()
        return text or f"Model service request failed with status {response.status_code}."

    def _post_json(self, path: str, payload: dict, *, timeout: float) -> dict:
        try:
            response = httpx.post(
                f"{self._base_url}{path}",
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise ModelServiceError(
                exc.response.status_code,
                self._extract_error_detail(exc.response),
            ) from exc
        except httpx.RequestError as exc:
            raise ModelServiceError(
                503,
                "Model service is unavailable. Please confirm the pose service is running.",
            ) from exc

    def start_session(self, exercise: str, mode: str) -> dict:
        return self._post_json(
            "/api/session/start",
            {"exercise": exercise, "mode": mode},
            timeout=20.0,
        )

    def analyze_frame(self, session_id: str, image_data: str, mode: str) -> dict:
        return self._post_json(
            "/api/session/frame",
            {
                "session_id": session_id,
                "image_data": image_data,
                "mode": mode,
            },
            timeout=20.0,
        )

    def stop_session(self, session_id: str) -> dict:
        return self._post_json(
            "/api/session/stop",
            {"session_id": session_id},
            timeout=20.0,
        )
