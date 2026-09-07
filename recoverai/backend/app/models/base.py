"""
RecoverAI v3.2 — ORM Mixins

Reusable column mixins for all models.
Import into individual model files; do NOT import Base here to avoid
circular dependency.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Adds created_at / updated_at columns with DB-side defaults."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CreatedAtMixin:
    """
    Adds only created_at — used for append-only / immutable records
    (e.g., audit_events, recovery_attempts).
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


def new_uuid() -> uuid.UUID:
    """Default factory for UUID primary keys."""
    return uuid.uuid4()
