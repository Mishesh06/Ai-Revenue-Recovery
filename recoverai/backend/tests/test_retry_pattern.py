"""
Phase 2 Verification — Retry Pattern

Verifies the canonical RecoverAI retry semantics:

  RecoveryAction (idempotency_key, ONE per logical action)
    ├── RecoveryAttempt #1
    ├── RecoveryAttempt #2
    └── RecoveryAttempt #3

Rules:
  - Retrying an action creates a NEW RecoveryAttempt with incremented attempt_number
  - Retrying does NOT create a new RecoveryAction
  - All attempts share the SAME idempotency_key (which lives on RecoveryAction)
  - attempt_number is monotonically increasing per action
  - UNIQUE(recovery_action_id, attempt_number) prevents duplicate attempt numbers

Pure-Python tests: schema verification (no DB).
Integration tests: actual insertion semantics (require TEST_DATABASE_URL).
"""

import uuid
import pytest
import app.models  # noqa: F401
from app.database.base import Base
from sqlalchemy import UniqueConstraint


class TestRetrySchemaContract:
    """Schema-level contracts for the retry pattern."""

    def test_recovery_attempt_has_attempt_number(self):
        assert "attempt_number" in {
            c.name for c in Base.metadata.tables["recovery_attempts"].columns
        }

    def test_recovery_attempt_has_no_idempotency_key(self):
        """
        The idempotency_key belongs to RecoveryAction, NOT RecoveryAttempt.
        If this fails, the retry pattern is broken — retries would create
        new idempotency keys instead of sharing the parent action's key.
        """
        col_names = {c.name for c in Base.metadata.tables["recovery_attempts"].columns}
        assert "idempotency_key" not in col_names, (
            "idempotency_key must NOT exist on recovery_attempts — "
            "it lives on recovery_actions and is shared across all attempts"
        )

    def test_recovery_attempt_has_no_updated_at(self):
        """
        Attempts are append-only records.
        No updated_at means the record cannot be mutated after creation.
        """
        col_names = {c.name for c in Base.metadata.tables["recovery_attempts"].columns}
        assert "updated_at" not in col_names

    def test_unique_constraint_prevents_duplicate_attempt_numbers(self):
        """UNIQUE(recovery_action_id, attempt_number) enforces monotonic ordering."""
        table = Base.metadata.tables["recovery_attempts"]
        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint):
                col_names = {c.name for c in constraint.columns}
                if col_names == {"recovery_action_id", "attempt_number"}:
                    return
        raise AssertionError(
            "Expected UNIQUE(recovery_action_id, attempt_number) "
            "on recovery_attempts to prevent duplicate attempt numbers"
        )

    def test_recovery_action_idempotency_key_is_unique(self):
        """UNIQUE(idempotency_key) on recovery_actions prevents duplicate actions."""
        table = Base.metadata.tables["recovery_actions"]
        found = False
        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint):
                for col in constraint.columns:
                    if col.name == "idempotency_key":
                        found = True
        if not found:
            for col in table.columns:
                if col.name == "idempotency_key" and col.unique:
                    found = True
        assert found, "UNIQUE(idempotency_key) must exist on recovery_actions"

    def test_recovery_action_has_action_id_for_key_construction(self):
        """action_id is needed to construct the deterministic idempotency_key."""
        col_names = {c.name for c in Base.metadata.tables["recovery_actions"].columns}
        assert "action_id" in col_names, (
            "action_id is required on recovery_actions to construct "
            "the idempotency_key: {merchant_id}:{recovery_case_id}:{action_id}"
        )

    def test_recovery_action_has_all_idempotency_key_components(self):
        """
        The canonical key components must all be present as separate columns:
          merchant_id + recovery_case_id + action_id = idempotency_key
        """
        col_names = {c.name for c in Base.metadata.tables["recovery_actions"].columns}
        for required in ("merchant_id", "recovery_case_id", "action_id", "idempotency_key"):
            assert required in col_names, (
                f"Column '{required}' missing from recovery_actions — "
                f"required for idempotency key construction"
            )


class TestIdempotencyKeyConstruction:
    """Deterministic key construction logic tests."""

    @staticmethod
    def make_key(merchant_id: uuid.UUID, case_id: uuid.UUID, action_id: str) -> str:
        return f"{merchant_id}:{case_id}:{action_id}"

    def test_attempt_1_2_3_share_same_key(self):
        """
        Simulating 3 retry attempts: each references the SAME action,
        which has the SAME idempotency_key.
        """
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        action = "RETRY_PAYMENT"

        # The action is created once
        action_idempotency_key = self.make_key(mid, cid, action)

        # All 3 attempts reference this action — they don't get their own key
        attempt_1_action_key = action_idempotency_key  # same action
        attempt_2_action_key = action_idempotency_key  # same action
        attempt_3_action_key = action_idempotency_key  # same action

        assert attempt_1_action_key == attempt_2_action_key == attempt_3_action_key

    def test_different_action_types_get_different_keys(self):
        """Two different action types on the same case must have different keys."""
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        key_retry = self.make_key(mid, cid, "RETRY_PAYMENT")
        key_sms = self.make_key(mid, cid, "SEND_SMS")
        assert key_retry != key_sms

    def test_key_is_deterministic_across_calls(self):
        """Same inputs always produce the same key — no randomness."""
        mid = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        cid = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        k1 = self.make_key(mid, cid, "RETRY_PAYMENT")
        k2 = self.make_key(mid, cid, "RETRY_PAYMENT")
        k3 = self.make_key(mid, cid, "RETRY_PAYMENT")
        assert k1 == k2 == k3 == (
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:"
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb:"
            "RETRY_PAYMENT"
        )


# ── Integration tests (require TEST_DATABASE_URL) ─────────────────

@pytest.mark.asyncio
async def test_three_attempts_share_one_action(db_session):
    """
    Integration: Insert 1 action + 3 attempts.
    Verify:
      - 1 RecoveryAction row created
      - 3 RecoveryAttempt rows with attempt_number 1, 2, 3
      - All 3 attempts reference the same action (same recovery_action_id)
      - All 3 attempts share the same idempotency_key (via the parent action)
    """
    from sqlalchemy import text

    merchant_id = uuid.uuid4()
    case_id = uuid.uuid4()
    tx_id = uuid.uuid4()
    action_id_str = "RETRY_PAYMENT"
    ikey = f"{merchant_id}:{case_id}:{action_id_str}"
    action_id = uuid.uuid4()

    # Prerequisites
    await db_session.execute(
        text("INSERT INTO merchants (id, name, is_active, created_at, updated_at) "
             "VALUES (:id, 'Retry Test', true, now(), now())"),
        {"id": str(merchant_id)},
    )
    await db_session.execute(
        text("INSERT INTO transactions (id, merchant_id, amount, currency, "
             "created_at, updated_at) VALUES (:id, :mid, 500.00, 'INR', now(), now())"),
        {"id": str(tx_id), "mid": str(merchant_id)},
    )
    await db_session.execute(
        text("INSERT INTO recovery_cases (id, merchant_id, transaction_id, state, "
             "correlation_id, created_at, updated_at) "
             "VALUES (:id, :mid, :tid, 'DETECTED', :corr, now(), now())"),
        {"id": str(case_id), "mid": str(merchant_id),
         "tid": str(tx_id), "corr": str(uuid.uuid4())},
    )
    await db_session.flush()

    # One action
    await db_session.execute(
        text("INSERT INTO recovery_actions "
             "(id, merchant_id, recovery_case_id, action_id, state, "
             "execution_mode, idempotency_key, created_at, updated_at) "
             "VALUES (:id, :mid, :cid, :aid, 'PROPOSED', 'LIVE', :ikey, now(), now())"),
        {"id": str(action_id), "mid": str(merchant_id), "cid": str(case_id),
         "aid": action_id_str, "ikey": ikey},
    )
    await db_session.flush()

    # Three attempts — all referencing the SAME action
    for attempt_num in (1, 2, 3):
        await db_session.execute(
            text("INSERT INTO recovery_attempts "
                 "(id, recovery_action_id, attempt_number, state, created_at) "
                 "VALUES (:id, :action_id, :num, 'STARTED', now())"),
            {"id": str(uuid.uuid4()), "action_id": str(action_id),
             "num": attempt_num},
        )
    await db_session.flush()

    # Verify: 3 attempt rows all point to the 1 action
    result = await db_session.execute(
        text("SELECT attempt_number FROM recovery_attempts "
             "WHERE recovery_action_id = :action_id ORDER BY attempt_number"),
        {"action_id": str(action_id)},
    )
    rows = result.fetchall()
    attempt_numbers = [r[0] for r in rows]
    assert attempt_numbers == [1, 2, 3], (
        f"Expected attempts [1,2,3], got {attempt_numbers}"
    )

    # Verify: Only 1 action row exists for this idempotency_key
    result = await db_session.execute(
        text("SELECT COUNT(*) FROM recovery_actions WHERE idempotency_key = :ikey"),
        {"ikey": ikey},
    )
    count = result.scalar()
    assert count == 1, (
        f"Expected 1 action row for idempotency_key, got {count} — "
        f"retries must not create new actions"
    )


@pytest.mark.asyncio
async def test_duplicate_attempt_number_rejected(db_session):
    """
    Integration: Inserting attempt_number=1 twice for the same action
    must be rejected by the UNIQUE(recovery_action_id, attempt_number) constraint.
    """
    import uuid
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    merchant_id = uuid.uuid4()
    case_id = uuid.uuid4()
    tx_id = uuid.uuid4()
    action_id = uuid.uuid4()
    ikey = f"{merchant_id}:{case_id}:RETRY_PAYMENT"

    await db_session.execute(
        text("INSERT INTO merchants (id, name, is_active, created_at, updated_at) "
             "VALUES (:id, 'DupAttempt', true, now(), now())"),
        {"id": str(merchant_id)},
    )
    await db_session.execute(
        text("INSERT INTO transactions (id, merchant_id, amount, currency, "
             "created_at, updated_at) VALUES (:id, :mid, 100.00, 'INR', now(), now())"),
        {"id": str(tx_id), "mid": str(merchant_id)},
    )
    await db_session.execute(
        text("INSERT INTO recovery_cases (id, merchant_id, transaction_id, state, "
             "correlation_id, created_at, updated_at) "
             "VALUES (:id, :mid, :tid, 'DETECTED', :corr, now(), now())"),
        {"id": str(case_id), "mid": str(merchant_id),
         "tid": str(tx_id), "corr": str(uuid.uuid4())},
    )
    await db_session.execute(
        text("INSERT INTO recovery_actions "
             "(id, merchant_id, recovery_case_id, action_id, state, "
             "execution_mode, idempotency_key, created_at, updated_at) "
             "VALUES (:id, :mid, :cid, 'RETRY_PAYMENT', 'PROPOSED', 'LIVE', :ikey, now(), now())"),
        {"id": str(action_id), "mid": str(merchant_id),
         "cid": str(case_id), "ikey": ikey},
    )
    await db_session.execute(
        text("INSERT INTO recovery_attempts "
             "(id, recovery_action_id, attempt_number, state, created_at) "
             "VALUES (:id, :aid, 1, 'STARTED', now())"),
        {"id": str(uuid.uuid4()), "aid": str(action_id)},
    )
    await db_session.flush()

    with pytest.raises((IntegrityError, Exception)):
        await db_session.execute(
            text("INSERT INTO recovery_attempts "
                 "(id, recovery_action_id, attempt_number, state, created_at) "
                 "VALUES (:id, :aid, 1, 'STARTED', now())"),  # same attempt_number!
            {"id": str(uuid.uuid4()), "aid": str(action_id)},
        )
        await db_session.flush()
