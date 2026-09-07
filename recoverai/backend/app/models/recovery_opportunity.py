"""
RecoverAI v3.2 — Recovery Opportunity Model

Tenant-scoped: merchant_id NOT NULL → merchants(id).
Represents a detected window of opportunity to recover a failed payment.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.transaction import Transaction
    from app.models.recovery_case import RecoveryCase


class RecoveryOpportunity(Base, TimestampMixin):
    __tablename__ = "recovery_opportunities"

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
    recovery_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recovery_cases.id", ondelete="SET NULL"),
        nullable=True,
    )
    opportunity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    detected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # ── Relationships ────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="recovery_opportunities", lazy="raise"
    )
    transaction: Mapped["Transaction"] = relationship(
        "Transaction", back_populates="recovery_opportunities", lazy="raise"
    )
    recovery_case: Mapped["RecoveryCase | None"] = relationship(
        "RecoveryCase", back_populates="recovery_opportunities", lazy="raise"
    )

    __table_args__ = (
        Index("ix_recovery_opportunities_merchant_id", "merchant_id"),
        Index("ix_recovery_opportunities_transaction_id", "transaction_id"),
        Index("ix_recovery_opportunities_case_id", "recovery_case_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<RecoveryOpportunity id={self.id} "
            f"score={self.opportunity_score}>"
        )
