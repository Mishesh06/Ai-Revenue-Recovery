"""
RecoverAI v3.2 — Merchant Model

Root tenant entity. All merchant-scoped tables reference this via merchant_id FK.
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.transaction import Transaction
    from app.models.recovery_case import RecoveryCase
    from app.models.recovery_opportunity import RecoveryOpportunity
    from app.models.policy import Policy
    from app.models.recovery_action import RecoveryAction
    from app.models.audit_event import AuditEvent
    from app.models.manual_review import ManualReview
    from app.models.simulation import SimulationRun


class Merchant(Base, TimestampMixin):
    __tablename__ = "merchants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[str | None] = mapped_column(String(512), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Relationships ────────────────────────────────────────────
    customers: Mapped[list["Customer"]] = relationship(
        "Customer", back_populates="merchant", lazy="raise"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="merchant", lazy="raise"
    )
    recovery_cases: Mapped[list["RecoveryCase"]] = relationship(
        "RecoveryCase", back_populates="merchant", lazy="raise"
    )
    recovery_opportunities: Mapped[list["RecoveryOpportunity"]] = relationship(
        "RecoveryOpportunity", back_populates="merchant", lazy="raise"
    )
    policies: Mapped[list["Policy"]] = relationship(
        "Policy", back_populates="merchant", lazy="raise"
    )
    recovery_actions: Mapped[list["RecoveryAction"]] = relationship(
        "RecoveryAction", back_populates="merchant", lazy="raise"
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="merchant", lazy="raise"
    )
    manual_reviews: Mapped[list["ManualReview"]] = relationship(
        "ManualReview", back_populates="merchant", lazy="raise"
    )
    simulation_runs: Mapped[list["SimulationRun"]] = relationship(
        "SimulationRun", back_populates="merchant", lazy="raise"
    )

    __table_args__ = (
        Index("ix_merchants_api_key", "api_key"),
    )

    def __repr__(self) -> str:
        return f"<Merchant id={self.id} name={self.name!r}>"
