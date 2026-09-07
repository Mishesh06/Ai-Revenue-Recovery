"""
RecoverAI v3.2 — Audit Event DTOs

Covers:
  GET /api/audit       → AuditEventOut (list, tenant-scoped)
  GET /api/audit/{id}  → AuditEventOut (detail, tenant-scoped)

Audit events are immutable — no write DTOs exist.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AuditEventOut(BaseModel):
    """
    Wire representation of an AuditEvent record.

    Immutable — audit events are append-only and are never updated.
    """
    id: uuid.UUID
    merchant_id: uuid.UUID
    correlation_id: str = Field(description="Shared trace ID linking all events for a case.")
    recovery_case_id: uuid.UUID | None = None
    transaction_id: uuid.UUID | None = None
    event_type: str = Field(
        description=(
            "Canonical event type. One of: PaymentFailed, OpportunityDetected, "
            "PredictionCreated, DiagnosisCreated, RecoveryPlanned, PolicyEvaluated, "
            "RecoveryApproved, RecoveryExecuted, RecoverySucceeded, RecoveryFailed, "
            "RecoveryWindowExpired, ManualReviewCreated, CaseClosed."
        )
    )
    event_data: dict[str, Any] | None = Field(
        default=None,
        description="Structured event payload (varies by event_type).",
    )
    timestamp: datetime = Field(description="Server-authoritative event timestamp (UTC).")

    model_config = {"from_attributes": True}
