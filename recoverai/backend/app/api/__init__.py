"""
RecoverAI v3.2 — API Package

All routers are registered here so main.py imports from a single location.
"""

from app.api.auth import router as auth_router
from app.api.agents import router as agents_router
from app.api.analytics import router as analytics_router
from app.api.audit import router as audit_router
from app.api.health import router as health_router
from app.api.policies import router as policies_router
from app.api.recovery import router as recovery_router
from app.api.reviews import router as reviews_router
from app.api.simulations import router as simulations_router
from app.api.transactions import router as transactions_router

__all__ = [
    "auth_router",
    "agents_router",
    "analytics_router",
    "audit_router",
    "health_router",
    "policies_router",
    "recovery_router",
    "reviews_router",
    "simulations_router",
    "transactions_router",
]
