"""
RecoverAI v3.2 — Centralised Error Model

Defines:
  - ErrorCode          : canonical machine-readable error codes
  - ErrorDetail        : one validation or contextual error item
  - APIError           : standard error envelope returned by every error response
  - RecoverAIException : base exception + typed subclasses used throughout the app
  - register_exception_handlers : wires all handlers into the FastAPI app
"""

from __future__ import annotations

import enum
import uuid
from typing import Any

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request, status
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
from pydantic import BaseModel


# ── Error codes ───────────────────────────────────────────────────────────────

class ErrorCode(str, enum.Enum):
    NOT_FOUND = "not_found"
    FORBIDDEN = "forbidden"
    VALIDATION_ERROR = "validation_error"
    CONFLICT = "conflict"
    UNPROCESSABLE = "unprocessable"
    INTERNAL = "internal_error"


# ── Wire-format models ────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    """A single contextual detail item attached to an error."""
    field: str | None = None
    message: str


class APIError(BaseModel):
    """
    Standard error envelope.

    All error responses from RecoverAI have this shape::

        {
          "error": {
            "code": "not_found",
            "message": "Recovery case abc123 not found.",
            "details": [],
            "request_id": "550e8400-…"
          }
        }
    """
    code: ErrorCode
    message: str
    details: list[ErrorDetail] = []
    request_id: str | None = None


class APIErrorEnvelope(BaseModel):
    """Top-level envelope wrapping APIError."""
    error: APIError


# ── Application exceptions ────────────────────────────────────────────────────

class RecoverAIException(Exception):
    """Base exception for all domain-level errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: ErrorCode = ErrorCode.INTERNAL

    def __init__(
        self,
        message: str,
        details: list[ErrorDetail] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details: list[ErrorDetail] = details or []

    def to_api_error(self, request_id: str | None = None) -> APIError:
        return APIError(
            code=self.error_code,
            message=self.message,
            details=self.details,
            request_id=request_id,
        )


class NotFoundError(RecoverAIException):
    """Raised when a requested resource does not exist."""
    status_code = status.HTTP_404_NOT_FOUND
    error_code = ErrorCode.NOT_FOUND


class ForbiddenError(RecoverAIException):
    """Raised when the merchant context does not own the requested resource."""
    status_code = status.HTTP_403_FORBIDDEN
    error_code = ErrorCode.FORBIDDEN


class ConflictError(RecoverAIException):
    """Raised on idempotency key or unique-constraint violations."""
    status_code = status.HTTP_409_CONFLICT
    error_code = ErrorCode.CONFLICT


class UnprocessableError(RecoverAIException):
    """Raised when the request is syntactically valid but semantically wrong."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = ErrorCode.UNPROCESSABLE


# ── Exception handlers ────────────────────────────────────────────────────────

def _request_id(request: Request) -> str:
    """Extract or generate a request-scoped correlation ID."""
    return (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or str(uuid.uuid4())
    )


async def _recoverai_exception_handler(
    request: Request, exc: RecoverAIException
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=APIErrorEnvelope(
            error=exc.to_api_error(request_id=_request_id(request))
        ).model_dump(mode="json"),
    )


async def _validation_exception_handler(request: Request, exc: Any) -> JSONResponse:
    # pyrefly: ignore [missing-import]
    from fastapi.exceptions import RequestValidationError

    details = [
        ErrorDetail(field=".".join(str(p) for p in e["loc"]), message=e["msg"])
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=APIErrorEnvelope(
            error=APIError(
                code=ErrorCode.VALIDATION_ERROR,
                message="Request validation failed.",
                details=details,
                request_id=_request_id(request),
            )
        ).model_dump(mode="json"),
    )


async def _http_exception_handler(request: Request, exc: Any) -> JSONResponse:
    # pyrefly: ignore [missing-import]
    from fastapi.exceptions import HTTPException

    return JSONResponse(
        status_code=exc.status_code,
        content=APIErrorEnvelope(
            error=APIError(
                code=ErrorCode.NOT_FOUND
                if exc.status_code == 404
                else ErrorCode.INTERNAL,
                message=str(exc.detail),
                request_id=_request_id(request),
            )
        ).model_dump(mode="json"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all RecoverAI exception handlers on a FastAPI app instance."""
    # pyrefly: ignore [missing-import]
    from fastapi.exceptions import HTTPException, RequestValidationError

    app.add_exception_handler(RecoverAIException, _recoverai_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(HTTPException, _http_exception_handler)
