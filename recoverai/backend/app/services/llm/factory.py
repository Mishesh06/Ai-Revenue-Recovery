"""
RecoverAI v3.2 — LLM Client Factory

Instantiates the active LLM client based on application configuration.
Supports dynamic test overrides and provider switching.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.core.config import settings
from app.services.llm.base import BaseLLMClient
from app.services.llm.mock import MockLLMClient
from app.services.llm.openai_client import OpenAILLMClient
from app.services.llm.gemini_client import GeminiLLMClient

logger = logging.getLogger(__name__)

# Default global mock client instance for backward compatibility and test injection
default_mock_client = MockLLMClient()
_override_client: Optional[BaseLLMClient] = None


def set_llm_client_override(client: Optional[BaseLLMClient]) -> None:
    """Allows test fixtures to inject a specific LLM client instance."""
    global _override_client
    _override_client = client


def get_llm_client() -> BaseLLMClient:
    """
    Returns the configured LLM client instance based on settings.llm_provider.
    Defaults to MockLLMClient if unconfigured or during testing.
    """
    global _override_client, default_mock_client
    if _override_client is not None:
        return _override_client

    provider = (getattr(settings, "llm_provider", "mock") or "mock").lower().strip()

    if provider == "openai":
        api_key = getattr(settings, "llm_api_key", None) or ""
        model = getattr(settings, "llm_model", "gpt-4o-mini") or "gpt-4o-mini"
        base_url = getattr(settings, "llm_base_url", None) or "https://api.openai.com/v1"
        timeout = float(getattr(settings, "llm_timeout_seconds", 2.0) or 2.0)
        max_tokens = int(getattr(settings, "llm_max_tokens", 300) or 300)
        temp = float(getattr(settings, "llm_temperature", 0.0) or 0.0)
        return OpenAILLMClient(
            api_key=api_key,
            model_name=model,
            base_url=base_url,
            timeout_seconds=timeout,
            max_tokens=max_tokens,
            temperature=temp,
        )

    elif provider == "gemini":
        api_key = getattr(settings, "llm_api_key", None) or ""
        model = getattr(settings, "llm_model", "gemini-1.5-flash") or "gemini-1.5-flash"
        timeout = float(getattr(settings, "llm_timeout_seconds", 2.0) or 2.0)
        max_tokens = int(getattr(settings, "llm_max_tokens", 300) or 300)
        temp = float(getattr(settings, "llm_temperature", 0.0) or 0.0)
        return GeminiLLMClient(
            api_key=api_key,
            model_name=model,
            timeout_seconds=timeout,
            max_tokens=max_tokens,
            temperature=temp,
        )

    # Default to mock
    return default_mock_client
