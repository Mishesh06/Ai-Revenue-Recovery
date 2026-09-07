"""
RecoverAI v3.2 — Policy DTOs

Covers:
  GET  /api/policies          → PolicyOut (list)
  POST /api/policies/evaluate → PolicyEvaluateRequest / PolicyEvaluateResponse
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Policy ────────────────────────────────────────────────────────────────────

class PolicyVersionOut(BaseModel):
    """Wire representation of a PolicyVersion record."""
    id: uuid.UUID
    policy_id: uuid.UUID
    version: int
    rules: dict[str, Any]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PolicyOut(BaseModel):
    """Wire representation of a Policy record (without embedded versions)."""
    id: uuid.UUID
    merchant_id: uuid.UUID
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── PolicyEvaluation ──────────────────────────────────────────────────────────

class PolicyEvaluationOut(BaseModel):
    """Wire representation of a PolicyEvaluation record."""
    id: uuid.UUID
    policy_id: uuid.UUID
    policy_version: int
    recovery_case_id: uuid.UUID
    decision: str = Field(description="APPROVED | REVIEW | BLOCKED")
    reason_code: str | None = None
    reason: str | None = None
    risk_level: str | None = None
    requires_human_review: bool
    evaluated_at: datetime
    evaluation_data: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


# ── POST /policies/evaluate ───────────────────────────────────────────────────

class PolicyEvaluateRequest(BaseModel):
    """
    Request body for POST /api/policies/evaluate.

    Phase 3 stub — Policy Engine implementation deferred to a future phase.
    """
    recovery_case_id: uuid.UUID = Field(
        description="The recovery case to evaluate policies against."
    )
    context: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Additional context data to pass to the policy engine "
            "(e.g. customer risk score, transaction metadata)."
        ),
    )


class PolicyEvaluateResponse(BaseModel):
    """Response from POST /api/policies/evaluate."""
    recovery_case_id: uuid.UUID
    decision: str = Field(
        description="Policy engine decision: APPROVED | REVIEW | BLOCKED",
        examples=["APPROVED"],
    )
    reason_code: str | None = Field(default=None, description="Short machine-readable reason code.")
    reason: str | None = Field(default=None, description="Human-readable explanation of the decision.")
    risk_level: str | None = Field(default=None, description="Risk classification: LOW | MEDIUM | HIGH")
    requires_human_review: bool = Field(
        default=False,
        description="True when the policy engine escalates to manual review.",
    )
    message: str = Field(
        default="Policy evaluation accepted — engine deferred to future phase.",
        description="Informational message about this stub response.",
    )
