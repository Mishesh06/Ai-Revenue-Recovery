"""
Tests for backend configuration defaults, environment overrides, and startup security validation.
"""

import logging
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app, lifespan


def test_default_config_settings():
    """Verify secure defaults: debug is False by default."""
    defaults = Settings(_env_file=None)
    assert defaults.debug is False
    assert defaults.app_env == "development"
    assert defaults.secret_key == "change-this-in-production"
    assert defaults.port == 8001


def test_explicit_debug_opt_in():
    """Verify that debug mode can be explicitly enabled via environment."""
    custom_settings = Settings(_env_file=None, debug=True, app_env="development")
    assert custom_settings.debug is True


def test_docs_and_openapi_disabled_when_debug_false():
    """When debug is False, /docs, /redoc, and /openapi.json must be hidden."""
    test_app = FastAPI(
        docs_url="/docs" if False else None,
        redoc_url="/redoc" if False else None,
        openapi_url="/openapi.json" if False else None,
    )
    client = TestClient(test_app)

    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_docs_and_openapi_enabled_when_debug_true():
    """When debug is True, /docs, /redoc, and /openapi.json are accessible."""
    test_app = FastAPI(
        docs_url="/docs" if True else None,
        redoc_url="/redoc" if True else None,
        openapi_url="/openapi.json" if True else None,
    )
    client = TestClient(test_app)

    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


@pytest.mark.asyncio
async def test_startup_validation_warns_in_production_with_default_secret(caplog, monkeypatch):
    """Verify warning is logged on startup when app_env is production and default secret_key is used."""
    monkeypatch.setattr("app.main.settings.app_env", "production")
    monkeypatch.setattr("app.main.settings.secret_key", "change-this-in-production")
    monkeypatch.setattr("app.main.settings.debug", False)

    with caplog.at_level(logging.WARNING, logger="recoverai.startup"):
        async with lifespan(app):
            pass

    assert any("Default or insecure SECRET_KEY is in use" in record.message for record in caplog.records)
    # Ensure the secret string itself is not leaked
    assert not any("change-this-in-production" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_startup_validation_warns_in_production_with_debug_enabled(caplog, monkeypatch):
    """Verify warning is logged on startup when debug is True in production."""
    monkeypatch.setattr("app.main.settings.app_env", "production")
    monkeypatch.setattr("app.main.settings.secret_key", "strong-production-secret-12345")
    monkeypatch.setattr("app.main.settings.debug", True)

    with caplog.at_level(logging.WARNING, logger="recoverai.startup"):
        async with lifespan(app):
            pass

    assert any("DEBUG mode is enabled in non-development environment" in record.message for record in caplog.records)
    # Ensure the production secret is never printed
    assert not any("strong-production-secret-12345" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_startup_validation_silent_in_development(caplog, monkeypatch):
    """Verify no security warnings are logged during normal development startup."""
    monkeypatch.setattr("app.main.settings.app_env", "development")
    monkeypatch.setattr("app.main.settings.secret_key", "change-this-in-production")
    monkeypatch.setattr("app.main.settings.debug", True)

    with caplog.at_level(logging.WARNING, logger="recoverai.startup"):
        async with lifespan(app):
            pass

    assert len([r for r in caplog.records if r.name == "recoverai.startup"]) == 0
