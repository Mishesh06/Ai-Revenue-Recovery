"""
RecoverAI v3.2 — ML Models

Tables: model_versions, model_predictions, model_evaluations

model_versions and model_evaluations are GLOBAL — no merchant_id.
model_predictions links to transactions and recovery_cases for traceability.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import CreatedAtMixin, new_uuid

if TYPE_CHECKING:
    from app.models.transaction import Transaction
    from app.models.recovery_case import RecoveryCase
    from app.models.ai_decision import AIDecision


class ModelVersion(Base, CreatedAtMixin):
    """
    Global model registry — not merchant-scoped.
    Tracks ML model artifacts and their metadata.
    """

    __tablename__ = "model_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(64), nullable=False)
    framework: Mapped[str | None] = mapped_column(String(128), nullable=True)
    artifact_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Relationships ─────────────────────────────────────────────
    predictions: Mapped[list["ModelPrediction"]] = relationship(
        "ModelPrediction", back_populates="model_version", lazy="raise"
    )
    evaluations: Mapped[list["ModelEvaluation"]] = relationship(
        "ModelEvaluation",
        back_populates="model_version",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint("model_name", "version", name="uq_model_versions_name_version"),
    )

    def __repr__(self) -> str:
        return f"<ModelVersion {self.model_name!r} v{self.version}>"


class ModelPrediction(Base, CreatedAtMixin):
    """
    Immutable prediction record — one per transaction inference run.
    Links into the decision trace chain via transaction_id and recovery_case_id.
    """

    __tablename__ = "model_predictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    model_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("model_versions.id", ondelete="SET NULL"),
        nullable=True,
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
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    prediction_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Relationships ─────────────────────────────────────────────
    model_version: Mapped["ModelVersion | None"] = relationship(
        "ModelVersion", back_populates="predictions", lazy="raise"
    )
    transaction: Mapped["Transaction"] = relationship(
        "Transaction", back_populates="model_predictions", lazy="raise"
    )
    recovery_case: Mapped["RecoveryCase | None"] = relationship(
        "RecoveryCase", back_populates="model_predictions", lazy="raise"
    )
    ai_decisions: Mapped[list["AIDecision"]] = relationship(
        "AIDecision", back_populates="prediction", lazy="raise"
    )

    __table_args__ = (
        Index("ix_model_predictions_transaction_id", "transaction_id"),
        Index("ix_model_predictions_case_id", "recovery_case_id"),
        Index("ix_model_predictions_model_version_id", "model_version_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<ModelPrediction id={self.id} "
            f"probability={self.probability} confidence={self.confidence}>"
        )


class ModelEvaluation(Base, CreatedAtMixin):
    """
    Global model performance evaluation — not merchant-scoped.
    """

    __tablename__ = "model_evaluations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    model_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("model_versions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    precision: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall: Mapped[float | None] = mapped_column(Float, nullable=True)
    f1: Mapped[float | None] = mapped_column(Float, nullable=True)
    roc_auc: Mapped[float | None] = mapped_column(Float, nullable=True)
    confusion_matrix: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    evaluation_dataset: Mapped[str | None] = mapped_column(String(512), nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────
    model_version: Mapped["ModelVersion"] = relationship(
        "ModelVersion", back_populates="evaluations", lazy="raise"
    )

    __table_args__ = (
        Index("ix_model_evaluations_model_version_id", "model_version_id"),
    )

    def __repr__(self) -> str:
        return f"<ModelEvaluation id={self.id} f1={self.f1}>"
