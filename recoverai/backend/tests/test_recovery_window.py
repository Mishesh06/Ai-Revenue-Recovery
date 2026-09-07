"""
Phase 2 Verification — Recovery Window Fields

Verifies the database supports the full recovery window lifecycle:
  recovery_window_started_at — when the recovery window opened
  recovery_window_ends_at    — deadline for recovery attempts
  recovered_at               — timestamp when recovery succeeded

All three fields are on recovery_cases.
All three must be nullable (window may not be set yet at DETECTED state).
All three must be timezone-aware DateTime columns.

No database connection required.
"""

import app.models  # noqa: F401
from app.database.base import Base
from sqlalchemy import DateTime


class TestRecoveryWindowFields:

    @staticmethod
    def _get_col(col_name: str):
        return Base.metadata.tables["recovery_cases"].c[col_name]

    def test_recovery_window_started_at_exists(self):
        assert "recovery_window_started_at" in {
            c.name for c in Base.metadata.tables["recovery_cases"].columns
        }

    def test_recovery_window_ends_at_exists(self):
        assert "recovery_window_ends_at" in {
            c.name for c in Base.metadata.tables["recovery_cases"].columns
        }

    def test_recovered_at_exists(self):
        assert "recovered_at" in {
            c.name for c in Base.metadata.tables["recovery_cases"].columns
        }

    def test_recovery_window_started_at_is_nullable(self):
        """Not set until the case moves to RECOVERING state."""
        col = self._get_col("recovery_window_started_at")
        assert col.nullable, (
            "recovery_window_started_at must be nullable — "
            "it is not set at initial DETECTED state"
        )

    def test_recovery_window_ends_at_is_nullable(self):
        """Not set until the recovery window is calculated."""
        col = self._get_col("recovery_window_ends_at")
        assert col.nullable

    def test_recovered_at_is_nullable(self):
        """Only set when state transitions to RECOVERED."""
        col = self._get_col("recovered_at")
        assert col.nullable

    def test_recovery_window_started_at_is_timezone_aware(self):
        col = self._get_col("recovery_window_started_at")
        assert isinstance(col.type, DateTime), (
            f"recovery_window_started_at must be DateTime, got {type(col.type)}"
        )
        assert col.type.timezone is True, (
            "recovery_window_started_at must be timezone-aware (TIMESTAMPTZ)"
        )

    def test_recovery_window_ends_at_is_timezone_aware(self):
        col = self._get_col("recovery_window_ends_at")
        assert isinstance(col.type, DateTime)
        assert col.type.timezone is True

    def test_recovered_at_is_timezone_aware(self):
        col = self._get_col("recovered_at")
        assert isinstance(col.type, DateTime)
        assert col.type.timezone is True

    def test_all_three_window_fields_are_separate_columns(self):
        """The three window fields must be separate columns — not combined."""
        cols = Base.metadata.tables["recovery_cases"].c
        assert cols["recovery_window_started_at"] is not cols["recovery_window_ends_at"]
        assert cols["recovery_window_ends_at"] is not cols["recovered_at"]
        assert cols["recovery_window_started_at"] is not cols["recovered_at"]

    def test_correlation_id_is_on_recovery_cases(self):
        """correlation_id links the case to all events in audit_events."""
        col_names = {c.name for c in Base.metadata.tables["recovery_cases"].columns}
        assert "correlation_id" in col_names

    def test_correlation_id_is_not_null(self):
        col = Base.metadata.tables["recovery_cases"].c["correlation_id"]
        assert not col.nullable, (
            "correlation_id must be NOT NULL — every case must have a trace ID"
        )

    def test_confidence_field_exists_and_is_nullable(self):
        """confidence is set after ML prediction — nullable before that."""
        col_names = {c.name for c in Base.metadata.tables["recovery_cases"].columns}
        assert "confidence" in col_names
        col = Base.metadata.tables["recovery_cases"].c["confidence"]
        assert col.nullable


class TestAuditWindowAssociation:
    """audit_events must carry all fields needed to reconstruct the window timeline."""

    def test_audit_event_has_merchant_id(self):
        assert "merchant_id" in {
            c.name for c in Base.metadata.tables["audit_events"].columns
        }

    def test_audit_event_has_correlation_id(self):
        """
        correlation_id on audit_events must match recovery_cases.correlation_id
        to correlate all events for a given case.
        """
        assert "correlation_id" in {
            c.name for c in Base.metadata.tables["audit_events"].columns
        }

    def test_audit_event_has_recovery_case_id(self):
        assert "recovery_case_id" in {
            c.name for c in Base.metadata.tables["audit_events"].columns
        }

    def test_audit_event_has_transaction_id(self):
        assert "transaction_id" in {
            c.name for c in Base.metadata.tables["audit_events"].columns
        }

    def test_audit_event_has_timestamp(self):
        assert "timestamp" in {
            c.name for c in Base.metadata.tables["audit_events"].columns
        }

    def test_audit_event_timestamp_is_timezone_aware(self):
        col = Base.metadata.tables["audit_events"].c["timestamp"]
        assert isinstance(col.type, DateTime)
        assert col.type.timezone is True

    def test_audit_event_has_no_updated_at(self):
        """
        Audit events are append-only.
        The absence of updated_at is the architectural guarantee.
        """
        col_names = {c.name for c in Base.metadata.tables["audit_events"].columns}
        assert "updated_at" not in col_names, (
            "audit_events must NOT have updated_at — "
            "it is an append-only table that models the immutable event log"
        )

    def test_audit_event_correlation_id_is_not_null(self):
        col = Base.metadata.tables["audit_events"].c["correlation_id"]
        assert not col.nullable, (
            "correlation_id on audit_events must be NOT NULL"
        )
