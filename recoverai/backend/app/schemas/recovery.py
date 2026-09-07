"""
RecoverAI v3.2 — Recovery Case / Action / Attempt DTOs

Covers:
  GET  /api/recovery          → RecoveryCaseOut (list)
  GET  /api/recovery/{id}     → RecoveryCaseOut (detail)
  POST /api/recovery/{id}/analyze   → AnalyzeRequest / AnalyzeResponse
  POST /api/recovery/{id}/recommend → RecommendRequest / RecommendResponse
  POST /api/recovery/{id}/execute   → ExecuteRequest / ExecuteResponse
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import CaseState, ActionState, AttemptState, ExecutionMode


# ── Recovery Case ─────────────────────────────────────────────────────────────

class RecoveryCaseOut(BaseModel):
    """Wire representation of a RecoveryCase record."""
    id: uuid.UUID = Field(description="Recovery case UUID.")
    merchant_id: uuid.UUID = Field(description="Owning merchant UUID.")
    transaction_id: uuid.UUID = Field(description="Associated transaction UUID.")
    state: CaseState = Field(description="Current state-machine state.")
    correlation_id: str = Field(description="Shared trace ID for this case lifecycle.")
    confidence: float | None = Field(default=None, description="ML prediction confidence (0–1).")
    recovery_window_started_at: datetime | None = Field(default=None)
    recovery_window_ends_at: datetime | None = Field(default=None)
    recovered_at: datetime | None = Field(default=None)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Recovery Action ───────────────────────────────────────────────────────────

class RecoveryActionOut(BaseModel):
    """Wire representation of a RecoveryAction record."""
    id: uuid.UUID
    merchant_id: uuid.UUID
    recovery_case_id: uuid.UUID
    action_id: str = Field(description="Action type identifier (e.g. RETRY_PAYMENT).")
    state: ActionState
    execution_mode: ExecutionMode
    idempotency_key: str = Field(
        description="Canonical key: {merchant_id}:{recovery_case_id}:{action_id}."
    )
    policy_evaluation_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Recovery Attempt ──────────────────────────────────────────────────────────

class RecoveryAttemptOut(BaseModel):
    """Wire representation of a RecoveryAttempt record."""
    id: uuid.UUID
    recovery_action_id: uuid.UUID
    attempt_number: int
    state: AttemptState
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_code: str | None = None
    error_message: str | None = None
    adapter_response_reference: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── POST /analyze ─────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """
    Request body for POST /api/recovery/{id}/analyze.
    Phase 3 stub — future phases will invoke the ML/LLM agent here.
    """
    correlation_id: str | None = Field(
        default=None,
        description=(
            "Optional trace ID to attach to this analysis run. "
            "Defaults to the case's existing correlation_id if omitted."
        ),
        max_length=255,
    )


class AnalyzeResponse(BaseModel):
    """202 Accepted response for an analyze request."""
    case_id: uuid.UUID
    status: str = Field(description="Always 'accepted' in this phase.", examples=["accepted"])
    message: str


# ── POST /recommend ───────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    """
    Request body for POST /api/recovery/{id}/recommend.
    Phase 3 stub — future phases will invoke the recommendation engine.
    """
    correlation_id: str | None = Field(default=None, max_length=255)


class RecommendResponse(BaseModel):
    """202 Accepted response for a recommend request."""
    case_id: uuid.UUID
    status: str = Field(examples=["accepted"])
    message: str
    recommendations: list[dict] = Field(
        default_factory=list,
        description="Stub — will contain ranked action recommendations in future phases.",
    )


# ── POST /execute ─────────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    """
    Request body for POST /api/recovery/{id}/execute.

    All three fields are required for idempotent, traceable execution.
    """
    idempotency_key: str = Field(
        description=(
            "Canonical idempotency key: {merchant_id}:{recovery_case_id}:{action_id}. "
            "Must be globally unique per logical action. "
            "Submitting the same key twice returns the original response without side effects."
        ),
        min_length=1,
        max_length=800,
    )
    execution_mode: ExecutionMode = Field(
        description=(
            "LIVE executes against Razorpay production. "
            "SIMULATION executes against the dry-run adapter."
        ),
    )
    correlation_id: str = Field(
        description="Trace ID to propagate through the execution audit chain.",
        min_length=1,
        max_length=255,
    )

    @field_validator("idempotency_key")
    @classmethod
    def idempotency_key_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("idempotency_key must not be blank or whitespace only.")
        return v

    @field_validator("correlation_id")
    @classmethod
    def correlation_id_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("correlation_id must not be blank or whitespace only.")
        return v


class ExecuteResponse(BaseModel):
    """202 Accepted response for an execute request."""
    case_id: uuid.UUID
    idempotency_key: str
    execution_mode: ExecutionMode
    status: str = Field(examples=["accepted"])
    message: str
