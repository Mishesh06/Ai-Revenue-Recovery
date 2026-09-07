"""
RecoverAI v3.2 — Customer Model

Tenant-scoped: merchant_id NOT NULL → merchants(id).
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.transaction import Transaction


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Customer identifier in the merchant's own system
    external_customer_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata", JSONB, nullable=True
    )

    # ── Relationships ────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="customers", lazy="raise"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="customer", lazy="raise"
    )

    __table_args__ = (
        Index("ix_customers_merchant_id", "merchant_id"),
        Index("ix_customers_external_id", "merchant_id", "external_customer_id"),
    )

    def __repr__(self) -> str:
        return f"<Customer id={self.id} merchant_id={self.merchant_id}>"
