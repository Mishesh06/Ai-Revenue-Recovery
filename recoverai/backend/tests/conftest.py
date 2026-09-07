"""
RecoverAI v3.2 — Pytest Configuration

Provides:
  - db_engine: async SQLAlchemy engine for the test database
  - db_session: async session for tests that need DB access
  - Graceful skip if TEST_DATABASE_URL / DATABASE_URL is not reachable
"""

import os
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

# ── Import all models so Base.metadata is fully populated ─────────
import app.models  # noqa: F401
from app.database.base import Base


def get_test_db_url() -> str:
    """Return the test database URL, falling back to the main DB URL."""
    return os.getenv("TEST_DATABASE_URL", settings.test_database_url)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """
    Session-scoped async engine pointed at the test database.
    Creates all tables before tests and drops them after.
    Skips the entire session if the DB is not reachable.
    """
    url = get_test_db_url()
    engine = create_async_engine(url, echo=False, poolclass=NullPool)

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        pytest.skip(
            f"Test database not reachable ({url!r}). "
            f"Set TEST_DATABASE_URL to run integration tests. Error: {exc}"
        )

    yield engine

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
    except Exception:
        pass

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncSession:
    """
    Function-scoped async session for tests.
    """
    session_factory = async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()

