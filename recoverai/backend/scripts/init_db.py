"""
RecoverAI v3.2 — Database Initialization Script

Creates all tables using SQLAlchemy metadata.
Use this instead of alembic for the initial schema creation.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

# Import all models to populate Base.metadata
import app.models  # noqa: F401
from app.database.base import Base
from app.core.config import settings


async def init_db():
    print(f"Connecting to: {settings.database_url}")
    engine = create_async_engine(settings.database_url, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("\n✅ All tables created successfully!")


if __name__ == "__main__":
    asyncio.run(init_db())
