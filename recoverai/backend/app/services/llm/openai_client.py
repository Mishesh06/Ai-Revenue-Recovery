"""
RecoverAI v3.2 — OpenAI LLM Client

Production-grade OpenAI integration supporting structured JSON output,
strict execution timeout limits, token usage telemetry, and safe error handling.
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


class OpenAILLMClient(BaseLLMClient):
    """
    OpenAI client for RecoverAI reasoning agents.
    Uses standard HTTP/REST with JSON mode for maximum portability and zero heavy runtime dependencies.
    """

    def __init__(
        self,
        api_key: str,
        model_name: str = "gpt-4o-mini",
        base_url: str = "https://api.openai.com/v1",
        timeout_seconds: float = 2.0,
        max_tokens: int = 300,
        temperature: float = 0.0,
    ):
        self._api_key = api_key
        self._model_name = model_name
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._max_tokens = max_tokens
        self._temperature = temperature

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model_name

    def generate_json(
        self,
        prompt: str,
        agent_type: str,
        schema_model: Type[BaseModel] | None = None,
    ) -> str:
        """
        Calls OpenAI Chat Completions API requesting structured JSON output.
        """
        if not self._api_key or self._api_key.startswith("change-") or len(self._api_key) < 8:
            raise LLMUnavailableError("OpenAI API key is missing or invalid.")

        url = f"{self._base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._api_key}",
        }

        system_message = (
            f"You are the RecoverAI {agent_type.capitalize()} Agent. "
            "Analyze the payment failure metadata and respond ONLY with a valid JSON object matching the required schema. "
            "Do not include markdown codeblocks or commentary."
        )

        payload = {
            "model": self._model_name,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": self._max_tokens,
            "temperature": self._temperature,
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as response:
                if response.status != 200:
                    raise LLMUnavailableError(f"OpenAI API returned HTTP {response.status}")
                res_body = json.loads(response.read().decode("utf-8"))
                choices = res_body.get("choices", [])
                if not choices:
                    raise LLMValidationError("OpenAI returned an empty choices list.")

                content = choices[0].get("message", {}).get("content", "")
                if not content:
                    raise LLMValidationError("OpenAI returned empty message content.")

                return content.strip()

        except urllib.error.HTTPError as e:
            if e.code == 408 or e.code == 504:
                raise LLMTimeoutError(f"OpenAI request timed out with HTTP {e.code}") from e
            elif e.code == 429:
                raise LLMUnavailableError("OpenAI rate limit exceeded (HTTP 429).") from e
            elif e.code == 401 or e.code == 403:
                raise LLMUnavailableError(f"OpenAI authentication failed (HTTP {e.code}).") from e
            else:
                raise LLMUnavailableError(f"OpenAI service error: HTTP {e.code}") from e

        except (TimeoutError, urllib.error.URLError) as e:
            if "timed out" in str(e).lower():
                raise LLMTimeoutError(f"OpenAI connection timed out (> {self._timeout}s).") from e
            raise LLMUnavailableError(f"OpenAI endpoint unreachable: {e}") from e

        except Exception as e:
            raise LLMUnavailableError(f"Unexpected OpenAI error: {e}") from e
