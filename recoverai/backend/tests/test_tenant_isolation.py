"""
Phase 2 Verification — Tenant Isolation

Ensures every merchant-scoped table:
  1. Has a merchant_id column
  2. That column has a NOT NULL constraint
  3. That column has a FK pointing to merchants(id)
  4. Global tables do NOT have merchant_id

No database connection required.
"""

import pytest
import app.models  # noqa: F401 — register all models
from app.database.base import Base
from sqlalchemy import ForeignKey


# ── Expected scoped vs global tables ─────────────────────────────

MERCHANT_SCOPED_TABLES = {
    "customers",
    "transactions",
    "recovery_cases",
    "recovery_opportunities",
    "policies",
    "recovery_actions",
    "recovery_attempts",   # scoped via recovery_action → recovery_case → merchant
    "audit_events",
    "manual_reviews",
    "simulation_runs",
}

# These tables are explicitly global — no merchant_id
GLOBAL_TABLES = {
    "users",
    "model_versions",
    "model_evaluations",
    "agent_runs",
    "system_events",
}

# These have merchant context via FK chain, not a direct merchant_id
FK_CHAIN_SCOPED_TABLES = {
    "recovery_attempts",      # → recovery_actions → merchant
    "policy_versions",        # → policies → merchant
    "policy_evaluations",     # → recovery_cases → merchant
    "model_predictions",      # → transactions → merchant
    "simulation_results",     # → simulation_runs → merchant
    "ai_decisions",           # → recovery_cases → merchant
}

# Direct merchant_id column holders
DIRECT_MERCHANT_ID_TABLES = MERCHANT_SCOPED_TABLES - FK_CHAIN_SCOPED_TABLES


def get_col_names(table_name: str) -> set[str]:
    return {c.name for c in Base.metadata.tables[table_name].columns}


def get_fk_targets(table_name: str) -> set[str]:
    table = Base.metadata.tables[table_name]
    return {fk.column.table.name for fk in table.foreign_keys}


class TestDirectMerchantIdTables:
    """Tables that directly carry merchant_id NOT NULL → merchants(id)."""

    @pytest.mark.parametrize("table_name", sorted(DIRECT_MERCHANT_ID_TABLES))
    def test_has_merchant_id_column(self, table_name):
        assert "merchant_id" in get_col_names(table_name), (
            f"Table '{table_name}' is merchant-scoped but missing merchant_id"
        )

    @pytest.mark.parametrize("table_name", sorted(DIRECT_MERCHANT_ID_TABLES))
    def test_merchant_id_is_not_null(self, table_name):
        table = Base.metadata.tables[table_name]
        col = table.c["merchant_id"]
        assert not col.nullable, (
            f"merchant_id on '{table_name}' must be NOT NULL"
        )

    @pytest.mark.parametrize("table_name", sorted(DIRECT_MERCHANT_ID_TABLES))
    def test_merchant_id_references_merchants(self, table_name):
        assert "merchants" in get_fk_targets(table_name), (
            f"merchant_id on '{table_name}' must FK to merchants(id)"
        )

    @pytest.mark.parametrize("table_name", sorted(DIRECT_MERCHANT_ID_TABLES))
    def test_merchant_id_fk_ondelete_restrict(self, table_name):
        """
        merchant_id FK must use RESTRICT (not CASCADE/SET NULL) to prevent
        accidental merchant deletion cascading to all tenant data.
        """
        table = Base.metadata.tables[table_name]
        for fk in table.foreign_keys:
            if fk.column.table.name == "merchants":
                assert fk.ondelete in (None, "RESTRICT"), (
                    f"merchant_id FK on '{table_name}' should use RESTRICT, "
                    f"got: {fk.ondelete}"
                )
                return
        raise AssertionError(f"No FK to merchants found on '{table_name}'")


class TestGlobalTablesNoMerchantId:
    """Global tables must never carry a merchant_id column."""

    @pytest.mark.parametrize("table_name", sorted(GLOBAL_TABLES))
    def test_global_table_has_no_merchant_id(self, table_name):
        assert "merchant_id" not in get_col_names(table_name), (
            f"Global table '{table_name}' must NOT have merchant_id"
        )


class TestFKChainScopedTables:
    """Tables scoped to a merchant via FK chain — no direct merchant_id."""

    def test_recovery_attempts_chains_via_recovery_action(self):
        """recovery_attempts → recovery_actions → merchants"""
        assert "recovery_actions" in get_fk_targets("recovery_attempts")
        assert "merchants" in get_fk_targets("recovery_actions")

    def test_policy_versions_chains_via_policies(self):
        """policy_versions → policies → merchants"""
        assert "policies" in get_fk_targets("policy_versions")
        assert "merchants" in get_fk_targets("policies")

    def test_policy_evaluations_chains_via_recovery_case(self):
        """policy_evaluations → recovery_cases → merchants"""
        assert "recovery_cases" in get_fk_targets("policy_evaluations")
        assert "merchants" in get_fk_targets("recovery_cases")

    def test_model_predictions_chains_via_transaction(self):
        """model_predictions → transactions → merchants"""
        assert "transactions" in get_fk_targets("model_predictions")
        assert "merchants" in get_fk_targets("transactions")

    def test_simulation_results_chains_via_simulation_run(self):
        """simulation_results → simulation_runs → merchants"""
        assert "simulation_runs" in get_fk_targets("simulation_results")
        assert "merchants" in get_fk_targets("simulation_runs")

    def test_ai_decisions_chains_via_recovery_case(self):
        """ai_decisions → recovery_cases → merchants"""
        assert "recovery_cases" in get_fk_targets("ai_decisions")
        assert "merchants" in get_fk_targets("recovery_cases")


class TestCrossMerchantProtection:
    """
    Verify that the schema design makes cross-merchant data leakage
    structurally difficult (defense in depth).

    Note: Full enforcement is at the application layer (service-level
    merchant_id checks on every query). These tests verify the FK
    structure that makes it possible to do that check.
    """

    def test_recovery_case_has_both_merchant_and_transaction_ids(self):
        """
        Both merchant_id and transaction_id are on recovery_cases.
        Service layer must verify: case.merchant_id == requesting_merchant_id
        """
        cols = get_col_names("recovery_cases")
        assert "merchant_id" in cols
        assert "transaction_id" in cols

    def test_recovery_action_has_both_merchant_and_case_ids(self):
        """
        Both merchant_id and recovery_case_id are on recovery_actions.
        Service layer must verify: action.merchant_id == case.merchant_id
        """
        cols = get_col_names("recovery_actions")
        assert "merchant_id" in cols
        assert "recovery_case_id" in cols

    def test_audit_event_has_merchant_and_correlation_and_case_ids(self):
        """Audit events carry enough fields to scope queries per tenant."""
        cols = get_col_names("audit_events")
        assert "merchant_id" in cols
        assert "correlation_id" in cols
        assert "recovery_case_id" in cols

    def test_all_known_scoped_tables_are_covered(self):
        """
        Fail if a table is added to Base.metadata that should be scoped
        but isn't in our expected sets.
        """
        all_tables = set(Base.metadata.tables.keys())
        # Tables we know about
        known = (
            DIRECT_MERCHANT_ID_TABLES
            | FK_CHAIN_SCOPED_TABLES
            | GLOBAL_TABLES
            | {"merchants"}  # root entity
        )
        uncategorized = all_tables - known
        assert not uncategorized, (
            f"New table(s) added to metadata but not categorized for "
            f"tenant isolation: {uncategorized}"
        )
