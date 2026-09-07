"""
Test: Policy Evaluation fields match v3.2 specification.

Verifies all required fields for the deterministic policy engine trace record.
No database connection required.
"""

import app.models  # noqa: F401
from app.database.base import Base


def get_columns(table_name: str) -> set[str]:
    table = Base.metadata.tables[table_name]
    return {col.name for col in table.columns}


class TestPolicyEvaluationFields:
    REQUIRED_FIELDS = {
        "id",
        "policy_id",
        "policy_version",
        "recovery_case_id",
        "decision",
        "reason_code",
        "reason",
        "risk_level",
        "requires_human_review",
        "evaluated_at",
        "evaluation_data",
    }

    def test_all_required_fields_present(self):
        cols = get_columns("policy_evaluations")
        missing = self.REQUIRED_FIELDS - cols
        assert not missing, f"Missing fields: {missing}"

    def test_decision_present(self):
        assert "decision" in get_columns("policy_evaluations")

    def test_reason_code_present(self):
        assert "reason_code" in get_columns("policy_evaluations")

    def test_policy_version_present(self):
        """Policy version stored as integer — enables deterministic traceability."""
        assert "policy_version" in get_columns("policy_evaluations")

    def test_requires_human_review_present(self):
        assert "requires_human_review" in get_columns("policy_evaluations")

    def test_evaluated_at_present(self):
        assert "evaluated_at" in get_columns("policy_evaluations")

    def test_evaluation_data_present(self):
        """evaluation_data is JSONB for structured policy output."""
        assert "evaluation_data" in get_columns("policy_evaluations")

    def test_no_updated_at(self):
        """PolicyEvaluation is immutable — no updated_at."""
        assert "updated_at" not in get_columns("policy_evaluations")

    def test_policy_versions_table_exists(self):
        assert "policy_versions" in Base.metadata.tables

    def test_policy_version_unique_constraint(self):
        """(policy_id, version) must be unique across policy_versions."""
        from sqlalchemy import UniqueConstraint
        table = Base.metadata.tables["policy_versions"]
        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint):
                col_names = {col.name for col in constraint.columns}
                if "policy_id" in col_names and "version" in col_names:
                    return
        raise AssertionError(
            "Expected UNIQUE(policy_id, version) on policy_versions"
        )
