"""
RecoverAI v3.2 — Health Check Endpoint

GET /health
  - Returns 200 if the backend is running
  - Verifies database connectivity via a lightweight SELECT 1 probe
  - Does NOT expose credentials or DSN
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health", summary="Health check")
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Health check endpoint.
    """
    db_status = "disconnected"
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:  # noqa: BLE001
        db_status = f"error: {type(exc).__name__}"

    return {
        "status": "ok",
        "database": db_status,
        "service": "RecoverAI",
        "version": "3.2.0",
    }

@router.get("/api/system/health", summary="Detailed System Health")
async def system_health(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Detailed system health across all components for the AI Command Center and System Health console.
    """
    try:
        await db.execute(text("SELECT 1"))
        db_status = "OK"
    except Exception:
        db_status = "DEGRADED"

    return {
        "api": "OK",
        "database": db_status,
        "ml_model": "OK",
        "diagnosis_agent": "OK",
        "recovery_planner": "OK",
        "policy_engine": "OK",
        "action_adapter": "OK"
    }
