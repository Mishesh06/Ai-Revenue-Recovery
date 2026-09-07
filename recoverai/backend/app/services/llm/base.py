"""
RecoverAI v3.2 — Base LLM Client Abstraction & Exceptions

Defines the contract for LLM providers (Mock, OpenAI, Gemini, Anthropic, Ollama).
All implementations must return structured JSON compliant with the requested Pydantic schema
and respect strict execution timeouts.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    """Base exception for all LLM client errors."""
    pass


class LLMTimeoutError(LLMError):
    """Raised when an LLM call exceeds the configured timeout threshold."""
    pass


class LLMUnavailableError(LLMError):
    """Raised when an LLM provider endpoint is unreachable, rate-limited, or disabled."""
    pass


class LLMValidationError(LLMError):
    """Raised when an LLM output fails schema validation or produces invalid JSON."""
    pass


class BaseLLMClient(ABC):
    """
    Abstract Base Class for LLM Clients in RecoverAI.
    
    Guarantees:
    1. Zero Payment Authority: LLM generates only analytical/planning advice.
    2. Strict Timeout: Any provider must respect timeout boundaries.
    3. Structured Output: Responses must map to Pydantic schemas.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns the provider identifier (e.g. 'mock', 'openai', 'gemini')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Returns the model identifier (e.g. 'gpt-4o-mini', 'gemini-1.5-flash')."""
        pass

    @abstractmethod
    def generate_json(self, prompt: str, agent_type: str, schema_model: Type[BaseModel] | None = None) -> str:
        """
        Generates a JSON response string conforming to schema_model.
        
        Args:
            prompt: Sanitized contextual prompt string (Zero PII).
            agent_type: Identifier of agent ('diagnosis' or 'planner').
            schema_model: Optional Pydantic model for structured output validation.
            
        Returns:
            JSON-encoded string conforming to schema_model.
            
        Raises:
            LLMTimeoutError: If execution exceeds timeout ceiling.
            LLMUnavailableError: If provider API is offline or returns HTTP 429/5xx.
            LLMValidationError: If output cannot be parsed into valid JSON.
        """
        pass
