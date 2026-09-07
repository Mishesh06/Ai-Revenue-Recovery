"""
Phase 2 Verification — Decision Trace Chain

Verifies the complete FK chain for the decision trace:

  Transaction
    ↓ (transaction_id)
  ModelPrediction
    ↓ (prediction_id)
  AIDecision
    ↓ (recovery_case_id → recovery_cases)
  PolicyEvaluation
    ↓ (policy_evaluation_id)
  RecoveryAction
    ↓ (recovery_action_id)
  RecoveryAttempt

Every link in the chain must have an explicit FK column.
No link must be collapsed into a generic field.

No database connection required.
"""

import app.models  # noqa: F401
from app.database.base import Base


def get_col_names(table: str) -> set[str]:
    return {c.name for c in Base.metadata.tables[table].columns}


def get_fk_targets(table: str) -> set[str]:
    return {fk.column.table.name for fk in Base.metadata.tables[table].foreign_keys}


def get_fk_col_names_for_target(table: str, target_table: str) -> set[str]:
    """Return column names on `table` that FK to `target_table`."""
    result = set()
    for fk in Base.metadata.tables[table].foreign_keys:
        if fk.column.table.name == target_table:
            result.add(fk.parent.name)
    return result


class TestDecisionTraceLinks:
    """Each arrow in the trace chain must have an explicit FK column."""

    def test_link1_model_prediction_has_transaction_id(self):
        """Transaction → ModelPrediction via transaction_id"""
        assert "transactions" in get_fk_targets("model_predictions"), (
            "model_predictions must FK to transactions (link 1 of trace chain)"
        )
        fk_cols = get_fk_col_names_for_target("model_predictions", "transactions")
        assert "transaction_id" in fk_cols, (
            f"Expected transaction_id FK column, got: {fk_cols}"
        )

    def test_link2_ai_decision_has_prediction_id(self):
        """ModelPrediction → AIDecision via prediction_id"""
        assert "model_predictions" in get_fk_targets("ai_decisions"), (
            "ai_decisions must FK to model_predictions (link 2 of trace chain)"
        )
        fk_cols = get_fk_col_names_for_target("ai_decisions", "model_predictions")
        assert "prediction_id" in fk_cols, (
            f"Expected prediction_id FK column, got: {fk_cols}"
        )

    def test_link2b_ai_decision_also_references_recovery_case(self):
        """AIDecision must also carry recovery_case_id for direct case lookup."""
        assert "recovery_cases" in get_fk_targets("ai_decisions")
        fk_cols = get_fk_col_names_for_target("ai_decisions", "recovery_cases")
        assert "recovery_case_id" in fk_cols

    def test_link3_policy_evaluation_references_recovery_case(self):
        """RecoveryCase → PolicyEvaluation via recovery_case_id"""
        assert "recovery_cases" in get_fk_targets("policy_evaluations")
        fk_cols = get_fk_col_names_for_target("policy_evaluations", "recovery_cases")
        assert "recovery_case_id" in fk_cols

    def test_link4_recovery_action_has_policy_evaluation_id(self):
        """PolicyEvaluation → RecoveryAction via policy_evaluation_id"""
        assert "policy_evaluations" in get_fk_targets("recovery_actions")
        fk_cols = get_fk_col_names_for_target("recovery_actions", "policy_evaluations")
        assert "policy_evaluation_id" in fk_cols, (
            f"Expected policy_evaluation_id FK column, got: {fk_cols}"
        )

    def test_link5_recovery_attempt_has_recovery_action_id(self):
        """RecoveryAction → RecoveryAttempt via recovery_action_id"""
        assert "recovery_actions" in get_fk_targets("recovery_attempts")
        fk_cols = get_fk_col_names_for_target("recovery_attempts", "recovery_actions")
        assert "recovery_action_id" in fk_cols


class TestDecisionTraceFieldNames:
    """Verify all canonical trace identifier column names exist and are not collapsed."""

    def test_prediction_id_is_separate_column_on_ai_decisions(self):
        assert "prediction_id" in get_col_names("ai_decisions")

    def test_policy_evaluation_id_is_separate_column_on_recovery_actions(self):
        assert "policy_evaluation_id" in get_col_names("recovery_actions")

    def test_recovery_action_id_is_separate_column_on_recovery_attempts(self):
        assert "recovery_action_id" in get_col_names("recovery_attempts")

    def test_no_generic_parent_id_field(self):
        """
        Trace identifiers must use explicit names — not a generic 'parent_id'.
        """
        for table_name, table in Base.metadata.tables.items():
            col_names = {c.name for c in table.columns}
            assert "parent_id" not in col_names, (
                f"Table '{table_name}' has a generic 'parent_id' column — "
                f"use explicit FK names per the trace chain spec"
            )

    def test_ai_decision_does_not_collapse_trace_into_one_field(self):
        """
        AIDecision must have both prediction_id AND recovery_case_id
        as separate columns — not collapsed into one generic field.
        """
        cols = get_col_names("ai_decisions")
        assert "prediction_id" in cols, "prediction_id missing from ai_decisions"
        assert "recovery_case_id" in cols, "recovery_case_id missing from ai_decisions"
        # Verify they are separate (not the same column)
        table = Base.metadata.tables["ai_decisions"]
        pred_col = table.c.get("prediction_id")
        case_col = table.c.get("recovery_case_id")
        assert pred_col is not case_col


class TestAgentRunTraceability:
    """AgentRun is an optional trace node for both LLM and rule-based paths."""

    def test_ai_decision_has_agent_run_id(self):
        assert "agent_run_id" in get_col_names("ai_decisions")

    def test_agent_run_id_fks_to_agent_runs(self):
        assert "agent_runs" in get_fk_targets("ai_decisions")

    def test_agent_run_id_is_nullable(self):
        """agent_run_id is optional — rule-based paths may not use an agent run."""
        table = Base.metadata.tables["ai_decisions"]
        col = table.c["agent_run_id"]
        assert col.nullable, (
            "agent_run_id must be nullable to support rule-based fallback paths"
        )


class TestTraceChainNullability:
    """
    Verify which FK columns are nullable vs NOT NULL in the trace chain.

    NOT NULL: columns that are always required for the trace to be valid.
    Nullable: columns that are optional (e.g., prediction may not exist yet).
    """

    def test_model_prediction_transaction_id_is_not_null(self):
        col = Base.metadata.tables["model_predictions"].c["transaction_id"]
        assert not col.nullable

    def test_ai_decision_prediction_id_is_nullable(self):
        """Prediction may not exist for rule-based decisions."""
        col = Base.metadata.tables["ai_decisions"].c["prediction_id"]
        assert col.nullable

    def test_ai_decision_recovery_case_id_is_not_null(self):
        col = Base.metadata.tables["ai_decisions"].c["recovery_case_id"]
        assert not col.nullable

    def test_recovery_action_policy_evaluation_id_is_nullable(self):
        """Policy evaluation may not be set for manually triggered actions."""
        col = Base.metadata.tables["recovery_actions"].c["policy_evaluation_id"]
        assert col.nullable

    def test_recovery_attempt_recovery_action_id_is_not_null(self):
        col = Base.metadata.tables["recovery_attempts"].c["recovery_action_id"]
        assert not col.nullable

    def test_model_prediction_recovery_case_id_is_nullable(self):
        """Prediction may be created before a case is opened."""
        col = Base.metadata.tables["model_predictions"].c["recovery_case_id"]
        assert col.nullable
