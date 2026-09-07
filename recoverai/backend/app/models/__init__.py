"""
RecoverAI v3.2 — Models Package

Importing all models here ensures they are registered with Base.metadata
before Alembic autogenerate or any create_all() call.

The table count is authoritative from Base.metadata.tables — do NOT
maintain a separate hardcoded count.
"""

# ── Core ──────────────────────────────────────────────────────────
from app.models.user import User
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.recovery_opportunity import RecoveryOpportunity
from app.models.ai_decision import AIDecision
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.audit_event import AuditEvent
from app.models.system_event import SystemEvent

# ── Policy ────────────────────────────────────────────────────────
from app.models.policy import Policy, PolicyVersion, PolicyEvaluation

# ── ML ────────────────────────────────────────────────────────────
from app.models.ml import ModelVersion, ModelPrediction, ModelEvaluation

# ── AI ────────────────────────────────────────────────────────────
from app.models.agent_run import AgentRun

# ── Human Review ─────────────────────────────────────────────────
from app.models.manual_review import ManualReview

# ── Simulation ───────────────────────────────────────────────────
from app.models.simulation import SimulationRun, SimulationResult

# ── Enums (re-exported for convenience) ──────────────────────────
from app.models.enums import CaseState, ActionState, AttemptState, ExecutionMode

__all__ = [
    # Core
    "User",
    "Merchant",
    "Customer",
    "Transaction",
    "RecoveryCase",
    "RecoveryOpportunity",
    "AIDecision",
    "RecoveryAction",
    "RecoveryAttempt",
    "AuditEvent",
    "SystemEvent",
    # Policy
    "Policy",
    "PolicyVersion",
    "PolicyEvaluation",
    # ML
    "ModelVersion",
    "ModelPrediction",
    "ModelEvaluation",
    # AI
    "AgentRun",
    # Human Review
    "ManualReview",
    # Simulation
    "SimulationRun",
    "SimulationResult",
    # Enums
    "CaseState",
    "ActionState",
    "AttemptState",
    "ExecutionMode",
]
