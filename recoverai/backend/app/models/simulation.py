"""
RecoverAI v3.2 — Simulation Models

Tables: simulation_runs, simulation_results

simulation_runs: tenant-scoped (merchant_id)
simulation_results: linked to simulation_runs; calculated metrics only (no hardcoded values)
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import CreatedAtMixin, TimestampMixin, new_uuid
from app.models.enums import ExecutionMode

if TYPE_CHECKING:
    from app.models.merchant import Merchant


class SimulationRun(Base, TimestampMixin):
    __tablename__ = "simulation_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    scenario: Mapped[str] = mapped_column(String(255), nullable=False)
    execution_mode: Mapped[ExecutionMode] = mapped_column(
        Enum(ExecutionMode, name="executionmode", create_type=False),
        nullable=False,
        default=ExecutionMode.SIMULATION,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="PENDING")
    configuration: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Relationships ─────────────────────────────────────────────
    merchant: Mapped["Merchant"] = relationship(
        "Merchant", back_populates="simulation_runs", lazy="raise"
    )
    results: Mapped[list["SimulationResult"]] = relationship(
        "SimulationResult",
        back_populates="simulation_run",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    __table_args__ = (
        Index("ix_simulation_runs_merchant_id", "merchant_id"),
        Index("ix_simulation_runs_status", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<SimulationRun id={self.id} scenario={self.scenario!r} "
            f"status={self.status!r}>"
        )


class SimulationResult(Base, CreatedAtMixin):
    """
    Calculated simulation metrics — never hardcoded values.
    Each row represents one metric from a simulation run.
    """

    __tablename__ = "simulation_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    simulation_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("simulation_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    metric_name: Mapped[str] = mapped_column(String(255), nullable=False)
    metric_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    metric_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Relationships ─────────────────────────────────────────────
    simulation_run: Mapped["SimulationRun"] = relationship(
        "SimulationRun", back_populates="results", lazy="raise"
    )

    __table_args__ = (
        Index("ix_simulation_results_run_id", "simulation_run_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<SimulationResult id={self.id} "
            f"metric_name={self.metric_name!r}>"
        )
