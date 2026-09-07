"""
RecoverAI v3.2 — Phase 4: Orchestrator & State Machine Tests

Coverage:
  1. State machine — valid transitions (all three machines)
  2. State machine — invalid transitions (all three machines)
  3. Terminal states — no transitions out
  4. Recovery window expiration check
  5. Idempotency key builder
  6. AuditService — valid and invalid event types
  7. RecoveryService (mocked session) — transition methods
  8. RecoveryOrchestrator (mocked session) — full lifecycle
     a. Happy path: DETECTED → ... → CLOSED
     b. Recovery window expiry path
     c. UNKNOWN outcome — never auto-retried
     d. Retry path — new attempt, re-POLICY_CHECK
     e. Idempotency — duplicate key returns existing action
     f. Audit events emitted at each transition
  9. Action/Attempt creation helpers

All tests run WITHOUT a real database connection.
The DB-level tests in conftest.py are skipped when Postgres is unavailable.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.audit_event import AuditEvent
from app.models.enums import ActionState, AttemptState, CaseState, ExecutionMode
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.recovery_case import RecoveryCase
from app.services.state_machine import (
    ACTION_TRANSITIONS,
    ATTEMPT_TRANSITIONS,
    CASE_TRANSITIONS,
    InvalidTransitionError,
    build_idempotency_key,
    is_case_terminal,
    is_action_terminal,
    is_attempt_terminal,
    is_recovery_window_expired,
    validate_action_transition,
    validate_attempt_transition,
    validate_case_transition,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def make_case(
    state: CaseState = CaseState.DETECTED,
    recovery_window_ends_at: datetime | None = None,
    merchant_id: uuid.UUID | None = None,
) -> RecoveryCase:
    """Create a minimal RecoveryCase ORM instance without a DB session."""
    return RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=merchant_id or uuid.uuid4(),
        transaction_id=uuid.uuid4(),
        state=state,
        correlation_id=f"corr-{uuid.uuid4().hex[:8]}",
        confidence=None,
        recovery_window_started_at=None,
        recovery_window_ends_at=recovery_window_ends_at,
        recovered_at=None,
    )


def make_action(
    state: ActionState = ActionState.PROPOSED,
    case_id: uuid.UUID | None = None,
    merchant_id: uuid.UUID | None = None,
) -> RecoveryAction:
    mid = merchant_id or uuid.uuid4()
    cid = case_id or uuid.uuid4()
    return RecoveryAction(
        id=uuid.uuid4(),
        merchant_id=mid,
        recovery_case_id=cid,
        action_id="RETRY_PAYMENT",
        state=state,
        execution_mode=ExecutionMode.SIMULATION,
        idempotency_key=f"{mid}:{cid}:RETRY_PAYMENT",
        policy_evaluation_id=None,
    )


def make_attempt(
    state: AttemptState = AttemptState.STARTED,
    action_id: uuid.UUID | None = None,
    attempt_number: int = 1,
) -> RecoveryAttempt:
    return RecoveryAttempt(
        id=uuid.uuid4(),
        recovery_action_id=action_id or uuid.uuid4(),
        attempt_number=attempt_number,
        state=state,
        started_at=datetime.now(tz=timezone.utc),
        completed_at=None,
        error_code=None,
        error_message=None,
        adapter_response_reference=None,
    )


def make_mock_session() -> AsyncMock:
    """Return a mock AsyncSession that accepts add/flush calls."""
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.execute = AsyncMock()
    return session


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Case State Machine — Valid Transitions
# ═══════════════════════════════════════════════════════════════════════════════

class TestCaseValidTransitions:
    """All transitions in CASE_TRANSITIONS must pass validation."""

    @pytest.mark.parametrize("current,nexts", [
        (CaseState.DETECTED,               [CaseState.ANALYZING, CaseState.CLOSED]),
        (CaseState.ANALYZING,              [CaseState.PREDICTED, CaseState.CLOSED]),
        (CaseState.PREDICTED,              [CaseState.DIAGNOSED, CaseState.CLOSED]),
        (CaseState.DIAGNOSED,              [CaseState.PLANNED, CaseState.CLOSED]),
        (CaseState.PLANNED,                [CaseState.POLICY_CHECK, CaseState.CLOSED]),
        (CaseState.POLICY_CHECK,           [CaseState.RECOVERING, CaseState.CLOSED]),
        (CaseState.RECOVERING,             [CaseState.RECOVERED, CaseState.RECOVERY_WINDOW_EXPIRED,
                                            CaseState.POLICY_CHECK, CaseState.CLOSED]),
        (CaseState.RECOVERED,              [CaseState.CLOSED]),
        (CaseState.RECOVERY_WINDOW_EXPIRED,[CaseState.CLOSED]),
    ])
    def test_valid_case_transitions(self, current: CaseState, nexts: list[CaseState]):
        for next_state in nexts:
            validate_case_transition(current, next_state)  # must not raise

    def test_recovering_to_policy_check_allowed(self):
        """Retry path: RECOVERING → POLICY_CHECK must be valid."""
        validate_case_transition(CaseState.RECOVERING, CaseState.POLICY_CHECK)

    def test_recovered_to_closed(self):
        validate_case_transition(CaseState.RECOVERED, CaseState.CLOSED)

    def test_window_expired_to_closed(self):
        validate_case_transition(CaseState.RECOVERY_WINDOW_EXPIRED, CaseState.CLOSED)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Case State Machine — Invalid Transitions
# ═══════════════════════════════════════════════════════════════════════════════

class TestCaseInvalidTransitions:

    @pytest.mark.parametrize("current,bad_next", [
        (CaseState.DETECTED,    CaseState.PREDICTED),       # skip ANALYZING
        (CaseState.DETECTED,    CaseState.RECOVERING),      # jump too far
        (CaseState.ANALYZING,   CaseState.PLANNED),         # skip stages
        (CaseState.RECOVERED,   CaseState.RECOVERING),      # no reversal from terminal
        (CaseState.CLOSED,      CaseState.DETECTED),        # no exit from CLOSED
        (CaseState.CLOSED,      CaseState.ANALYZING),
        (CaseState.CLOSED,      CaseState.CLOSED),          # self-transition
        (CaseState.RECOVERING,  CaseState.PLANNED),         # no backward jump
        (CaseState.RECOVERY_WINDOW_EXPIRED, CaseState.RECOVERING),  # expired → recovering illegal
        (CaseState.POLICY_CHECK, CaseState.PLANNED),        # backward skip
    ])
    def test_invalid_case_transition_raises(self, current: CaseState, bad_next: CaseState):
        with pytest.raises(InvalidTransitionError) as exc_info:
            validate_case_transition(current, bad_next)
        assert exc_info.value.machine == "case"
        assert exc_info.value.current == current.value
        assert exc_info.value.requested == bad_next.value

    def test_invalid_transition_error_message(self):
        with pytest.raises(InvalidTransitionError) as exc_info:
            validate_case_transition(CaseState.CLOSED, CaseState.ANALYZING)
        msg = str(exc_info.value)
        assert "case" in msg
        assert "CLOSED" in msg
        assert "ANALYZING" in msg


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Action State Machine
# ═══════════════════════════════════════════════════════════════════════════════

class TestActionStateMachine:

    @pytest.mark.parametrize("current,nexts", [
        (ActionState.PROPOSED,  [ActionState.APPROVED, ActionState.REJECTED, ActionState.CANCELLED]),
        (ActionState.APPROVED,  [ActionState.EXECUTING, ActionState.CANCELLED]),
        (ActionState.EXECUTING, [ActionState.SUCCEEDED, ActionState.FAILED,
                                  ActionState.OUTCOME_UNKNOWN, ActionState.CANCELLED]),
    ])
    def test_valid_action_transitions(self, current: ActionState, nexts: list[ActionState]):
        for next_state in nexts:
            validate_action_transition(current, next_state)

    @pytest.mark.parametrize("terminal", [
        ActionState.SUCCEEDED,
        ActionState.FAILED,
        ActionState.OUTCOME_UNKNOWN,
        ActionState.REJECTED,
        ActionState.CANCELLED,
    ])
    def test_terminal_action_states_have_no_outgoing(self, terminal: ActionState):
        assert is_action_terminal(terminal)
        assert len(ACTION_TRANSITIONS[terminal]) == 0

    @pytest.mark.parametrize("current,bad_next", [
        (ActionState.PROPOSED,  ActionState.EXECUTING),   # skip APPROVED
        (ActionState.PROPOSED,  ActionState.SUCCEEDED),   # skip to terminal
        (ActionState.APPROVED,  ActionState.SUCCEEDED),   # skip EXECUTING
        (ActionState.SUCCEEDED, ActionState.PROPOSED),    # no reversal from terminal
        (ActionState.FAILED,    ActionState.APPROVED),    # no reversal from FAILED
        (ActionState.REJECTED,  ActionState.APPROVED),    # no exit from REJECTED
    ])
    def test_invalid_action_transitions_raise(self, current: ActionState, bad_next: ActionState):
        with pytest.raises(InvalidTransitionError) as exc_info:
            validate_action_transition(current, bad_next)
        assert exc_info.value.machine == "action"


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Attempt State Machine
# ═══════════════════════════════════════════════════════════════════════════════

class TestAttemptStateMachine:

    def test_started_can_reach_all_terminals(self):
        terminals = [AttemptState.SUCCEEDED, AttemptState.FAILED,
                     AttemptState.TIMEOUT, AttemptState.UNKNOWN]
        for t in terminals:
            validate_attempt_transition(AttemptState.STARTED, t)

    @pytest.mark.parametrize("terminal", [
        AttemptState.SUCCEEDED,
        AttemptState.FAILED,
        AttemptState.TIMEOUT,
        AttemptState.UNKNOWN,
    ])
    def test_terminal_attempt_states_have_no_outgoing(self, terminal: AttemptState):
        assert is_attempt_terminal(terminal)
        assert len(ATTEMPT_TRANSITIONS[terminal]) == 0

    @pytest.mark.parametrize("bad_next", [
        AttemptState.STARTED,    # self-loop
        AttemptState.SUCCEEDED,  # from non-STARTED
    ])
    def test_terminal_attempt_cannot_transition(self, bad_next: AttemptState):
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.FAILED, bad_next)

    def test_started_cannot_stay_started(self):
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.STARTED, AttemptState.STARTED)

    def test_unknown_is_terminal(self):
        """Critical rule: UNKNOWN is terminal — never auto-retried."""
        assert is_attempt_terminal(AttemptState.UNKNOWN)
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.UNKNOWN, AttemptState.STARTED)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Recovery Window
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecoveryWindow:

    def test_window_not_expired_when_ends_at_is_none(self):
        case = make_case(recovery_window_ends_at=None)
        assert not is_recovery_window_expired(case)

    def test_window_not_expired_when_in_future(self):
        future = datetime.now(tz=timezone.utc) + timedelta(hours=1)
        case = make_case(recovery_window_ends_at=future)
        assert not is_recovery_window_expired(case)

    def test_window_expired_when_in_past(self):
        past = datetime.now(tz=timezone.utc) - timedelta(seconds=1)
        case = make_case(recovery_window_ends_at=past)
        assert is_recovery_window_expired(case)

    def test_window_expired_exactly_at_deadline(self):
        """One second past the deadline must be expired."""
        past = datetime.now(tz=timezone.utc) - timedelta(seconds=1)
        case = make_case(recovery_window_ends_at=past)
        assert is_recovery_window_expired(case)

    def test_window_handles_naive_datetime(self):
        """Naive datetimes (no tzinfo) must be treated as UTC."""
        naive_past = (datetime.now(tz=timezone.utc) - timedelta(seconds=10)).replace(tzinfo=None)
        case = make_case(recovery_window_ends_at=naive_past)
        assert is_recovery_window_expired(case)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Idempotency Key Builder
# ═══════════════════════════════════════════════════════════════════════════════

class TestIdempotencyKeyBuilder:

    def test_canonical_format(self):
        mid = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        cid = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        key = build_idempotency_key(mid, cid, "RETRY_PAYMENT")
        assert key == (
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:"
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb:"
            "RETRY_PAYMENT"
        )

    def test_deterministic(self):
        mid, cid = uuid.uuid4(), uuid.uuid4()
        assert build_idempotency_key(mid, cid, "ACT") == build_idempotency_key(mid, cid, "ACT")

    def test_different_action_ids_produce_different_keys(self):
        mid, cid = uuid.uuid4(), uuid.uuid4()
        assert build_idempotency_key(mid, cid, "A") != build_idempotency_key(mid, cid, "B")

    def test_different_case_ids_produce_different_keys(self):
        mid = uuid.uuid4()
        assert (
            build_idempotency_key(mid, uuid.uuid4(), "ACT")
            != build_idempotency_key(mid, uuid.uuid4(), "ACT")
        )

    def test_different_merchant_ids_produce_different_keys(self):
        cid = uuid.uuid4()
        assert (
            build_idempotency_key(uuid.uuid4(), cid, "ACT")
            != build_idempotency_key(uuid.uuid4(), cid, "ACT")
        )

    def test_retry_shares_same_key(self):
        """Multiple attempts on the same action must share the same key."""
        mid, cid = uuid.uuid4(), uuid.uuid4()
        key_attempt_1 = build_idempotency_key(mid, cid, "RETRY_PAYMENT")
        key_attempt_2 = build_idempotency_key(mid, cid, "RETRY_PAYMENT")
        assert key_attempt_1 == key_attempt_2


# ═══════════════════════════════════════════════════════════════════════════════
# 7. AuditService
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuditService:
    """Unit tests for AuditService — uses a mocked session."""

    def _make_svc(self):
        from app.services.audit_service import AuditService
        session = make_mock_session()
        svc = AuditService(session)
        return svc, session

    @pytest.mark.asyncio
    async def test_write_valid_event_type(self):
        svc, session = self._make_svc()
        event = await svc.write(
            merchant_id=uuid.uuid4(),
            correlation_id="corr-001",
            event_type="RecoveryPlanned",
            recovery_case_id=uuid.uuid4(),
        )
        session.add.assert_called_once()
        session.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_write_invalid_event_type_raises(self):
        svc, _ = self._make_svc()
        with pytest.raises(ValueError, match="Unknown audit event type"):
            await svc.write(
                merchant_id=uuid.uuid4(),
                correlation_id="corr-001",
                event_type="BOGUS_EVENT",
            )

    @pytest.mark.asyncio
    async def test_all_canonical_event_types_are_valid(self):
        from app.models.audit_event import AUDIT_EVENT_TYPES
        svc, _ = self._make_svc()
        for event_type in AUDIT_EVENT_TYPES:
            # Should not raise
            await svc.write(
                merchant_id=uuid.uuid4(),
                correlation_id="corr-001",
                event_type=event_type,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# 8. RecoveryService — transition methods
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecoveryService:

    def _make_svc(self):
        from app.services.recovery_service import RecoveryService
        session = make_mock_session()
        # Patch AuditService.write to avoid real DB calls
        svc = RecoveryService(session)
        return svc, session

    @pytest.mark.asyncio
    async def test_transition_case_valid(self):
        svc, session = self._make_svc()
        case = make_case(CaseState.DETECTED)

        audit = AsyncMock()
        audit.write = AsyncMock()

        result = await svc.transition_case(
            case=case,
            new_state=CaseState.ANALYZING,
            audit_svc=audit,
            correlation_id=case.correlation_id,
            event_type="OpportunityDetected",
        )
        assert result.state == CaseState.ANALYZING
        audit.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_transition_case_invalid_raises(self):
        svc, _ = self._make_svc()
        case = make_case(CaseState.CLOSED)
        audit = AsyncMock()

        with pytest.raises(InvalidTransitionError):
            await svc.transition_case(
                case=case,
                new_state=CaseState.ANALYZING,
                audit_svc=audit,
                correlation_id=case.correlation_id,
                event_type="OpportunityDetected",
            )

    @pytest.mark.asyncio
    async def test_transition_action_valid(self):
        svc, _ = self._make_svc()
        action = make_action(ActionState.PROPOSED)
        result = await svc.transition_action(action, ActionState.APPROVED)
        assert result.state == ActionState.APPROVED

    @pytest.mark.asyncio
    async def test_transition_action_invalid_raises(self):
        svc, _ = self._make_svc()
        action = make_action(ActionState.SUCCEEDED)
        with pytest.raises(InvalidTransitionError):
            await svc.transition_action(action, ActionState.PROPOSED)

    @pytest.mark.asyncio
    async def test_transition_attempt_valid(self):
        svc, _ = self._make_svc()
        attempt = make_attempt(AttemptState.STARTED)
        result = await svc.transition_attempt(attempt, AttemptState.SUCCEEDED)
        assert result.state == AttemptState.SUCCEEDED
        assert result.completed_at is not None

    @pytest.mark.asyncio
    async def test_transition_attempt_invalid_raises(self):
        svc, _ = self._make_svc()
        attempt = make_attempt(AttemptState.FAILED)
        with pytest.raises(InvalidTransitionError):
            await svc.transition_attempt(attempt, AttemptState.STARTED)

    @pytest.mark.asyncio
    async def test_transition_sets_recovering_window_start(self):
        """Entering RECOVERING for the first time sets recovery_window_started_at."""
        svc, _ = self._make_svc()
        case = make_case(CaseState.POLICY_CHECK)
        assert case.recovery_window_started_at is None

        audit = AsyncMock()
        audit.write = AsyncMock()

        await svc.transition_case(
            case=case,
            new_state=CaseState.RECOVERING,
            audit_svc=audit,
            correlation_id=case.correlation_id,
            event_type="RecoveryApproved",
        )
        assert case.recovery_window_started_at is not None

    @pytest.mark.asyncio
    async def test_transition_sets_recovered_at(self):
        """Entering RECOVERED sets recovered_at."""
        svc, _ = self._make_svc()
        case = make_case(CaseState.RECOVERING)
        assert case.recovered_at is None

        audit = AsyncMock()
        audit.write = AsyncMock()

        await svc.transition_case(
            case=case,
            new_state=CaseState.RECOVERED,
            audit_svc=audit,
            correlation_id=case.correlation_id,
            event_type="RecoverySucceeded",
        )
        assert case.recovered_at is not None

    @pytest.mark.asyncio
    async def test_create_action_idempotent_returns_existing(self):
        """create_action must return existing action when key matches."""
        from sqlalchemy import select
        svc, session = self._make_svc()

        existing_action = make_action(ActionState.EXECUTING)
        existing_action.idempotency_key = "m:c:ACT"

        # Mock the DB to return the existing action
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_action
        session.execute.return_value = mock_result

        case = make_case()
        action, created = await svc.create_action(
            case=case,
            action_id="ACT",
            execution_mode=ExecutionMode.SIMULATION,
            idempotency_key="m:c:ACT",
        )
        assert not created
        assert action is existing_action

    @pytest.mark.asyncio
    async def test_create_action_new_when_no_match(self):
        """create_action creates a new action when no existing key."""
        svc, session = self._make_svc()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute.return_value = mock_result

        case = make_case()
        action, created = await svc.create_action(
            case=case,
            action_id="ACT",
            execution_mode=ExecutionMode.LIVE,
            idempotency_key="m:c:ACT",
        )
        assert created
        assert action.state == ActionState.PROPOSED
        assert action.idempotency_key == "m:c:ACT"

    @pytest.mark.asyncio
    async def test_create_attempt_uses_monotonic_number(self):
        """attempt_number is derived from DB count of existing attempts."""
        svc, session = self._make_svc()
        action = make_action(ActionState.EXECUTING)

        # Simulate 2 existing attempts → next should be 3
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = 2
        session.execute.return_value = mock_count_result

        attempt = await svc.create_attempt(action)
        assert attempt.attempt_number == 3
        assert attempt.state == AttemptState.STARTED
        assert attempt.started_at is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 9. RecoveryOrchestrator — Happy Path
# ═══════════════════════════════════════════════════════════════════════════════

class TestOrchestratorHappyPath:
    """
    Test the full happy-path lifecycle without a real DB.

    All DB interactions are mocked. We verify:
      - state transitions occur in the right order
      - audit events are written at each step
    """

    def _make_orchestrator(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator
        session = make_mock_session()
        orch = RecoveryOrchestrator(session)
        return orch, session

    @pytest.mark.asyncio
    async def test_begin_analysis(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.DETECTED)
        result = await orch.begin_analysis(case)
        assert result.state == CaseState.ANALYZING

    @pytest.mark.asyncio
    async def test_record_prediction_with_confidence(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.ANALYZING)
        result = await orch.record_prediction(case, confidence=0.87)
        assert result.state == CaseState.PREDICTED
        assert result.confidence == pytest.approx(0.87)

    @pytest.mark.asyncio
    async def test_record_diagnosis(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.PREDICTED)
        result = await orch.record_diagnosis(case)
        assert result.state == CaseState.DIAGNOSED

    @pytest.mark.asyncio
    async def test_plan_recovery(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.DIAGNOSED)
        result = await orch.plan_recovery(case)
        assert result.state == CaseState.PLANNED

    @pytest.mark.asyncio
    async def test_check_policy(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.PLANNED)
        result = await orch.check_policy(case)
        assert result.state == CaseState.POLICY_CHECK

    @pytest.mark.asyncio
    async def test_begin_recovery(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.POLICY_CHECK)
        result = await orch.begin_recovery(case)
        assert result.state == CaseState.RECOVERING

    @pytest.mark.asyncio
    async def test_begin_recovery_sets_window_started(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.POLICY_CHECK)
        assert case.recovery_window_started_at is None
        result = await orch.begin_recovery(case)
        assert result.recovery_window_started_at is not None

    @pytest.mark.asyncio
    async def test_full_happy_path_sequence(self):
        """DETECTED → ANALYZING → ... → RECOVERED."""
        orch, session = self._make_orchestrator()

        # Setup mocks for create_action and create_attempt DB calls
        mock_no_existing = MagicMock()
        mock_no_existing.scalar_one_or_none.return_value = None
        mock_count_zero = MagicMock()
        mock_count_zero.scalar_one.return_value = 0

        call_count = 0
        async def mock_execute(stmt, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            # Alternate between no-existing-action and zero-count results
            if call_count % 2 == 1:
                return mock_no_existing
            return mock_count_zero

        session.execute = mock_execute

        case = make_case(CaseState.DETECTED)

        case = await orch.begin_analysis(case)
        assert case.state == CaseState.ANALYZING

        case = await orch.record_prediction(case, confidence=0.9)
        assert case.state == CaseState.PREDICTED

        case = await orch.record_diagnosis(case)
        assert case.state == CaseState.DIAGNOSED

        case = await orch.plan_recovery(case)
        assert case.state == CaseState.PLANNED

        case = await orch.check_policy(case)
        assert case.state == CaseState.POLICY_CHECK

        case = await orch.begin_recovery(case)
        assert case.state == CaseState.RECOVERING

        action, attempt = await orch.execute_action(
            case=case,
            action_id="RETRY_PAYMENT",
            execution_mode=ExecutionMode.SIMULATION,
        )
        assert action.state == ActionState.EXECUTING
        assert attempt.state == AttemptState.STARTED
        assert attempt.attempt_number == 1

        attempt, action, case = await orch.record_attempt_outcome(
            attempt=attempt,
            action=action,
            case=case,
            outcome=AttemptState.SUCCEEDED,
            correlation_id=case.correlation_id,
        )
        assert attempt.state == AttemptState.SUCCEEDED
        assert action.state == ActionState.SUCCEEDED
        assert case.state == CaseState.RECOVERED
        assert case.recovered_at is not None

        case = await orch.complete_recovery(case)
        assert case.state == CaseState.CLOSED


# ═══════════════════════════════════════════════════════════════════════════════
# 10. Recovery Window Expiry Path
# ═══════════════════════════════════════════════════════════════════════════════

class TestOrchestratorWindowExpiry:

    def _make_orchestrator(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator
        session = make_mock_session()
        return RecoveryOrchestrator(session), session

    @pytest.mark.asyncio
    async def test_expire_window_transitions_to_expired_then_closed(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.RECOVERING)

        result = await orch.expire_window(case)
        # expire_window: RECOVERING → RECOVERY_WINDOW_EXPIRED → CLOSED
        assert result.state == CaseState.CLOSED

    @pytest.mark.asyncio
    async def test_is_recovery_window_expired_detected_before_expiry(self):
        """Orchestrator callers should call is_recovery_window_expired() before executing."""
        past = datetime.now(tz=timezone.utc) - timedelta(hours=2)
        case = make_case(
            state=CaseState.RECOVERING,
            recovery_window_ends_at=past,
        )
        assert is_recovery_window_expired(case)

    @pytest.mark.asyncio
    async def test_cannot_expire_window_from_non_recovering(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.PLANNED)  # not RECOVERING
        with pytest.raises(InvalidTransitionError):
            await orch.expire_window(case)


# ═══════════════════════════════════════════════════════════════════════════════
# 11. UNKNOWN Outcome — Critical Rule
# ═══════════════════════════════════════════════════════════════════════════════

class TestUnknownOutcome:
    """
    Critical rule: UNKNOWN outcome MUST NOT be auto-retried.
    Attempt → UNKNOWN, Action → OUTCOME_UNKNOWN, AuditEvent ManualReviewCreated.
    """

    def _make_orchestrator(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator
        session = make_mock_session()
        return RecoveryOrchestrator(session), session

    @pytest.mark.asyncio
    async def test_unknown_outcome_sets_correct_states(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.RECOVERING)
        action = make_action(ActionState.EXECUTING, merchant_id=case.merchant_id)
        attempt = make_attempt(AttemptState.STARTED)

        result_attempt, result_action, result_case = await orch.record_attempt_outcome(
            attempt=attempt,
            action=action,
            case=case,
            outcome=AttemptState.UNKNOWN,
            correlation_id=case.correlation_id,
        )
        assert result_attempt.state == AttemptState.UNKNOWN
        assert result_action.state == ActionState.OUTCOME_UNKNOWN
        # Case stays in RECOVERING — not auto-advanced
        assert result_case.state == CaseState.RECOVERING

    @pytest.mark.asyncio
    async def test_unknown_is_terminal_on_attempt(self):
        """No further transitions out of UNKNOWN attempt state."""
        assert is_attempt_terminal(AttemptState.UNKNOWN)

    @pytest.mark.asyncio
    async def test_outcome_unknown_is_terminal_on_action(self):
        """No further transitions out of OUTCOME_UNKNOWN action state."""
        assert is_action_terminal(ActionState.OUTCOME_UNKNOWN)

    @pytest.mark.asyncio
    async def test_unknown_writes_manual_review_audit_event(self):
        """UNKNOWN outcome must write a ManualReviewCreated audit event."""
        from app.services.recovery_service import RecoveryService
        from app.services.audit_service import AuditService

        session = make_mock_session()
        svc = RecoveryService(session)
        audit = AuditService(session)

        case = make_case(CaseState.RECOVERING)
        action = make_action(ActionState.EXECUTING, merchant_id=case.merchant_id)
        attempt = make_attempt(AttemptState.STARTED)

        written_events: list[str] = []

        async def capture_write(**kwargs):
            written_events.append(kwargs["event_type"])
            return AuditEvent(
                id=uuid.uuid4(),
                merchant_id=kwargs.get("merchant_id", uuid.uuid4()),
                correlation_id=kwargs.get("correlation_id", "corr"),
                event_type=kwargs["event_type"],
            )

        audit.write = capture_write  # type: ignore

        await svc.handle_unknown_outcome(
            attempt=attempt,
            action=action,
            case=case,
            audit_svc=audit,
            correlation_id=case.correlation_id,
        )
        assert "ManualReviewCreated" in written_events

    @pytest.mark.asyncio
    async def test_cannot_transition_attempt_from_unknown(self):
        """Once UNKNOWN, the attempt cannot be transitioned further."""
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.UNKNOWN, AttemptState.STARTED)

    @pytest.mark.asyncio
    async def test_cannot_transition_action_from_outcome_unknown(self):
        """Once OUTCOME_UNKNOWN, the action cannot be transitioned further."""
        with pytest.raises(InvalidTransitionError):
            validate_action_transition(ActionState.OUTCOME_UNKNOWN, ActionState.PROPOSED)


# ═══════════════════════════════════════════════════════════════════════════════
# 12. Retry Path
# ═══════════════════════════════════════════════════════════════════════════════

class TestRetryPath:
    """
    Retry rule:
      - A retry creates a NEW Attempt under the SAME Action.
      - Before retrying: Case → POLICY_CHECK (policy re-evaluated).
      - UNKNOWN is never retried.
    """

    def _make_orchestrator(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator
        session = make_mock_session()
        # Mock attempt count query for create_attempt
        mock_count = MagicMock()
        mock_count.scalar_one.return_value = 1  # 1 existing attempt → next is 2
        session.execute = AsyncMock(return_value=mock_count)
        return RecoveryOrchestrator(session), session

    @pytest.mark.asyncio
    async def test_retry_creates_new_attempt(self):
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.RECOVERING)
        action = make_action(ActionState.FAILED, merchant_id=case.merchant_id)

        new_attempt = await orch.retry_action(
            action=action,
            case=case,
            correlation_id=case.correlation_id,
        )
        assert new_attempt.state == AttemptState.STARTED
        assert new_attempt.attempt_number == 2  # second attempt

    @pytest.mark.asyncio
    async def test_retry_cycles_case_through_policy_check(self):
        orch, session = self._make_orchestrator()
        case = make_case(CaseState.RECOVERING)
        action = make_action(ActionState.FAILED, merchant_id=case.merchant_id)

        # Track states visited
        states_visited: list[CaseState] = [case.state]

        original_transition = orch._svc.transition_case

        async def track_transition(case, new_state, **kwargs):
            result = await original_transition(case=case, new_state=new_state, **kwargs)
            states_visited.append(new_state)
            return result

        orch._svc.transition_case = track_transition  # type: ignore

        await orch.retry_action(
            action=action,
            case=case,
            correlation_id=case.correlation_id,
        )

        assert CaseState.POLICY_CHECK in states_visited
        assert CaseState.RECOVERING in states_visited
        # POLICY_CHECK must come before the second RECOVERING
        policy_idx = states_visited.index(CaseState.POLICY_CHECK)
        recovering_idx = len(states_visited) - 1 - list(reversed(states_visited)).index(CaseState.RECOVERING)
        assert policy_idx < recovering_idx

    @pytest.mark.asyncio
    async def test_retry_same_action_preserves_idempotency_key(self):
        """A retry does NOT create a new RecoveryAction — same idempotency_key."""
        orch, _ = self._make_orchestrator()
        case = make_case(CaseState.RECOVERING)
        action = make_action(ActionState.FAILED, merchant_id=case.merchant_id)
        original_key = action.idempotency_key

        await orch.retry_action(
            action=action,
            case=case,
            correlation_id=case.correlation_id,
        )
        # Action's idempotency_key must not change
        assert action.idempotency_key == original_key

    @pytest.mark.asyncio
    async def test_failed_outcome_keeps_case_recovering(self):
        """After a FAILED attempt, case stays in RECOVERING (not closed)."""
        from app.orchestrator.orchestrator import RecoveryOrchestrator
        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        case = make_case(CaseState.RECOVERING)
        action = make_action(ActionState.EXECUTING, merchant_id=case.merchant_id)
        attempt = make_attempt(AttemptState.STARTED)

        _, _, result_case = await orch.record_attempt_outcome(
            attempt=attempt,
            action=action,
            case=case,
            outcome=AttemptState.FAILED,
            correlation_id=case.correlation_id,
        )
        # Case must stay in RECOVERING (not CLOSED, not RECOVERED)
        assert result_case.state == CaseState.RECOVERING

    @pytest.mark.asyncio
    async def test_timeout_outcome_keeps_case_recovering(self):
        """TIMEOUT is treated the same as FAILED — case stays RECOVERING."""
        from app.orchestrator.orchestrator import RecoveryOrchestrator
        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        case = make_case(CaseState.RECOVERING)
        action = make_action(ActionState.EXECUTING, merchant_id=case.merchant_id)
        attempt = make_attempt(AttemptState.STARTED)

        _, _, result_case = await orch.record_attempt_outcome(
            attempt=attempt,
            action=action,
            case=case,
            outcome=AttemptState.TIMEOUT,
            correlation_id=case.correlation_id,
        )
        assert result_case.state == CaseState.RECOVERING


# ═══════════════════════════════════════════════════════════════════════════════
# 13. Idempotency — Execute Action
# ═══════════════════════════════════════════════════════════════════════════════

class TestExecuteActionIdempotency:

    @pytest.mark.asyncio
    async def test_duplicate_idempotency_key_returns_existing_action(self):
        """Calling execute_action with an existing key returns the existing action."""
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        existing_action = make_action(ActionState.EXECUTING)
        existing_action.idempotency_key = "m:c:RETRY_PAYMENT"

        mock_count = MagicMock()
        mock_count.scalar_one.return_value = 1  # 1 existing attempt

        call_num = 0
        async def mock_execute(stmt, *a, **kw):
            nonlocal call_num
            call_num += 1
            if call_num == 1:
                # First call = create_action lookup → return existing
                r = MagicMock()
                r.scalar_one_or_none.return_value = existing_action
                return r
            else:
                # Second call = create_attempt count
                return mock_count

        session.execute = mock_execute
        case = make_case(CaseState.RECOVERING)

        action, attempt = await orch.execute_action(
            case=case,
            action_id="RETRY_PAYMENT",
            execution_mode=ExecutionMode.LIVE,
            idempotency_key="m:c:RETRY_PAYMENT",
        )
        # Must return the existing action (not create a new one)
        assert action is existing_action
        # But a new attempt IS created
        assert attempt.state == AttemptState.STARTED
        assert attempt.attempt_number == 2

    @pytest.mark.asyncio
    async def test_execute_action_builds_key_if_not_provided(self):
        """If idempotency_key is None, it should be built from components."""
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        mock_no_existing = MagicMock()
        mock_no_existing.scalar_one_or_none.return_value = None
        mock_count_zero = MagicMock()
        mock_count_zero.scalar_one.return_value = 0

        call_num = 0
        async def mock_execute(stmt, *a, **kw):
            nonlocal call_num
            call_num += 1
            if call_num == 1:
                return mock_no_existing
            return mock_count_zero

        session.execute = mock_execute
        case = make_case(CaseState.RECOVERING)

        action, attempt = await orch.execute_action(
            case=case,
            action_id="SEND_SMS",
            execution_mode=ExecutionMode.SIMULATION,
            idempotency_key=None,  # Must be auto-built
        )
        expected_key = build_idempotency_key(case.merchant_id, case.id, "SEND_SMS")
        assert action.idempotency_key == expected_key


# ═══════════════════════════════════════════════════════════════════════════════
# 14. Audit Events — Emitted at Each Transition
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuditEventsEmitted:
    """Verify audit events are written for each orchestrator step."""

    @pytest.mark.asyncio
    async def test_every_case_transition_writes_audit_event(self):
        """Each orchestrator call must call audit_svc.write at least once."""
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        written_events: list[str] = []

        async def capture(**kwargs):
            written_events.append(kwargs["event_type"])
            return AuditEvent(
                id=uuid.uuid4(),
                merchant_id=kwargs.get("merchant_id", uuid.uuid4()),
                correlation_id=kwargs.get("correlation_id", "corr"),
                event_type=kwargs["event_type"],
            )

        orch._audit.write = capture  # type: ignore

        case = make_case(CaseState.DETECTED)
        await orch.begin_analysis(case)
        assert "OpportunityDetected" in written_events

        case.state = CaseState.ANALYZING
        await orch.record_prediction(case)
        assert "PredictionCreated" in written_events

        case.state = CaseState.PREDICTED
        await orch.record_diagnosis(case)
        assert "DiagnosisCreated" in written_events

        case.state = CaseState.DIAGNOSED
        await orch.plan_recovery(case)
        assert "RecoveryPlanned" in written_events

        case.state = CaseState.PLANNED
        await orch.check_policy(case)
        assert "PolicyEvaluated" in written_events

        case.state = CaseState.POLICY_CHECK
        await orch.begin_recovery(case)
        assert "RecoveryApproved" in written_events

    @pytest.mark.asyncio
    async def test_closure_writes_case_closed_event(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        written_events: list[str] = []

        async def capture(**kwargs):
            written_events.append(kwargs["event_type"])
            return AuditEvent(
                id=uuid.uuid4(),
                merchant_id=kwargs.get("merchant_id", uuid.uuid4()),
                correlation_id=kwargs.get("correlation_id", "corr"),
                event_type=kwargs["event_type"],
            )

        orch._audit.write = capture  # type: ignore

        case = make_case(CaseState.RECOVERED)
        await orch.complete_recovery(case)
        assert "CaseClosed" in written_events

    @pytest.mark.asyncio
    async def test_window_expiry_writes_expired_event(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        written_events: list[str] = []

        async def capture(**kwargs):
            written_events.append(kwargs["event_type"])
            return AuditEvent(
                id=uuid.uuid4(),
                merchant_id=kwargs.get("merchant_id", uuid.uuid4()),
                correlation_id=kwargs.get("correlation_id", "corr"),
                event_type=kwargs["event_type"],
            )

        orch._audit.write = capture  # type: ignore

        case = make_case(CaseState.RECOVERING)
        await orch.expire_window(case)
        assert "RecoveryWindowExpired" in written_events
        assert "CaseClosed" in written_events


# ═══════════════════════════════════════════════════════════════════════════════
# 15. Case Closure — All Paths
# ═══════════════════════════════════════════════════════════════════════════════

class TestCaseClosure:

    @pytest.mark.asyncio
    async def test_close_case_from_recovered(self):
        from app.services.recovery_service import RecoveryService
        session = make_mock_session()
        svc = RecoveryService(session)
        audit = AsyncMock()
        audit.write = AsyncMock()

        case = make_case(CaseState.RECOVERED)
        result = await svc.close_case(case, audit, case.correlation_id)
        assert result.state == CaseState.CLOSED

    @pytest.mark.asyncio
    async def test_close_case_from_window_expired(self):
        from app.services.recovery_service import RecoveryService
        session = make_mock_session()
        svc = RecoveryService(session)
        audit = AsyncMock()
        audit.write = AsyncMock()

        case = make_case(CaseState.RECOVERY_WINDOW_EXPIRED)
        result = await svc.close_case(case, audit, case.correlation_id)
        assert result.state == CaseState.CLOSED

    @pytest.mark.asyncio
    async def test_close_case_from_closed_raises(self):
        """Cannot close an already-closed case."""
        from app.services.recovery_service import RecoveryService
        session = make_mock_session()
        svc = RecoveryService(session)
        audit = AsyncMock()

        case = make_case(CaseState.CLOSED)
        with pytest.raises(InvalidTransitionError):
            await svc.close_case(case, audit, case.correlation_id)

    @pytest.mark.asyncio
    async def test_force_close_from_any_non_terminal(self):
        """Any non-terminal case can be transitioned to CLOSED directly."""
        non_terminal_states = [
            CaseState.DETECTED, CaseState.ANALYZING, CaseState.PREDICTED,
            CaseState.DIAGNOSED, CaseState.PLANNED, CaseState.POLICY_CHECK,
            CaseState.RECOVERING, CaseState.RECOVERED,
            CaseState.RECOVERY_WINDOW_EXPIRED,
        ]
        for state in non_terminal_states:
            validate_case_transition(state, CaseState.CLOSED)


# ═══════════════════════════════════════════════════════════════════════════════
# 16. Correlation ID Propagation
# ═══════════════════════════════════════════════════════════════════════════════

class TestCorrelationIdPropagation:
    """correlation_id must be consistent across all events in a case lifecycle."""

    @pytest.mark.asyncio
    async def test_correlation_id_propagated_to_audit_events(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = make_mock_session()
        orch = RecoveryOrchestrator(session)

        correlation_ids_seen: list[str] = []

        async def capture(**kwargs):
            correlation_ids_seen.append(kwargs["correlation_id"])
            return AuditEvent(
                id=uuid.uuid4(),
                merchant_id=kwargs.get("merchant_id", uuid.uuid4()),
                correlation_id=kwargs.get("correlation_id", "corr"),
                event_type=kwargs["event_type"],
            )

        orch._audit.write = capture  # type: ignore

        case = make_case(CaseState.DETECTED)
        expected_corr = case.correlation_id

        await orch.begin_analysis(case)

        for cid in correlation_ids_seen:
            assert cid == expected_corr, (
                f"correlation_id mismatch: expected {expected_corr!r}, got {cid!r}"
            )

    def test_build_idempotency_key_is_canonical(self):
        """All components of the key must be present in canonical format."""
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        key = build_idempotency_key(mid, cid, "RETRY_PAYMENT")
        assert str(mid) in key
        assert str(cid) in key
        assert "RETRY_PAYMENT" in key
        assert key.count(":") >= 2
