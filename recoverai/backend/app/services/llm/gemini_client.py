"""
RecoverAI v3.2 — Google Gemini LLM Client

Google Gemini API integration with structured JSON mode and timeout enforcement.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Type
from pydantic import BaseModel

from app.services.llm.base import (
    BaseLLMClient,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMValidationError,
)

logger = logging.getLogger(__name__)


class GeminiLLMClient(BaseLLMClient):
    """
    Google Gemini client for RecoverAI reasoning agents using the Google REST API.
    """

    def __init__(
        self,
        api_key: str,
        model_name: str = "gemini-1.5-flash",
        timeout_seconds: float = 2.0,
        max_tokens: int = 300,
        temperature: float = 0.0,
    ):
        self._api_key = api_key
        self._model_name = model_name
        self._timeout = timeout_seconds
        self._max_tokens = max_tokens
        self._temperature = temperature

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    def generate_json(
        self,
        prompt: str,
        agent_type: str,
        schema_model: Type[BaseModel] | None = None,
    ) -> str:
        """Calls Gemini generateContent endpoint requesting JSON output."""
        if not self._api_key or len(self._api_key) < 8:
            raise LLMUnavailableError("Gemini API key is missing or invalid.")

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self._model_name}:generateContent"
            f"?key={self._api_key}"
        )
        headers = {"Content-Type": "application/json"}

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                f"You are the RecoverAI {agent_type.capitalize()} Agent. "
                                "Analyze the payment failure context and respond ONLY with a valid JSON object. "
                                f"Context:\n{prompt}"
                            )
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "maxOutputTokens": self._max_tokens,
                "temperature": self._temperature,
            },
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as response:
                if response.status != 200:
                    raise LLMUnavailableError(f"Gemini API returned HTTP {response.status}")
                res_body = json.loads(response.read().decode("utf-8"))
                candidates = res_body.get("candidates", [])
                if not candidates:
                    raise LLMValidationError("Gemini returned no response candidates.")

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts or "text" not in parts[0]:
                    raise LLMValidationError("Gemini response missing text part.")

                return parts[0]["text"].strip()

        except urllib.error.HTTPError as e:
            if e.code == 408 or e.code == 504:
                raise LLMTimeoutError(f"Gemini request timed out with HTTP {e.code}") from e
            elif e.code == 429:
                raise LLMUnavailableError("Gemini rate limit exceeded (HTTP 429).") from e
            elif e.code == 400 or e.code == 403:
                raise LLMUnavailableError(f"Gemini API authentication / request error: HTTP {e.code}") from e
            else:
                raise LLMUnavailableError(f"Gemini service error: HTTP {e.code}") from e

        except (TimeoutError, urllib.error.URLError) as e:
            if "timed out" in str(e).lower():
                raise LLMTimeoutError(f"Gemini connection timed out (> {self._timeout}s).") from e
            raise LLMUnavailableError(f"Gemini endpoint unreachable: {e}") from e

        except Exception as e:
            raise LLMUnavailableError(f"Unexpected Gemini error: {e}") from e
