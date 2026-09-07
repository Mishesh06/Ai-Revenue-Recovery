"""
Test: Audit event fields, append semantics, and canonical event types.

Tests that don't need DB: field inspection.
Tests that need DB: actual row insertion (requires TEST_DATABASE_URL).
"""

import pytest
import app.models  # noqa: F401
from app.database.base import Base
from app.models.audit_event import AUDIT_EVENT_TYPES


def get_columns(table_name: str) -> set[str]:
    table = Base.metadata.tables[table_name]
    return {col.name for col in table.columns}


class TestAuditEventFields:
    REQUIRED_FIELDS = {
        "id",
        "merchant_id",
        "correlation_id",
        "recovery_case_id",
        "transaction_id",
        "event_type",
        "event_data",
        "timestamp",
    }

    def test_all_required_fields_present(self):
        cols = get_columns("audit_events")
        missing = self.REQUIRED_FIELDS - cols
        assert not missing, f"Missing fields: {missing}"

    def test_no_updated_at(self):
        """
        Audit events are append-only.
        No updated_at column must exist on this table.
        """
        assert "updated_at" not in get_columns("audit_events"), (
            "audit_events is append-only — updated_at must NOT exist"
        )

    def test_no_created_at_with_updated_at(self):
        """Ensure there's no mutable pattern on audit_events."""
        cols = get_columns("audit_events")
        # created_at is ok, updated_at is not
        assert "updated_at" not in cols

    def test_canonical_event_types_defined(self):
        """The canonical event types must be defined as a frozenset."""
        assert isinstance(AUDIT_EVENT_TYPES, frozenset)
        assert len(AUDIT_EVENT_TYPES) > 0

    def test_required_event_types_in_canonical_set(self):
        required = {
            "PaymentFailed",
            "OpportunityDetected",
            "PredictionCreated",
            "DiagnosisCreated",
            "RecoveryPlanned",
            "PolicyEvaluated",
            "RecoveryApproved",
            "RecoveryExecuted",
            "RecoverySucceeded",
            "RecoveryFailed",
            "RecoveryWindowExpired",
            "ManualReviewCreated",
            "CaseClosed",
        }
        missing = required - AUDIT_EVENT_TYPES
        assert not missing, f"Missing canonical event types: {missing}"

    def test_merchant_id_present(self):
        assert "merchant_id" in get_columns("audit_events")

    def test_correlation_id_present(self):
        assert "correlation_id" in get_columns("audit_events")


@pytest.mark.asyncio
async def test_audit_event_insert(db_session):
    """
    Integration test: verify an AuditEvent can be inserted and read back.
    Requires TEST_DATABASE_URL to be configured.
    """
    import uuid
    from datetime import datetime, timezone
    from sqlalchemy import text

    merchant_id = uuid.uuid4()
    correlation_id = str(uuid.uuid4())

    # Insert a merchant first (FK dependency)
    await db_session.execute(
        text(
            "INSERT INTO merchants (id, name, is_active, created_at, updated_at) "
            "VALUES (:id, :name, true, now(), now())"
        ),
        {"id": str(merchant_id), "name": "Test Merchant"},
    )

    # Insert audit event directly via SQL to test append semantics
    event_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO audit_events "
            "(id, merchant_id, correlation_id, event_type, timestamp) "
            "VALUES (:id, :merchant_id, :correlation_id, :event_type, now())"
        ),
        {
            "id": str(event_id),
            "merchant_id": str(merchant_id),
            "correlation_id": correlation_id,
            "event_type": "PaymentFailed",
        },
    )

    result = await db_session.execute(
        text("SELECT event_type FROM audit_events WHERE id = :id"),
        {"id": str(event_id)},
    )
    row = result.fetchone()
    assert row is not None
    assert row[0] == "PaymentFailed"
