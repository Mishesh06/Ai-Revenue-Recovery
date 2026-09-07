"""
RecoverAI v3.2 — Policy Models

Tables: policies, policy_versions, policy_evaluations

policies / policy_versions: tenant-scoped (merchant_id)
policy_evaluations: linked to recovery_case (tenant context via FK chain)

The Policy Engine is deterministic and versioned.
No LLM logic belongs in these models.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import CreatedAtMixin, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.recovery_case import RecoveryCase
    from app.models.recovery_action import RecoveryAction


class Policy(Base, TimestampMixin):
    """Tenant-scoped policy definition."""

    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # ── Relationships ─────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="policies", lazy="raise"
    )
    versions: Mapped[list["PolicyVersion"]] = relationship(
        "PolicyVersion",
        back_populates="policy",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    evaluations: Mapped[list["PolicyEvaluation"]] = relationship(
        "PolicyEvaluation", back_populates="policy", lazy="raise"
    )

    __table_args__ = (
        Index("ix_policies_merchant_id", "merchant_id"),
    )

    def __repr__(self) -> str:
        return f"<Policy id={self.id} name={self.name!r}>"


class PolicyVersion(Base, CreatedAtMixin):
    """
    Versioned snapshot of a policy's rules.

    Append-only — rules are immutable once a version is published.
    """

    __tablename__ = "policy_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("policies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    rules: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Relationships ─────────────────────────────────────────────
    policy: Mapped["Policy"] = relationship(
        "Policy", back_populates="versions", lazy="raise"
    )

    __table_args__ = (
        UniqueConstraint("policy_id", "version", name="uq_policy_versions_policy_version"),
        Index("ix_policy_versions_policy_id", "policy_id"),
    )

    def __repr__(self) -> str:
        return f"<PolicyVersion policy_id={self.policy_id} version={self.version}>"


class PolicyEvaluation(Base, CreatedAtMixin):
    """
    Immutable record of a single policy evaluation run.
    Part of the decision trace chain.
    """

    __tablename__ = "policy_evaluations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("policies.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Stored as integer; matches PolicyVersion.version
    policy_version: Mapped[int] = mapped_column(Integer, nullable=False)
    recovery_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recovery_cases.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ── Evaluation output ─────────────────────────────────────────
    decision: Mapped[str] = mapped_column(String(64), nullable=False)  # APPROVED / REJECTED / MANUAL_REVIEW
    reason_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    requires_human_review: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    evaluation_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Relationships ─────────────────────────────────────────────
    policy: Mapped["Policy"] = relationship(
        "Policy", back_populates="evaluations", lazy="raise"
    )
    recovery_case: Mapped["RecoveryCase"] = relationship(
        "RecoveryCase", back_populates="policy_evaluations", lazy="raise"
    )
    recovery_actions: Mapped[list["RecoveryAction"]] = relationship(
        "RecoveryAction", back_populates="policy_evaluation", lazy="raise"
    )

    __table_args__ = (
        Index("ix_policy_evaluations_policy_id", "policy_id"),
        Index("ix_policy_evaluations_case_id", "recovery_case_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<PolicyEvaluation id={self.id} decision={self.decision!r} "
            f"policy_version={self.policy_version}>"
        )
