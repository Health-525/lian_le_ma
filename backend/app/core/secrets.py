"""第三方服务凭证管理（Secret_Manager）。

职责（需求 11.1 / 11.3）：

- 从 ``Settings`` / 环境变量按键名读取凭证。
- 凭证缺失或为空时抛出 :class:`MissingSecretError`。
- 绝不在异常消息或日志中泄露凭证明文：异常只暴露键名，不暴露值。

注意：本模块仅负责"读取与缺失报错"，日志掩码中间件属于任务 2.2，不在此实现。
"""

from __future__ import annotations

from app.core.config import Settings, get_settings


class MissingSecretError(Exception):
    """所需第三方凭证缺失或为空时抛出。

    仅记录键名（``secret_name``），不持有也不回显任何凭证明文值。
    """

    def __init__(self, name: str) -> None:
        self.secret_name = name
        # 异常消息只包含键名，绝不包含凭证值。
        super().__init__(f"Missing required secret: {name}")


class SecretManager:
    """读取并提供第三方服务凭证。

    凭证来源为 :class:`Settings`（其本身由环境变量 / ``.env`` 填充）。
    若指定键不存在、值为 ``None`` 或为空白字符串，则抛 :class:`MissingSecretError`。
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings if settings is not None else get_settings()

    def get(self, name: str) -> str:
        """返回名为 ``name`` 的凭证值。

        Args:
            name: 凭证键名，例如 ``"OPENROUTER_API_KEY"``。

        Returns:
            凭证的非空字符串值。

        Raises:
            MissingSecretError: 当该键未配置或值为空时。异常只暴露键名。
        """
        value = getattr(self._settings, name, None)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            raise MissingSecretError(name)
        return value
