"""
RecoverAI v3.2 — Manual Review DTOs

Covers:
  GET  /api/reviews      → ManualReviewOut (list, tenant-scoped)
  POST /api/reviews/{id} → ManualReviewDecisionRequest / ManualReviewDecisionResponse
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ── Review decision values ────────────────────────────────────────────────────
ReviewDecision = Literal["APPROVED", "REJECTED", "ESCALATED"]


class ManualReviewOut(BaseModel):
    """Wire representation of a ManualReview record."""
    id: uuid.UUID
    merchant_id: uuid.UUID
    recovery_case_id: uuid.UUID
    reason: str = Field(description="Why this case was flagged for manual review.")
    reviewer: str | None = Field(default=None, description="Identifier of the reviewer (email or ID).")
    decision: str | None = Field(default=None, description="Review decision: APPROVED | REJECTED | ESCALATED")
    timestamp: datetime
    comment: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ManualReviewDecisionRequest(BaseModel):
    """
    Request body for POST /api/reviews/{id}.

    Submits a human decision on a flagged recovery case.
    """
    decision: ReviewDecision = Field(
        description="The reviewer's decision: APPROVED | REJECTED | ESCALATED",
    )
    reviewer: str = Field(
        description="Identifier of the person submitting this review (email or employee ID).",
        min_length=1,
        max_length=255,
    )
    comment: str | None = Field(
        default=None,
        description="Optional human-readable notes about the decision.",
        max_length=4000,
    )


class ManualReviewDecisionResponse(BaseModel):
    """Response for POST /api/reviews/{id}."""
    review_id: uuid.UUID
    recovery_case_id: uuid.UUID
    decision: str
    reviewer: str
    status: str = Field(examples=["accepted"])
    message: str
