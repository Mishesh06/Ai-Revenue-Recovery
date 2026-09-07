"""
RecoverAI v3.2 — AI Decision Model

Global table — not merchant-scoped directly.
Tenant context is available via recovery_case_id → recovery_cases → merchant_id.

Represents the AI system's recommendation output after prediction analysis.
Part of the decision trace chain:
  ModelPrediction → AIDecision → PolicyEvaluation → RecoveryAction
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import CreatedAtMixin, new_uuid

if TYPE_CHECKING:
    from app.models.ml import ModelPrediction
    from app.models.recovery_case import RecoveryCase
    from app.models.agent_run import AgentRun


class AIDecision(Base, CreatedAtMixin):
    __tablename__ = "ai_decisions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    # ── Trace chain links ─────────────────────────────────────────
    prediction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("model_predictions.id", ondelete="SET NULL"),
        nullable=True,
    )
    recovery_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recovery_cases.id", ondelete="RESTRICT"),
        nullable=False,
    )
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agent_runs.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Decision output ───────────────────────────────────────────
    recommendation: Mapped[str] = mapped_column(String(255), nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── Relationships ─────────────────────────────────────────────
    prediction: Mapped["ModelPrediction | None"] = relationship(
        "ModelPrediction", back_populates="ai_decisions", lazy="raise"
    )
    recovery_case: Mapped["RecoveryCase"] = relationship(
        "RecoveryCase", back_populates="ai_decisions", lazy="raise"
    )
    agent_run: Mapped["AgentRun | None"] = relationship(
        "AgentRun", back_populates="ai_decisions", lazy="raise"
    )

    __table_args__ = (
        Index("ix_ai_decisions_recovery_case_id", "recovery_case_id"),
        Index("ix_ai_decisions_prediction_id", "prediction_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<AIDecision id={self.id} recommendation={self.recommendation!r}>"
        )
