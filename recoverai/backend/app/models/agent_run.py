"""
RecoverAI v3.2 — Agent Run Model

Global table — NOT tenant-scoped.
Tracks execution of AI agents (both LLM and rule-based fallback).
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import new_uuid

if TYPE_CHECKING:
    from app.models.ai_decision import AIDecision


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    agent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_version: Mapped[str] = mapped_column(String(64), nullable=False)
    # Reference pointer to the input (e.g. an S3 key or case ID), not raw input data
    input_reference: Mapped[str | None] = mapped_column(String(512), nullable=True)
    output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    # Execution latency in milliseconds
    latency: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────
    ai_decisions: Mapped[list["AIDecision"]] = relationship(
        "AIDecision", back_populates="agent_run", lazy="raise"
    )

    __table_args__ = (
        Index("ix_agent_runs_agent_name", "agent_name"),
        Index("ix_agent_runs_status", "status"),
        Index("ix_agent_runs_timestamp", "timestamp"),
    )

    def __repr__(self) -> str:
        return (
            f"<AgentRun id={self.id} agent_name={self.agent_name!r} "
            f"status={self.status!r}>"
        )
