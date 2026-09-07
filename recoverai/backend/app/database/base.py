"""
RecoverAI v3.2 — SQLAlchemy Declarative Base

Single shared Base for all ORM models.
Import this in every model file to register the model with metadata.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for all RecoverAI ORM models."""
    pass
