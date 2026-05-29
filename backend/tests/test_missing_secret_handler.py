"""MissingSecretError -> 503 异常处理器测试（任务 2.1，需求 11.3）。

通过临时路由触发 MissingSecretError，断言：
- 返回 HTTP 503。
- 响应体含错误标识与缺失键名。
- 响应体不包含任何凭证明文。
"""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.secrets import MissingSecretError, SecretManager
from app.main import app

# 仅用于断言"明文不出现在响应体"，不写入任何文件。
_FAKE_SECRET = "sk-test-should-never-appear-in-response"


@app.get("/__test__/trigger-missing-secret")
def _trigger_missing_secret() -> dict[str, str]:
    """临时测试路由：在缺失凭证时取用，触发 MissingSecretError。"""
    manager = SecretManager(Settings(OPENROUTER_API_KEY=None))
    value = manager.get("OPENROUTER_API_KEY")
    return {"value": value}


client = TestClient(app, raise_server_exceptions=False)


def test_missing_secret_returns_503() -> None:
    """触发凭证缺失的路由应返回 503。"""
    response = client.get("/__test__/trigger-missing-secret")

    assert response.status_code == 503


def test_missing_secret_response_body_shape() -> None:
    """响应体应含错误标识与缺失键名，但不回显密钥值。"""
    response = client.get("/__test__/trigger-missing-secret")
    body = response.json()

    assert body["detail"] == "service_unavailable"
    assert body["missing"] == "OPENROUTER_API_KEY"


def test_missing_secret_response_does_not_leak_secret() -> None:
    """响应原始文本中不得出现任何凭证明文。"""
    response = client.get("/__test__/trigger-missing-secret")

    assert _FAKE_SECRET not in response.text


def test_health_still_works() -> None:
    """注册异常处理器后，既有 /health 接口应保持不变。"""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_secret_error_carries_only_key_name() -> None:
    """直接构造异常：携带键名而非凭证值。"""
    error = MissingSecretError("ELEVENLABS_API_KEY")

    assert error.secret_name == "ELEVENLABS_API_KEY"
    assert _FAKE_SECRET not in str(error)
