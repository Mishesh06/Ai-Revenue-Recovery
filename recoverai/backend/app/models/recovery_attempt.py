"""
RecoverAI v3.2 — Recovery Attempt Model

One Action may have multiple Attempts.
The idempotency_key lives on RecoveryAction — NOT on RecoveryAttempt.
Attempt number is separate from and independent of the idempotency key.

Append-only: uses CreatedAtMixin (no updated_at).
State machine: AttemptState (see enums.py)
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import CreatedAtMixin, new_uuid
from app.models.enums import AttemptState

if TYPE_CHECKING:
    from app.models.recovery_action import RecoveryAction


class RecoveryAttempt(Base, CreatedAtMixin):
    __tablename__ = "recovery_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    recovery_action_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recovery_actions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Monotonically increasing per action; NOT the idempotency key
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[AttemptState] = mapped_column(
        Enum(AttemptState, name="attemptstate", create_type=True),
        nullable=False,
        default=AttemptState.STARTED,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Reference ID from the external adapter (e.g. Razorpay response ID)
    adapter_response_reference: Mapped[str | None] = mapped_column(
        String(512), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────
    recovery_action: Mapped["RecoveryAction"] = relationship(
        "RecoveryAction", back_populates="recovery_attempts", lazy="raise"
    )

    __table_args__ = (
        # Each attempt number is unique per action
        UniqueConstraint(
            "recovery_action_id",
            "attempt_number",
            name="uq_recovery_attempts_action_attempt",
        ),
        Index("ix_recovery_attempts_action_id", "recovery_action_id"),
        Index("ix_recovery_attempts_state", "state"),
    )

    def __repr__(self) -> str:
        return (
            f"<RecoveryAttempt id={self.id} "
            f"attempt_number={self.attempt_number} state={self.state.value}>"
        )
