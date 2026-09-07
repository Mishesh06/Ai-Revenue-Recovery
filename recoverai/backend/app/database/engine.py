"""
RecoverAI v3.2 — Async SQLAlchemy Engine

Creates a single async engine from DATABASE_URL.
All sessions are derived from this engine.
"""

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from app.core.config import settings

# ── Production engine ────────────────────────────────────────────
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use
)
