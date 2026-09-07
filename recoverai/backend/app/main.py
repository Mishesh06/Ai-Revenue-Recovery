"""
RecoverAI v3.2 — FastAPI Application Entry Point

Phase 3: API Contract.
Registers all route stubs and exception handlers.
No AI/ML, agents, orchestration, or Razorpay integration in this phase.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import (
    agents_router,
    analytics_router,
    audit_router,
    health_router,
    policies_router,
    recovery_router,
    reviews_router,
    simulations_router,
    transactions_router,
)
from app.core.config import settings
from app.core.errors import register_exception_handlers

# Ensure all models are imported so Base.metadata is fully populated
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────
    # Phase 3: no startup tasks beyond configuration validation
    yield
    # ── Shutdown ──────────────────────────────────────────────────
    # Phase 3: no cleanup tasks


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "RecoverAI v3.2 — AI Revenue Recovery Operating System.\n\n"
        "**Phase 3: API Contract.**\n\n"
        "All endpoints are defined with full request/response schemas, validation, "
        "tenant isolation, and error models. Business logic, ML, LLM, Policy Engine, "
        "Orchestrator, and Razorpay adapters are deferred to future phases.\n\n"
        "**Tenant isolation**: include `X-Merchant-ID: <uuid>` header on all "
        "merchant-scoped requests."
    ),
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_tags=[
        {
            "name": "health",
            "description": "Health check and liveness probe.",
        },
        {
            "name": "transactions",
            "description": "Failed transaction records (tenant-scoped).",
        },
        {
            "name": "recovery",
            "description": (
                "Recovery case lifecycle: analyze, recommend, execute "
                "(tenant-scoped, idempotency-safe)."
            ),
        },
        {
            "name": "policies",
            "description": "Merchant recovery policies and deterministic evaluation engine.",
        },
        {
            "name": "agents",
            "description": "AI agent runs and health status (global, not tenant-scoped).",
        },
        {
            "name": "reviews",
            "description": "Human-in-the-loop manual review workflow (tenant-scoped).",
        },
        {
            "name": "simulations",
            "description": "Simulation runs for dry-run scenario testing (tenant-scoped).",
        },
        {
            "name": "analytics",
            "description": "Dashboard KPIs and time-series analytics (tenant-scoped).",
        },
        {
            "name": "audit",
            "description": "Append-only audit event log (tenant-scoped, immutable).",
        },
    ],
)

from fastapi.middleware.cors import CORSMiddleware

# ── CORS Configuration ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon deployment, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ─────────────────────────────────────────────
register_exception_handlers(app)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(transactions_router)
app.include_router(recovery_router)
app.include_router(policies_router)
app.include_router(agents_router)
app.include_router(reviews_router)
app.include_router(simulations_router)
app.include_router(analytics_router)
app.include_router(audit_router)
