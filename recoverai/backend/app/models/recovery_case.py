"""
RecoverAI v3.2 — Recovery Case Model

Central entity of the recovery workflow.
Tenant-scoped: merchant_id NOT NULL → merchants(id).

State machine: CaseState (see enums.py)
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin, new_uuid
from app.models.enums import CaseState

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.transaction import Transaction
    from app.models.recovery_opportunity import RecoveryOpportunity
    from app.models.ai_decision import AIDecision
    from app.models.recovery_action import RecoveryAction
    from app.models.audit_event import AuditEvent
    from app.models.manual_review import ManualReview
    from app.models.ml import ModelPrediction
    from app.models.policy import PolicyEvaluation


class RecoveryCase(Base, TimestampMixin):
    __tablename__ = "recovery_cases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    state: Mapped[CaseState] = mapped_column(
        Enum(CaseState, name="casestate", create_type=True),
        nullable=False,
        default=CaseState.DETECTED,
    )
    # Unique trace identifier shared across all events for this case
    correlation_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    recovery_window_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    recovery_window_ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    recovered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="recovery_cases", lazy="raise"
    )
    transaction: Mapped["Transaction"] = relationship(
        "Transaction", back_populates="recovery_cases", lazy="raise"
    )
    recovery_opportunities: Mapped[list["RecoveryOpportunity"]] = relationship(
        "RecoveryOpportunity", back_populates="recovery_case", lazy="raise"
    )
    ai_decisions: Mapped[list["AIDecision"]] = relationship(
        "AIDecision", back_populates="recovery_case", lazy="raise"
    )
    recovery_actions: Mapped[list["RecoveryAction"]] = relationship(
        "RecoveryAction", back_populates="recovery_case", lazy="raise"
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="recovery_case", lazy="raise"
    )
    manual_reviews: Mapped[list["ManualReview"]] = relationship(
        "ManualReview", back_populates="recovery_case", lazy="raise"
    )
    model_predictions: Mapped[list["ModelPrediction"]] = relationship(
        "ModelPrediction", back_populates="recovery_case", lazy="raise"
    )
    policy_evaluations: Mapped[list["PolicyEvaluation"]] = relationship(
        "PolicyEvaluation", back_populates="recovery_case", lazy="raise"
    )

    __table_args__ = (
        Index("ix_recovery_cases_merchant_id", "merchant_id"),
        Index("ix_recovery_cases_transaction_id", "transaction_id"),
        Index("ix_recovery_cases_state", "state"),
        Index("ix_recovery_cases_correlation_id", "correlation_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<RecoveryCase id={self.id} state={self.state.value} "
            f"correlation_id={self.correlation_id!r}>"
        )
