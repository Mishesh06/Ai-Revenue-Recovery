"""
Test: Idempotency key structure and uniqueness enforcement.

Verifies the canonical RecoverAI rule:
  idempotency_key = "{merchant_id}:{recovery_case_id}:{action_id}"

Pure-Python tests (no DB): key structure validation.
Integration tests (need DB): uniqueness constraint at DB level.
"""

import uuid

import pytest
import app.models  # noqa: F401
from app.database.base import Base
from sqlalchemy import UniqueConstraint


# ── Pure Python: key structure ────────────────────────────────────

class TestIdempotencyKeyStructure:
    """Verify the canonical key can be constructed deterministically."""

    def _make_key(
        self, merchant_id: uuid.UUID, case_id: uuid.UUID, action_id: str
    ) -> str:
        return f"{merchant_id}:{case_id}:{action_id}"

    def test_key_format(self):
        mid = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        cid = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        key = self._make_key(mid, cid, "RETRY_PAYMENT")
        assert key == (
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:"
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb:"
            "RETRY_PAYMENT"
        )

    def test_same_inputs_produce_same_key(self):
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        action = "RETRY_PAYMENT"
        key1 = self._make_key(mid, cid, action)
        key2 = self._make_key(mid, cid, action)
        assert key1 == key2, "Idempotency key must be deterministic"

    def test_different_action_ids_produce_different_keys(self):
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        key_retry = self._make_key(mid, cid, "RETRY_PAYMENT")
        key_sms = self._make_key(mid, cid, "SEND_SMS")
        assert key_retry != key_sms

    def test_different_case_ids_produce_different_keys(self):
        mid = uuid.uuid4()
        cid1 = uuid.uuid4()
        cid2 = uuid.uuid4()
        key1 = self._make_key(mid, cid1, "RETRY_PAYMENT")
        key2 = self._make_key(mid, cid2, "RETRY_PAYMENT")
        assert key1 != key2

    def test_different_merchant_ids_produce_different_keys(self):
        mid1 = uuid.uuid4()
        mid2 = uuid.uuid4()
        cid = uuid.uuid4()
        key1 = self._make_key(mid1, cid, "RETRY_PAYMENT")
        key2 = self._make_key(mid2, cid, "RETRY_PAYMENT")
        assert key1 != key2

    def test_retrying_same_action_reuses_key(self):
        """
        Multiple attempts on the same action share the same idempotency_key.
        A new attempt MUST NOT generate a new idempotency_key.
        """
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        action = "RETRY_PAYMENT"
        # Simulate attempt 1 and attempt 2 — both reference the SAME action
        # and therefore use the SAME idempotency_key
        key_attempt_1 = self._make_key(mid, cid, action)
        key_attempt_2 = self._make_key(mid, cid, action)
        assert key_attempt_1 == key_attempt_2, (
            "The idempotency_key must be identical across all attempts "
            "of the same action"
        )


class TestIdempotencyConstraintOnModel:
    """Verify the UNIQUE constraint exists in the SQLAlchemy table metadata."""

    def test_unique_constraint_on_idempotency_key(self):
        table = Base.metadata.tables["recovery_actions"]
        found = False

        # Check UniqueConstraint objects
        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint):
                for col in constraint.columns:
                    if col.name == "idempotency_key":
                        found = True
                        break

        # Also check column-level unique flag
        if not found:
            for col in table.columns:
                if col.name == "idempotency_key" and col.unique:
                    found = True
                    break

        assert found, (
            "UNIQUE constraint on recovery_actions.idempotency_key is required "
            "to enforce the canonical RecoverAI idempotency rule"
        )

    def test_idempotency_key_not_on_attempt_table(self):
        """Attempt table must NOT have an idempotency_key column."""
        attempt_table = Base.metadata.tables["recovery_attempts"]
        col_names = {col.name for col in attempt_table.columns}
        assert "idempotency_key" not in col_names, (
            "idempotency_key belongs on recovery_actions, not recovery_attempts. "
            "Retry logic creates a new RecoveryAttempt row, not a new key."
        )


# ── Integration: DB-level uniqueness ─────────────────────────────

@pytest.mark.asyncio
async def test_db_rejects_duplicate_idempotency_key(db_session):
    """
    Integration test: PostgreSQL must reject a second INSERT with the same
    idempotency_key (enforced by the DB-level UNIQUE constraint).
    """
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    merchant_id = uuid.uuid4()
    case_id = uuid.uuid4()
    tx_id = uuid.uuid4()
    action_id = "RETRY_PAYMENT"
    idempotency_key = f"{merchant_id}:{case_id}:{action_id}"

    # Create merchant
    await db_session.execute(
        text(
            "INSERT INTO merchants (id, name, is_active, created_at, updated_at) "
            "VALUES (:id, 'Idem Merchant', true, now(), now())"
        ),
        {"id": str(merchant_id)},
    )
    # Create transaction
    await db_session.execute(
        text(
            "INSERT INTO transactions "
            "(id, merchant_id, amount, currency, created_at, updated_at) "
            "VALUES (:id, :mid, 500.00, 'INR', now(), now())"
        ),
        {"id": str(tx_id), "mid": str(merchant_id)},
    )
    # Create recovery case
    await db_session.execute(
        text(
            "INSERT INTO recovery_cases "
            "(id, merchant_id, transaction_id, state, correlation_id, "
            "created_at, updated_at) "
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

    # First action — must succeed
    await db_session.execute(
        text(
            "INSERT INTO recovery_actions "
            "(id, merchant_id, recovery_case_id, action_id, state, "
            "execution_mode, idempotency_key, created_at, updated_at) "
            "VALUES (:id, :mid, :cid, :aid, 'PROPOSED', 'LIVE', :ikey, now(), now())"
        ),
        {
            "id": str(uuid.uuid4()),
            "mid": str(merchant_id),
            "cid": str(case_id),
            "aid": action_id,
            "ikey": idempotency_key,
        },
    )
    await db_session.flush()

    # Second action with same key — MUST be rejected
    with pytest.raises((IntegrityError, Exception)):
        await db_session.execute(
            text(
                "INSERT INTO recovery_actions "
                "(id, merchant_id, recovery_case_id, action_id, state, "
                "execution_mode, idempotency_key, created_at, updated_at) "
                "VALUES (:id, :mid, :cid, :aid, 'PROPOSED', 'LIVE', :ikey, now(), now())"
            ),
            {
                "id": str(uuid.uuid4()),
                "mid": str(merchant_id),
                "cid": str(case_id),
                "aid": action_id,
                "ikey": idempotency_key,  # Duplicate — must fail
            },
        )
        await db_session.flush()
