"""
RecoverAI v3.2 — Application Configuration

Loaded from environment variables / .env file using Pydantic BaseSettings.
Never hardcode credentials here.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ─────────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/recoverai"
    )
    test_database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/recoverai_test"
    )

    # ── Application ──────────────────────────────────────────────
    app_name: str = "RecoverAI"
    app_version: str = "3.2.0"
    app_env: str = "development"
    debug: bool = False
    secret_key: str = "change-this-in-production"
    host: str = "0.0.0.0"
    port: int = 8001


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Module-level singleton for convenience
settings = get_settings()

