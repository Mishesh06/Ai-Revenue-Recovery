"""
RecoverAI v3.2 — Mock LLM Client

Simulates an external LLM call. Used for unit testing, offline CI/CD,
and deterministic failure-mode injection (timeout, unavailable, malformed JSON).
"""

from __future__ import annotations

import json
import time
from typing import Type
from pydantic import BaseModel

from app.services.llm.base import (
    BaseLLMClient,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMValidationError,
)


class MockLLMClient(BaseLLMClient):
    """
    A deterministic mock LLM client to simulate agent execution without network requests.
    Supports dynamic failure injection for test suites.
    """

    def __init__(self, model_name: str = "mock-model-v1"):
        self._model_name = model_name
        self.inject_timeout = False
        self.inject_unavailable = False
        self.inject_malformed_json = False
        self.inject_invalid_schema = False

        self.mock_diagnosis_response = {
            "failure_category": "TEMPORARY_FAILURE",
            "confidence": 0.91,
            "evidence": ["Previous successful payments", "Transient gateway response"],
        }

        self.mock_planner_response = {
            "recommended_action": "RETRY_PAYMENT",
            "priority": "HIGH",
            "reason_code": "HIGH_RECOVERY_PROBABILITY",
            "confidence": 0.89,
        }

    @property
    def provider_name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return self._model_name

    def generate_json(
        self,
        prompt: str,
        agent_type: str,
        schema_model: Type[BaseModel] | None = None,
    ) -> str:
        """Simulates generating a JSON response from an LLM."""
        if self.inject_timeout:
            time.sleep(0.05)
            raise LLMTimeoutError("LLM generation timed out.")

        if self.inject_unavailable:
            raise LLMUnavailableError("LLM service is currently unavailable.")

        if self.inject_malformed_json:
            return '{"failure_category": "TEMPORARY_FAILURE", "confidence": 0.91, "evidence": ["Missing bracket"'

        if self.inject_invalid_schema:
            return '{"wrong_key": "value", "confidence": "high"}'

        # Return valid mock response based on agent type
        if agent_type == "diagnosis":
            return json.dumps(self.mock_diagnosis_response)
        else:
            return json.dumps(self.mock_planner_response)
