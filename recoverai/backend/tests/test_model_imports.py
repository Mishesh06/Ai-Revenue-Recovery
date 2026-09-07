"""
Test: All models are importable without errors.

These tests do NOT require a database connection.
They verify module structure and import resolution.
"""

import importlib


def test_import_enums():
    mod = importlib.import_module("app.models.enums")
    assert hasattr(mod, "CaseState")
    assert hasattr(mod, "ActionState")
    assert hasattr(mod, "AttemptState")
    assert hasattr(mod, "ExecutionMode")


def test_import_user():
    mod = importlib.import_module("app.models.user")
    assert hasattr(mod, "User")


def test_import_merchant():
    mod = importlib.import_module("app.models.merchant")
    assert hasattr(mod, "Merchant")


def test_import_customer():
    mod = importlib.import_module("app.models.customer")
    assert hasattr(mod, "Customer")


def test_import_transaction():
    mod = importlib.import_module("app.models.transaction")
    assert hasattr(mod, "Transaction")


def test_import_recovery_case():
    mod = importlib.import_module("app.models.recovery_case")
    assert hasattr(mod, "RecoveryCase")


def test_import_recovery_opportunity():
    mod = importlib.import_module("app.models.recovery_opportunity")
    assert hasattr(mod, "RecoveryOpportunity")


def test_import_ai_decision():
    mod = importlib.import_module("app.models.ai_decision")
    assert hasattr(mod, "AIDecision")


def test_import_recovery_action():
    mod = importlib.import_module("app.models.recovery_action")
    assert hasattr(mod, "RecoveryAction")


def test_import_recovery_attempt():
    mod = importlib.import_module("app.models.recovery_attempt")
    assert hasattr(mod, "RecoveryAttempt")


def test_import_audit_event():
    mod = importlib.import_module("app.models.audit_event")
    assert hasattr(mod, "AuditEvent")


def test_import_system_event():
    mod = importlib.import_module("app.models.system_event")
    assert hasattr(mod, "SystemEvent")


def test_import_policy():
    mod = importlib.import_module("app.models.policy")
    assert hasattr(mod, "Policy")
    assert hasattr(mod, "PolicyVersion")
    assert hasattr(mod, "PolicyEvaluation")


def test_import_ml():
    mod = importlib.import_module("app.models.ml")
    assert hasattr(mod, "ModelVersion")
    assert hasattr(mod, "ModelPrediction")
    assert hasattr(mod, "ModelEvaluation")


def test_import_agent_run():
    mod = importlib.import_module("app.models.agent_run")
    assert hasattr(mod, "AgentRun")


def test_import_manual_review():
    mod = importlib.import_module("app.models.manual_review")
    assert hasattr(mod, "ManualReview")


def test_import_simulation():
    mod = importlib.import_module("app.models.simulation")
    assert hasattr(mod, "SimulationRun")
    assert hasattr(mod, "SimulationResult")


def test_models_package_imports_all():
    """The models __init__ must import everything without error."""
    import app.models as models  # noqa: F401
    from app.models import (
        User, Merchant, Customer, Transaction,
        RecoveryCase, RecoveryOpportunity, AIDecision,
        RecoveryAction, RecoveryAttempt, AuditEvent, SystemEvent,
        Policy, PolicyVersion, PolicyEvaluation,
        ModelVersion, ModelPrediction, ModelEvaluation,
        AgentRun, ManualReview, SimulationRun, SimulationResult,
    )
    # All 21 model classes must be importable
    classes = [
        User, Merchant, Customer, Transaction,
        RecoveryCase, RecoveryOpportunity, AIDecision,
        RecoveryAction, RecoveryAttempt, AuditEvent, SystemEvent,
        Policy, PolicyVersion, PolicyEvaluation,
        ModelVersion, ModelPrediction, ModelEvaluation,
        AgentRun, ManualReview, SimulationRun, SimulationResult,
    ]
    assert len(classes) == 21


def test_base_metadata_table_count():
    """
    Table count is authoritative from Base.metadata — NOT a hardcoded assertion.
    This prints the actual count for verification.
    """
    import app.models  # noqa: F401
    from app.database.base import Base

    tables = list(Base.metadata.tables.keys())
    print(f"\n[INFO] Tables registered in Base.metadata ({len(tables)}): {sorted(tables)}")
    # Must have at least 20 tables (Phase 1 minimum)
    assert len(tables) >= 20, (
        f"Expected at least 20 tables, got {len(tables)}: {tables}"
    )
