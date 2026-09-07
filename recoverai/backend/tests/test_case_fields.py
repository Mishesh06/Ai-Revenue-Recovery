"""
Test: Recovery Case fields match v3.2 specification.

Verifies column names via SQLAlchemy table inspection.
No database connection required.
"""

import app.models  # noqa: F401 — ensure metadata is populated
from app.database.base import Base


def get_columns(table_name: str) -> set[str]:
    table = Base.metadata.tables[table_name]
    return {col.name for col in table.columns}


class TestRecoveryCaseFields:
    REQUIRED_FIELDS = {
        "id",
        "merchant_id",
        "transaction_id",
        "state",
        "correlation_id",
        "confidence",
        "recovery_window_started_at",
        "recovery_window_ends_at",
        "recovered_at",
        "created_at",
        "updated_at",
    }

    def test_all_required_fields_present(self):
        cols = get_columns("recovery_cases")
        missing = self.REQUIRED_FIELDS - cols
        assert not missing, f"Missing fields: {missing}"

    def test_merchant_id_present(self):
        assert "merchant_id" in get_columns("recovery_cases")

    def test_correlation_id_present(self):
        assert "correlation_id" in get_columns("recovery_cases")

    def test_state_column_present(self):
        assert "state" in get_columns("recovery_cases")

    def test_recovery_window_fields_present(self):
        cols = get_columns("recovery_cases")
        assert "recovery_window_started_at" in cols
        assert "recovery_window_ends_at" in cols

    def test_no_updated_at_on_attempt_table(self):
        """
        RecoveryAttempt is append-only and must NOT have updated_at.
        RecoveryCase DOES have updated_at — this double-checks that.
        """
        case_cols = get_columns("recovery_cases")
        attempt_cols = get_columns("recovery_attempts")
        assert "updated_at" in case_cols
        assert "updated_at" not in attempt_cols

    def test_correlation_id_is_unique(self):
        """correlation_id must have a unique constraint."""
        table = Base.metadata.tables["recovery_cases"]
        unique_cols = set()
        for constraint in table.constraints:
            from sqlalchemy import UniqueConstraint
            if isinstance(constraint, UniqueConstraint):
                for col in constraint.columns:
                    unique_cols.add(col.name)
            # Also check column-level unique
        for col in table.columns:
            if col.name == "correlation_id" and col.unique:
                unique_cols.add("correlation_id")
        assert "correlation_id" in unique_cols, (
            "correlation_id must have a unique constraint"
        )
