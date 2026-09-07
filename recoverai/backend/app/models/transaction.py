"""
RecoverAI v3.2 — Transaction Model

Tenant-scoped: merchant_id NOT NULL → merchants(id).
Root entity of the decision trace chain.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.customer import Customer
    from app.models.recovery_case import RecoveryCase
    from app.models.recovery_opportunity import RecoveryOpportunity
    from app.models.ml import ModelPrediction
    from app.models.audit_event import AuditEvent


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Identifier from the payment gateway
    external_transaction_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR"
    )
    status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gateway_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="transactions", lazy="raise"
    )
    customer: Mapped["Customer | None"] = relationship(
        "Customer", back_populates="transactions", lazy="raise"
    )
    recovery_cases: Mapped[list["RecoveryCase"]] = relationship(
        "RecoveryCase", back_populates="transaction", lazy="raise"
    )
    recovery_opportunities: Mapped[list["RecoveryOpportunity"]] = relationship(
        "RecoveryOpportunity", back_populates="transaction", lazy="raise"
    )
    model_predictions: Mapped[list["ModelPrediction"]] = relationship(
        "ModelPrediction", back_populates="transaction", lazy="raise"
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="transaction", lazy="raise"
    )

    __table_args__ = (
        Index("ix_transactions_merchant_id", "merchant_id"),
        Index("ix_transactions_customer_id", "customer_id"),
        Index(
            "ix_transactions_external_id", "merchant_id", "external_transaction_id"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Transaction id={self.id} merchant_id={self.merchant_id} "
            f"amount={self.amount} {self.currency}>"
        )
