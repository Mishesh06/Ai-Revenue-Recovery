"""
RecoverAI v3.2 — Recovery Action Model

Tenant-scoped: merchant_id NOT NULL → merchants(id).

IDEMPOTENCY RULE (canonical RecoverAI definition):
  idempotency_key = f"{merchant_id}:{recovery_case_id}:{action_id}"

  - action_id: string identifier for the action type (e.g. "RETRY_PAYMENT")
  - One logical action maps to exactly one idempotency_key
  - The same key is reused across all Attempts of that Action
  - UNIQUE constraint enforced at the DB level
  - Retrying an action creates a new RecoveryAttempt, NOT a new RecoveryAction

State machine: ActionState (see enums.py)
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin, new_uuid
from app.models.enums import ActionState, ExecutionMode

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.recovery_case import RecoveryCase
    from app.models.policy import PolicyEvaluation
    from app.models.recovery_attempt import RecoveryAttempt


class RecoveryAction(Base, TimestampMixin):
    __tablename__ = "recovery_actions"

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
    # String identifier for the action type (e.g. "RETRY_PAYMENT", "SEND_LINK")
    # This is the third component of the idempotency_key
    action_id: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[ActionState] = mapped_column(
        Enum(ActionState, name="actionstate", create_type=True),
        nullable=False,
        default=ActionState.PROPOSED,
    )
    execution_mode: Mapped[ExecutionMode] = mapped_column(
        Enum(ExecutionMode, name="executionmode", create_type=True),
        nullable=False,
        default=ExecutionMode.LIVE,
    )
    # Canonical idempotency key: "{merchant_id}:{recovery_case_id}:{action_id}"
    # Enforced UNIQUE at DB level — application MUST populate before insert
    idempotency_key: Mapped[str] = mapped_column(
        String(800), nullable=False, unique=True
    )
    # ── Trace chain links ─────────────────────────────────────────
    policy_evaluation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("policy_evaluations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="recovery_actions", lazy="raise"
    )
    recovery_case: Mapped["RecoveryCase"] = relationship(
        "RecoveryCase", back_populates="recovery_actions", lazy="raise"
    )
    policy_evaluation: Mapped["PolicyEvaluation | None"] = relationship(
        "PolicyEvaluation", back_populates="recovery_actions", lazy="raise"
    )
    recovery_attempts: Mapped[list["RecoveryAttempt"]] = relationship(
        "RecoveryAttempt",
        back_populates="recovery_action",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_recovery_actions_idempotency_key"),
        Index("ix_recovery_actions_merchant_id", "merchant_id"),
        Index("ix_recovery_actions_case_id", "recovery_case_id"),
        Index("ix_recovery_actions_state", "state"),
        Index("ix_recovery_actions_idempotency_key", "idempotency_key"),
    )

    def __repr__(self) -> str:
        return (
            f"<RecoveryAction id={self.id} action_id={self.action_id!r} "
            f"state={self.state.value}>"
        )
