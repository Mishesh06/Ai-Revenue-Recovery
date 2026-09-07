"""
Test: Database connection and session creation.

Requires TEST_DATABASE_URL — gracefully skipped if not reachable.
"""

import pytest
import pytest_asyncio
from sqlalchemy import text


@pytest.mark.asyncio
async def test_database_connection(db_session):
    """Verify the database is reachable and returns a valid response."""
    result = await db_session.execute(text("SELECT 1 AS ping"))
    row = result.fetchone()
    assert row is not None
    assert row[0] == 1


@pytest.mark.asyncio
async def test_all_tables_exist(db_session):
    """Verify all expected tables were created by the conftest create_all."""
    result = await db_session.execute(
        text(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
            """
        )
    )
    existing = {row[0] for row in result.fetchall()}

    expected = {
        "users",
        "merchants",
        "customers",
        "transactions",
        "recovery_cases",
        "recovery_opportunities",
        "ai_decisions",
        "recovery_actions",
        "recovery_attempts",
        "audit_events",
        "system_events",
        "policies",
        "policy_versions",
        "policy_evaluations",
        "model_versions",
        "model_predictions",
        "model_evaluations",
        "agent_runs",
        "manual_reviews",
        "simulation_runs",
        "simulation_results",
    }

    missing = expected - existing
    assert not missing, f"Missing tables in database: {missing}"

    print(f"\n[INFO] Found {len(existing)} tables: {sorted(existing)}")


@pytest.mark.asyncio
async def test_idempotency_unique_constraint(db_session):
    """
    Verify that inserting two recovery_actions with the same idempotency_key
    raises a unique constraint violation.
    """
    import uuid
    from sqlalchemy.exc import IntegrityError

    merchant_id = uuid.uuid4()
    case_id = uuid.uuid4()
    action_id = "RETRY_PAYMENT"
    idempotency_key = f"{merchant_id}:{case_id}:{action_id}"

    # Insert prerequisite rows (merchant + case)
    await db_session.execute(
        text(
            "INSERT INTO merchants (id, name, is_active, created_at, updated_at) "
            "VALUES (:id, 'IdemTest', true, now(), now())"
        ),
        {"id": str(merchant_id)},
    )
    tx_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO transactions "
            "(id, merchant_id, amount, currency, created_at, updated_at) "
            "VALUES (:id, :mid, 100.00, 'INR', now(), now())"
        ),
        {"id": str(tx_id), "mid": str(merchant_id)},
    )
    await db_session.execute(
        text(
            "INSERT INTO recovery_cases "
            "(id, merchant_id, transaction_id, state, correlation_id, created_at, updated_at) "
            "VALUES (:id, :mid, :tid, 'DETECTED', :corr, now(), now())"
        ),
        {
            "id": str(case_id),
            "mid": str(merchant_id),
            "tid": str(tx_id),
            "corr": str(uuid.uuid4()),
        },
    )
    await db_session.flush()

    # First action — should succeed
    action1_id = uuid.uuid4()
    await db_session.execute(
        text(
            "INSERT INTO recovery_actions "
            "(id, merchant_id, recovery_case_id, action_id, state, "
            "execution_mode, idempotency_key, created_at, updated_at) "
            "VALUES (:id, :mid, :cid, :aid, 'PROPOSED', 'LIVE', :ikey, now(), now())"
        ),
        {
            "id": str(action1_id),
            "mid": str(merchant_id),
            "cid": str(case_id),
            "aid": action_id,
            "ikey": idempotency_key,
        },
    )
    await db_session.flush()

    # Second action with same idempotency_key — must fail
    with pytest.raises((IntegrityError, Exception)):
        action2_id = uuid.uuid4()
        await db_session.execute(
            text(
                "INSERT INTO recovery_actions "
                "(id, merchant_id, recovery_case_id, action_id, state, "
                "execution_mode, idempotency_key, created_at, updated_at) "
                "VALUES (:id, :mid, :cid, :aid, 'PROPOSED', 'LIVE', :ikey, now(), now())"
            ),
            {
                "id": str(action2_id),
                "mid": str(merchant_id),
                "cid": str(case_id),
                "aid": action_id,
                "ikey": idempotency_key,  # Same key — must be rejected
            },
        )
        await db_session.flush()
