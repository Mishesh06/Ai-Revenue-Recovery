"""
RecoverAI v3.2 — System Event Model

Global table — NOT tenant-scoped.
Infrastructure-level events (health, startup, migrations, background jobs).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import new_uuid


class SystemEvent(Base):
    __tablename__ = "system_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_system_events_event_type", "event_type"),
        Index("ix_system_events_timestamp", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<SystemEvent id={self.id} event_type={self.event_type!r}>"
