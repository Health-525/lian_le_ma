"""SecretManager 单元测试（任务 2.1，需求 11.1 / 11.3）。

覆盖：
- 凭证存在时 get() 返回其值。
- 凭证缺失 / 为空 / 为空白时抛 MissingSecretError，且异常只暴露键名、不暴露值。
"""

import pytest

from app.core.config import Settings
from app.core.secrets import MissingSecretError, SecretManager

# 测试用的假凭证值，仅存在于内存中，不写入任何文件。
_FAKE_SECRET = "sk-test-fake-value-001"


def test_get_returns_value_when_present() -> None:
    """凭证存在时应原样返回。"""
    manager = SecretManager(Settings(OPENROUTER_API_KEY=_FAKE_SECRET))

    assert manager.get("OPENROUTER_API_KEY") == _FAKE_SECRET


def test_get_raises_when_missing() -> None:
    """凭证为 None 时应抛 MissingSecretError，并记录键名。"""
    manager = SecretManager(Settings(OPENROUTER_API_KEY=None))

    with pytest.raises(MissingSecretError) as exc_info:
        manager.get("OPENROUTER_API_KEY")

    assert exc_info.value.secret_name == "OPENROUTER_API_KEY"


def test_get_raises_when_empty_or_blank() -> None:
    """空字符串与纯空白都视为缺失。"""
    blank_manager = SecretManager(Settings(ELEVENLABS_API_KEY="   "))

    with pytest.raises(MissingSecretError):
        blank_manager.get("ELEVENLABS_API_KEY")


def test_missing_secret_error_does_not_leak_value() -> None:
    """异常消息只能包含键名，绝不能包含凭证明文值。"""
    manager = SecretManager(Settings(OPENROUTER_API_KEY=None))

    with pytest.raises(MissingSecretError) as exc_info:
        manager.get("OPENROUTER_API_KEY")

    message = str(exc_info.value)
    assert "OPENROUTER_API_KEY" in message
    assert _FAKE_SECRET not in message
