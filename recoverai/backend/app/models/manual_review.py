"""
RecoverAI v3.2 — Manual Review Model

Tenant-scoped: merchant_id NOT NULL → merchants(id).
Human-in-the-loop review records for cases flagged by the policy engine.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.recovery_case import RecoveryCase


class ManualReview(Base, TimestampMixin):
    __tablename__ = "manual_reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    recovery_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recovery_cases.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    reviewer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    decision: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="manual_reviews", lazy="raise"
    )
    recovery_case: Mapped["RecoveryCase"] = relationship(
        "RecoveryCase", back_populates="manual_reviews", lazy="raise"
    )

    __table_args__ = (
        Index("ix_manual_reviews_merchant_id", "merchant_id"),
        Index("ix_manual_reviews_case_id", "recovery_case_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<ManualReview id={self.id} decision={self.decision!r} "
            f"reviewer={self.reviewer!r}>"
        )
