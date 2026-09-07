"""
Test: Foreign-key relationships are correctly declared on models.

Verifies via SQLAlchemy mapper inspection (no DB required).
"""

import app.models  # noqa: F401
from app.database.base import Base
from sqlalchemy import inspect as sa_inspect


def get_fk_targets(table_name: str) -> set[str]:
    """Return the set of target table names referenced by FKs from this table."""
    table = Base.metadata.tables[table_name]
    return {fk.column.table.name for fk in table.foreign_keys}


class TestForeignKeyRelationships:
    def test_customer_references_merchant(self):
        assert "merchants" in get_fk_targets("customers")

    def test_transaction_references_merchant(self):
        assert "merchants" in get_fk_targets("transactions")

    def test_transaction_references_customer(self):
        assert "customers" in get_fk_targets("transactions")

    def test_recovery_case_references_merchant(self):
        assert "merchants" in get_fk_targets("recovery_cases")

    def test_recovery_case_references_transaction(self):
        assert "transactions" in get_fk_targets("recovery_cases")

    def test_recovery_opportunity_references_merchant(self):
        assert "merchants" in get_fk_targets("recovery_opportunities")

    def test_recovery_opportunity_references_transaction(self):
        assert "transactions" in get_fk_targets("recovery_opportunities")

    def test_ai_decision_references_recovery_case(self):
        assert "recovery_cases" in get_fk_targets("ai_decisions")

    def test_ai_decision_references_model_prediction(self):
        assert "model_predictions" in get_fk_targets("ai_decisions")

    def test_ai_decision_references_agent_run(self):
        assert "agent_runs" in get_fk_targets("ai_decisions")

    def test_recovery_action_references_merchant(self):
        assert "merchants" in get_fk_targets("recovery_actions")

    def test_recovery_action_references_recovery_case(self):
        assert "recovery_cases" in get_fk_targets("recovery_actions")

    def test_recovery_action_references_policy_evaluation(self):
        assert "policy_evaluations" in get_fk_targets("recovery_actions")

    def test_recovery_attempt_references_recovery_action(self):
        assert "recovery_actions" in get_fk_targets("recovery_attempts")

    def test_audit_event_references_merchant(self):
        assert "merchants" in get_fk_targets("audit_events")

    def test_audit_event_references_recovery_case(self):
        assert "recovery_cases" in get_fk_targets("audit_events")

    def test_policy_references_merchant(self):
        assert "merchants" in get_fk_targets("policies")

    def test_policy_version_references_policy(self):
        assert "policies" in get_fk_targets("policy_versions")

    def test_policy_evaluation_references_policy(self):
        assert "policies" in get_fk_targets("policy_evaluations")

    def test_policy_evaluation_references_recovery_case(self):
        assert "recovery_cases" in get_fk_targets("policy_evaluations")

    def test_model_prediction_references_transaction(self):
        assert "transactions" in get_fk_targets("model_predictions")

    def test_model_prediction_references_recovery_case(self):
        assert "recovery_cases" in get_fk_targets("model_predictions")

    def test_model_evaluation_references_model_version(self):
        assert "model_versions" in get_fk_targets("model_evaluations")

    def test_manual_review_references_merchant(self):
        assert "merchants" in get_fk_targets("manual_reviews")

    def test_manual_review_references_recovery_case(self):
        assert "recovery_cases" in get_fk_targets("manual_reviews")

    def test_simulation_run_references_merchant(self):
        assert "merchants" in get_fk_targets("simulation_runs")

    def test_simulation_result_references_simulation_run(self):
        assert "simulation_runs" in get_fk_targets("simulation_results")


class TestGlobalTablesHaveNoMerchantId:
    """
    Global tables must NOT have merchant_id.
    Tenant isolation must only apply to merchant-scoped entities.
    """

    GLOBAL_TABLES = {
        "users",
        "model_versions",
        "model_evaluations",
        "agent_runs",
        "system_events",
    }

    def test_global_tables_have_no_merchant_id(self):
        for table_name in self.GLOBAL_TABLES:
            table = Base.metadata.tables[table_name]
            col_names = {col.name for col in table.columns}
            assert "merchant_id" not in col_names, (
                f"Global table '{table_name}' should NOT have merchant_id"
            )
