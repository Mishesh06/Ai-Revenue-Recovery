"""
RecoverAI v3.2 — Audit Event Model

APPEND-ONLY table — no updated_at column.
Application layer MUST NOT update or delete audit records.

Tenant-scoped: merchant_id NOT NULL → merchants(id).
Immutable event log of all significant recovery workflow events.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import new_uuid

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.recovery_case import RecoveryCase
    from app.models.transaction import Transaction


# ── Canonical audit event types ──────────────────────────────────
AUDIT_EVENT_TYPES = frozenset(
    {
        "PaymentFailed",
        "OpportunityDetected",
        "PredictionCreated",
        "DiagnosisCreated",
        "RecoveryPlanned",
        "PolicyEvaluated",
        "RecoveryApproved",
        "RecoveryExecuted",
        "RecoverySucceeded",
        "RecoveryFailed",
        "RecoveryWindowExpired",
        "ManualReviewCreated",
        "CaseClosed",
    }
)


class AuditEvent(Base):
    """
    Append-only event log.

    Intentionally omits updated_at to reinforce immutability.
    Do NOT add update/delete methods to the service layer for this model.
    """

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Shared trace identifier for the recovery case lifecycle
    correlation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    recovery_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recovery_cases.id", ondelete="SET NULL"),
        nullable=True,
    )
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    event_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Use server-side now() so the timestamp is always authoritative
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="audit_events", lazy="raise"
    )
    recovery_case: Mapped["RecoveryCase | None"] = relationship(
        "RecoveryCase", back_populates="audit_events", lazy="raise"
    )
    transaction: Mapped["Transaction | None"] = relationship(
        "Transaction", back_populates="audit_events", lazy="raise"
    )

    __table_args__ = (
        Index("ix_audit_events_merchant_id", "merchant_id"),
        Index("ix_audit_events_correlation_id", "correlation_id"),
        Index("ix_audit_events_recovery_case_id", "recovery_case_id"),
        Index("ix_audit_events_transaction_id", "transaction_id"),
        Index("ix_audit_events_event_type", "event_type"),
        Index("ix_audit_events_timestamp", "timestamp"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuditEvent id={self.id} event_type={self.event_type!r} "
            f"correlation_id={self.correlation_id!r}>"
        )
