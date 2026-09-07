"""
Test: Recovery Attempt fields match v3.2 specification.

Verifies:
- Required fields are present
- attempt_number is separate from idempotency_key
- No idempotency_key on the Attempt table (lives on Action)
- No updated_at (append-only)
"""

import app.models  # noqa: F401
from app.database.base import Base


def get_columns(table_name: str) -> set[str]:
    table = Base.metadata.tables[table_name]
    return {col.name for col in table.columns}


class TestRecoveryAttemptFields:
    REQUIRED_FIELDS = {
        "id",
        "recovery_action_id",
        "attempt_number",
        "state",
        "started_at",
        "completed_at",
        "error_code",
        "error_message",
        "adapter_response_reference",
        "created_at",
    }

    def test_all_required_fields_present(self):
        cols = get_columns("recovery_attempts")
        missing = self.REQUIRED_FIELDS - cols
        assert not missing, f"Missing fields: {missing}"

    def test_attempt_number_present(self):
        assert "attempt_number" in get_columns("recovery_attempts")

    def test_no_idempotency_key_on_attempt(self):
        """
        The idempotency_key belongs to RecoveryAction, NOT RecoveryAttempt.
        Creating a new attempt must never generate a new idempotency_key.
        """
        assert "idempotency_key" not in get_columns("recovery_attempts"), (
            "idempotency_key must live on recovery_actions, NOT recovery_attempts"
        )

    def test_no_updated_at(self):
        """Attempts are append-only — no updated_at column."""
        assert "updated_at" not in get_columns("recovery_attempts"), (
            "recovery_attempts is append-only and must not have updated_at"
        )

    def test_error_fields_present(self):
        cols = get_columns("recovery_attempts")
        assert "error_code" in cols
        assert "error_message" in cols

    def test_adapter_response_reference_present(self):
        assert "adapter_response_reference" in get_columns("recovery_attempts")

    def test_unique_constraint_on_action_attempt_number(self):
        """(recovery_action_id, attempt_number) must be unique."""
        from sqlalchemy import UniqueConstraint
        table = Base.metadata.tables["recovery_attempts"]
        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint):
                col_names = {col.name for col in constraint.columns}
                if "recovery_action_id" in col_names and "attempt_number" in col_names:
                    return  # Found it
        raise AssertionError(
            "Expected UNIQUE(recovery_action_id, attempt_number) constraint "
            "on recovery_attempts"
        )
