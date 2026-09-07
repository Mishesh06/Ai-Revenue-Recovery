"""
Test: Recovery Action fields match v3.2 specification.

Verifies column names and idempotency constraint via metadata inspection.
No database connection required.
"""

import app.models  # noqa: F401
from app.database.base import Base
from sqlalchemy import UniqueConstraint


def get_columns(table_name: str) -> set[str]:
    table = Base.metadata.tables[table_name]
    return {col.name for col in table.columns}


class TestRecoveryActionFields:
    REQUIRED_FIELDS = {
        "id",
        "merchant_id",
        "recovery_case_id",
        "action_id",
        "state",
        "execution_mode",
        "idempotency_key",
        "policy_evaluation_id",
        "created_at",
        "updated_at",
    }

    def test_all_required_fields_present(self):
        cols = get_columns("recovery_actions")
        missing = self.REQUIRED_FIELDS - cols
        assert not missing, f"Missing fields: {missing}"

    def test_idempotency_key_present(self):
        assert "idempotency_key" in get_columns("recovery_actions")

    def test_action_id_present(self):
        assert "action_id" in get_columns("recovery_actions")

    def test_execution_mode_present(self):
        assert "execution_mode" in get_columns("recovery_actions")

    def test_idempotency_key_has_unique_constraint(self):
        """
        The canonical RecoverAI idempotency rule requires a DB-level
        UNIQUE constraint on idempotency_key.
        """
        table = Base.metadata.tables["recovery_actions"]
        unique_constraint_names = set()

        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint):
                unique_constraint_names.add(constraint.name)
                for col in constraint.columns:
                    if col.name == "idempotency_key":
                        return  # Found it — test passes

        # Also check column-level unique
        for col in table.columns:
            if col.name == "idempotency_key" and col.unique:
                return  # Found it — test passes

        raise AssertionError(
            "idempotency_key must have a UNIQUE constraint. "
            f"Found constraints: {unique_constraint_names}"
        )

    def test_policy_evaluation_id_present(self):
        """policy_evaluation_id links into the decision trace chain."""
        assert "policy_evaluation_id" in get_columns("recovery_actions")

    def test_merchant_id_present(self):
        assert "merchant_id" in get_columns("recovery_actions")
