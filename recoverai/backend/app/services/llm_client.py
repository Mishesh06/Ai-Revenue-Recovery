"""
RecoverAI v3.2 — LLM Client Facade (Backward Compatibility)

Re-exports the base exceptions, MockLLMClient, and default singleton for existing modules.
"""

from __future__ import annotations

from app.services.llm.base import (
    BaseLLMClient,
    LLMError,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMValidationError,
)
from app.services.llm.mock import MockLLMClient
from app.services.llm.openai_client import OpenAILLMClient
from app.services.llm.gemini_client import GeminiLLMClient
from app.services.llm.factory import (
    default_mock_client as llm_client,
    get_llm_client,
    set_llm_client_override,
)

__all__ = [
    "BaseLLMClient",
    "LLMError",
    "LLMTimeoutError",
    "LLMUnavailableError",
    "LLMValidationError",
    "MockLLMClient",
    "OpenAILLMClient",
    "GeminiLLMClient",
    "llm_client",
    "get_llm_client",
    "set_llm_client_override",
]
