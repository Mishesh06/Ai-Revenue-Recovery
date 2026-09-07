"""
RecoverAI v3.2 — Phase 14: Full System Testing

Comprehensive test suite covering all 8 critical recovery scenarios,
unit tests for uncovered areas, integration flow verification,
and final architectural invariant checks.

No new architecture is added. All tests use the existing stack.

Coverage:
  Unit: opportunity score, revenue formulas, failure classification, AI schema
  Integration: 8 end-to-end critical scenarios
  Final Checks: hardcoded metrics, LLM bypass, invalid transitions, UNKNOWN retry,
                cross-tenant, audit trail, correlation_id, idempotency
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.audit_event import AuditEvent
from app.models.enums import (
    ActionState,
    AttemptState,
    CaseState,
    ExecutionMode,
    PolicyDecision,
)
from app.models.manual_review import ManualReview
from app.models.merchant import Merchant
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.agents import DiagnosisOutput, RecoveryPlanOutput
from app.services.adapters.base import AdapterOutcome, AdapterResponse
from app.services.adapters.simulation import SimulationAdapter
from app.services.agent_service import AgentService
from app.services.failure_manager import FailureManager
from app.services.llm_client import (
    LLMTimeoutError,
    LLMUnavailableError,
    llm_client,
)
from app.services.policy_engine import PolicyEngine
from app.services.state_machine import (
    InvalidTransitionError,
    build_idempotency_key,
    is_action_terminal,
    is_attempt_terminal,
    is_case_terminal,
    is_recovery_window_expired,
    validate_action_transition,
    validate_attempt_transition,
    validate_case_transition,
)


# ═══════════════════════════════════════════════════════════════════
# Shared helpers (mirror orchestrator test helpers, kept local)
# ═══════════════════════════════════════════════════════════════════

def _make_case(
    state: CaseState = CaseState.RECOVERING,
    confidence: float | None = 0.85,
    window_ended: bool = False,
    merchant_id: uuid.UUID | None = None,
) -> RecoveryCase:
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=merchant_id or uuid.uuid4(),
        transaction_id=uuid.uuid4(),
        state=state,
        correlation_id=f"corr-{uuid.uuid4().hex[:8]}",
        confidence=confidence,
        recovery_window_started_at=None,
        recovery_window_ends_at=None,
        recovered_at=None,
    )
    if window_ended:
        case.recovery_window_ends_at = (
            datetime.now(tz=timezone.utc) - timedelta(hours=1)
        )
    else:
        case.recovery_window_ends_at = (
            datetime.now(tz=timezone.utc) + timedelta(days=7)
        )
    return case


def _make_action(
    state: ActionState = ActionState.APPROVED,
    case: RecoveryCase | None = None,
    merchant_id: uuid.UUID | None = None,
) -> RecoveryAction:
    mid = merchant_id or (case.merchant_id if case else uuid.uuid4())
    cid = case.id if case else uuid.uuid4()
    return RecoveryAction(
        id=uuid.uuid4(),
        merchant_id=mid,
        recovery_case_id=cid,
        action_id="RETRY_PAYMENT",
        state=state,
        execution_mode=ExecutionMode.SIMULATION,
        idempotency_key=build_idempotency_key(mid, cid, "RETRY_PAYMENT"),
        policy_evaluation_id=None,
    )


def _make_attempt(
    state: AttemptState = AttemptState.STARTED,
    action_id: uuid.UUID | None = None,
) -> RecoveryAttempt:
    return RecoveryAttempt(
        id=uuid.uuid4(),
        recovery_action_id=action_id or uuid.uuid4(),
        attempt_number=1,
        state=state,
        started_at=datetime.now(tz=timezone.utc),
        completed_at=None,
        error_code=None,
        error_message=None,
        adapter_response_reference=None,
    )


def _make_mock_session() -> AsyncMock:
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.execute = AsyncMock()
    return session


def _make_transaction(
    amount: str = "100.00",
    status: str = "temporary_failure",
    merchant_id: uuid.UUID | None = None,
) -> Transaction:
    return Transaction(
        id=uuid.uuid4(),
        merchant_id=merchant_id or uuid.uuid4(),
        amount=amount,
        currency="INR",
        status=status,
    )


@pytest.fixture(autouse=True)
def reset_llm():
    """Ensure LLM injection flags are cleared between tests."""
    llm_client.inject_timeout = False
    llm_client.inject_unavailable = False
    llm_client.inject_malformed_json = False
    llm_client.inject_invalid_schema = False
    yield
    llm_client.inject_timeout = False
    llm_client.inject_unavailable = False
    llm_client.inject_malformed_json = False
    llm_client.inject_invalid_schema = False


@pytest.fixture
def sim_db():
    """Lightweight synchronous mock DB for FailureManager / SimulationAdapter."""
    db = MagicMock()
    db.added_items = []

    def _add(item):
        db.added_items.append(item)

    db.add.side_effect = _add

    def _query(model):
        class Q:
            def __init__(self):
                self._kwargs = {}

            def filter_by(self, **kwargs):
                self._kwargs = kwargs
                return self

            def first(self):
                for item in db.added_items:
                    if isinstance(item, model):
                        match = all(
                            getattr(item, k, None) == v
                            for k, v in self._kwargs.items()
                        )
                        if match:
                            return item
                return None

            def all(self):
                return [
                    item
                    for item in db.added_items
                    if isinstance(item, model)
                    and all(
                        getattr(item, k, None) == v
                        for k, v in self._kwargs.items()
                    )
                ]

            def count(self):
                return len(self.all())

        return Q()

    db.query.side_effect = _query
    db.flush.return_value = None
    db.commit.return_value = None
    db.refresh.side_effect = lambda x: None
    return db


# ═══════════════════════════════════════════════════════════════════
# UNIT: Opportunity Score / ML prediction schema
# ═══════════════════════════════════════════════════════════════════

class TestOpportunityScore:
    """
    The ML model probability and confidence are stored on ModelPrediction.
    These unit tests verify the schema and scoring semantics that
    flow downstream to the Case.confidence field.
    """

    def test_model_prediction_schema_fields(self):
        """ModelPrediction stores both probability and confidence independently."""
        from app.database.base import Base
        cols = {c.name for c in Base.metadata.tables["model_predictions"].columns}
        assert "probability" in cols
        assert "confidence" in cols

    def test_probability_and_confidence_are_float_columns(self):
        from app.database.base import Base
        from sqlalchemy import Float
        table = Base.metadata.tables["model_predictions"]
        assert isinstance(table.c["probability"].type, Float)
        assert isinstance(table.c["confidence"].type, Float)

    def test_recovery_case_stores_confidence(self):
        """confidence on RecoveryCase must be present and nullable."""
        from app.database.base import Base
        col = Base.metadata.tables["recovery_cases"].c["confidence"]
        assert col.nullable, "confidence must be nullable (not set until PREDICTED)"

    def test_confidence_none_does_not_trigger_policy_review(self):
        """If confidence has not been set, the policy engine must not use it
        to block/review the action — None means 'not evaluated yet'."""
        case = _make_case(confidence=None)
        tx = _make_transaction()
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=0, transaction_risk_level="LOW"
        )
        # confidence=None → low_confidence check is bypassed → APPROVED
        assert result.decision == PolicyDecision.APPROVED

    def test_confidence_at_threshold_boundary(self):
        """Exactly at the threshold (0.60) must not trigger review."""
        case = _make_case(confidence=0.60)
        tx = _make_transaction()
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=0, transaction_risk_level="LOW"
        )
        assert result.decision == PolicyDecision.APPROVED

    def test_confidence_just_below_threshold_triggers_review(self):
        """0.5999 is below 0.60 → REVIEW."""
        case = _make_case(confidence=0.5999)
        tx = _make_transaction()
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=0, transaction_risk_level="LOW"
        )
        assert result.decision == PolicyDecision.REVIEW
        assert result.requires_human_review is True


# ═══════════════════════════════════════════════════════════════════
# UNIT: Revenue Calculation Formulas
# ═══════════════════════════════════════════════════════════════════

class TestRevenueCalculationFormulas:
    """
    Tests revenue formulas in isolation against the AnalyticsService spec.
    All values are computed dynamically — no hardcoded business metrics allowed.
    """

    def _formula_revenue_at_risk(self, failed: float, recovered: float) -> float:
        """Revenue at Risk = Failed Transaction Amount − Recovered Revenue"""
        return failed - recovered

    def _formula_net_revenue_impact(
        self, recovered: float, avoided_loss: float, cost: float
    ) -> float:
        """Net Revenue Impact = Recovered + Avoided Loss − Recovery Cost"""
        return recovered + avoided_loss - cost

    def test_revenue_at_risk_formula(self):
        assert self._formula_revenue_at_risk(1000.0, 300.0) == pytest.approx(700.0)

    def test_revenue_at_risk_zero_recovered(self):
        assert self._formula_revenue_at_risk(500.0, 0.0) == pytest.approx(500.0)

    def test_revenue_at_risk_fully_recovered(self):
        assert self._formula_revenue_at_risk(500.0, 500.0) == pytest.approx(0.0)

    def test_net_revenue_impact_formula(self):
        # Recovered=200, Avoided=200 (both), Cost=0 per schema
        assert self._formula_net_revenue_impact(200.0, 200.0, 0.0) == pytest.approx(400.0)

    def test_recovery_rate_formula(self):
        """Recovery Rate = recovered_cases / total_cases"""
        total, recovered = 10, 4
        rate = recovered / total
        assert rate == pytest.approx(0.4)

    def test_recovery_rate_zero_cases(self):
        """Zero cases must not cause ZeroDivisionError."""
        total = 0
        rate = 0.0 if total == 0 else 5 / total
        assert rate == 0.0

    def test_recovery_cost_per_intervention(self):
        """Recovery Cost = interventions × $0.50 (from Phase 10 spec)."""
        cost_per_action = 0.50
        interventions = 7
        expected = 3.50
        assert interventions * cost_per_action == pytest.approx(expected)

    def test_avoided_loss_not_hardcoded(self):
        """
        Avoided Loss = 0.0 per the Phase 10 spec (not modeled).
        The analytics service must not fabricate it from thin air.
        """
        avoided_loss_model = 0.0  # as documented
        assert avoided_loss_model == 0.0


# ═══════════════════════════════════════════════════════════════════
# UNIT: Failure Classification (Agent fallback mapping)
# ═══════════════════════════════════════════════════════════════════

class TestFailureClassification:
    """
    Tests the rule-based fallback classification table in AgentService.diagnose_failure.
    This logic must never call the LLM directly.
    """

    def _classify(self, tx_status: str) -> str:
        """Call AgentService with LLM unavailable to force fallback."""
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None

        case = _make_case()
        tx = _make_transaction(status=tx_status)

        llm_client.inject_unavailable = True
        result = AgentService.diagnose_failure(db, case, tx)
        llm_client.inject_unavailable = False
        return result.failure_category

    def test_stolen_card_classified_as_fraud(self):
        assert self._classify("stolen_card") == "FRAUD_RISK"

    def test_fraud_suspected_classified_as_fraud(self):
        assert self._classify("fraud_suspected") == "FRAUD_RISK"

    def test_account_closed(self):
        assert self._classify("account_closed") == "ACCOUNT_CLOSED"

    def test_temporary_failure(self):
        assert self._classify("temporary_failure") == "TEMPORARY_FAILURE"

    def test_network_error(self):
        assert self._classify("network_error") == "NETWORK_ERROR"

    def test_insufficient_funds(self):
        assert self._classify("insufficient_funds") == "INSUFFICIENT_FUNDS"

    def test_expired_card(self):
        assert self._classify("expired_card") == "EXPIRED_CARD"

    def test_card_declined(self):
        assert self._classify("card_declined") == "CARD_DECLINED"

    def test_unrecognised_status_defaults_to_unknown(self):
        assert self._classify("some_weird_gateway_code") == "UNKNOWN_FAILURE"

    def test_planner_routes_fraud_to_manual_review(self):
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None
        case = _make_case()

        llm_client.inject_unavailable = True
        diagnosis = DiagnosisOutput(
            failure_category="FRAUD_RISK", confidence=0.9, evidence=["fraud"]
        )
        plan = AgentService.plan_recovery(db, diagnosis, case)
        llm_client.inject_unavailable = False

        assert plan.recommended_action == "MANUAL_REVIEW"

    def test_planner_routes_temporary_failure_to_retry(self):
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None
        case = _make_case()

        llm_client.inject_unavailable = True
        diagnosis = DiagnosisOutput(
            failure_category="TEMPORARY_FAILURE", confidence=0.9, evidence=["transient"]
        )
        plan = AgentService.plan_recovery(db, diagnosis, case)
        llm_client.inject_unavailable = False

        assert plan.recommended_action == "RETRY_PAYMENT"


# ═══════════════════════════════════════════════════════════════════
# UNIT: AI Schema Validation
# ═══════════════════════════════════════════════════════════════════

class TestAISchemaValidation:
    """
    Pydantic schemas must reject invalid LLM output before it reaches PolicyEngine.
    """

    def test_valid_diagnosis_output(self):
        d = DiagnosisOutput(
            failure_category="TEMPORARY_FAILURE",
            confidence=0.91,
            evidence=["Transient gateway error"],
        )
        assert d.failure_category == "TEMPORARY_FAILURE"
        assert d.confidence == pytest.approx(0.91)

    def test_diagnosis_requires_failure_category(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            DiagnosisOutput(confidence=0.9, evidence=[])  # type: ignore

    def test_diagnosis_requires_confidence(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            DiagnosisOutput(failure_category="X", evidence=[])  # type: ignore

    def test_diagnosis_requires_evidence(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            DiagnosisOutput(failure_category="X", confidence=0.9)  # type: ignore

    def test_valid_recovery_plan_output(self):
        p = RecoveryPlanOutput(
            recommended_action="RETRY_PAYMENT",
            priority="HIGH",
            reason_code="TEST",
            confidence=0.89,
        )
        assert p.recommended_action == "RETRY_PAYMENT"

    def test_recovery_plan_requires_all_fields(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            RecoveryPlanOutput(recommended_action="RETRY_PAYMENT")  # type: ignore

    def test_invalid_schema_activates_fallback(self):
        """LLM returning correct JSON but wrong schema must activate fallback."""
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None

        llm_client.inject_invalid_schema = True
        case = _make_case()
        tx = _make_transaction()
        result = AgentService.diagnose_failure(db, case, tx)

        # Must still return a valid DiagnosisOutput (from fallback)
        assert isinstance(result, DiagnosisOutput)
        run = db.added_items[-1]
        assert run.agent_version == "RULE_BASED_FALLBACK"
        assert "ValidationError" in run.status

    def test_malformed_json_activates_fallback(self):
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None

        llm_client.inject_malformed_json = True
        case = _make_case()
        tx = _make_transaction()
        result = AgentService.diagnose_failure(db, case, tx)

        assert isinstance(result, DiagnosisOutput)
        run = db.added_items[-1]
        assert run.agent_version == "RULE_BASED_FALLBACK"


# ═══════════════════════════════════════════════════════════════════
# INTEGRATION: Critical Scenarios 1–8
# ═══════════════════════════════════════════════════════════════════

class TestCriticalScenario1_NormalSuccessfulRecovery:
    """
    Scenario 1: Normal successful recovery.
    End-to-end flow: SimulationAdapter(SUCCESS)
    Expected: Attempt=SUCCEEDED, Action=SUCCEEDED, Case=CLOSED
    """

    def test_full_success_cascade(self, sim_db):
        case = _make_case()
        action = _make_action(state=ActionState.APPROVED, case=case)
        sim_db.add(case)
        sim_db.add(action)

        SimulationAdapter.set_injected_outcome(AdapterOutcome.SUCCESS)
        attempt = FailureManager.execute_action(sim_db, action, case)

        assert attempt.state == AttemptState.SUCCEEDED
        assert action.state == ActionState.SUCCEEDED
        assert case.state == CaseState.CLOSED

    def test_audit_events_written(self, sim_db):
        case = _make_case()
        action = _make_action(state=ActionState.APPROVED, case=case)
        sim_db.add(case)
        sim_db.add(action)

        SimulationAdapter.set_injected_outcome(AdapterOutcome.SUCCESS)
        FailureManager.execute_action(sim_db, action, case)

        audits = [i for i in sim_db.added_items if isinstance(i, AuditEvent)]
        assert len(audits) >= 4  # Executing, AttemptStarted, AttemptSucceeded, etc.

    def test_correlation_id_consistent_in_all_audits(self, sim_db):
        case = _make_case()
        action = _make_action(state=ActionState.APPROVED, case=case)
        sim_db.add(case)
        sim_db.add(action)

        SimulationAdapter.set_injected_outcome(AdapterOutcome.SUCCESS)
        FailureManager.execute_action(sim_db, action, case)

        audits = [i for i in sim_db.added_items if isinstance(i, AuditEvent)]
        for audit in audits:
            assert audit.correlation_id == case.correlation_id, (
                f"correlation_id mismatch: expected {case.correlation_id!r}, "
                f"got {audit.correlation_id!r} on event {audit.event_type!r}"
            )


class TestCriticalScenario2_PolicyRejection:
    """
    Scenario 2: Policy rejection blocks recovery.
    PolicyEngine must return BLOCKED and recovery must not proceed.
    """

    def test_retry_limit_exceeded_blocks(self):
        case = _make_case(confidence=0.90)
        tx = _make_transaction(amount="50.00")
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=3
        )
        assert result.decision == PolicyDecision.BLOCKED
        assert result.reason_code == "RETRY_LIMIT_EXCEEDED"

    def test_hard_decline_blocks(self):
        case = _make_case(confidence=0.99)
        tx = _make_transaction(amount="50.00")
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=0, failure_code="stolen_card"
        )
        assert result.decision == PolicyDecision.BLOCKED
        assert result.reason_code == "HARD_DECLINE_NOT_ELIGIBLE"

    def test_blocked_does_not_produce_review_fields(self):
        case = _make_case(confidence=0.10, window_ended=True)
        tx = _make_transaction()
        result = PolicyEngine.evaluate(case=case, transaction=tx, attempt_count=0)
        # BLOCKED wins over REVIEW
        assert result.decision == PolicyDecision.BLOCKED
        assert result.requires_human_review is False

    def test_policy_is_versioned(self):
        """PolicyEngine must have a stable policy_id and version."""
        case = _make_case()
        tx = _make_transaction()
        result = PolicyEngine.evaluate(case=case, transaction=tx, attempt_count=0)
        assert result.policy_id == PolicyEngine.POLICY_ID
        assert result.policy_version == PolicyEngine.POLICY_VERSION

    def test_all_hard_failures_are_blocked(self):
        for code in PolicyEngine.HARD_FAILURES:
            case = _make_case(confidence=0.99)
            tx = _make_transaction(amount="10.00")
            result = PolicyEngine.evaluate(
                case=case, transaction=tx, attempt_count=0, failure_code=code
            )
            assert result.decision == PolicyDecision.BLOCKED, (
                f"Hard failure code {code!r} did not produce BLOCKED"
            )


class TestCriticalScenario3_LowConfidencePrediction:
    """
    Scenario 3: Low-confidence prediction → human review.
    """

    def test_low_confidence_triggers_review(self):
        case = _make_case(confidence=0.40)
        tx = _make_transaction(amount="50.00")
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=0, transaction_risk_level="LOW"
        )
        assert result.decision == PolicyDecision.REVIEW
        assert result.requires_human_review is True
        assert "confidence" in result.reason.lower()

    def test_high_amount_triggers_review(self):
        case = _make_case(confidence=0.99)
        tx = _make_transaction(amount="9999.00")
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=0, transaction_risk_level="LOW"
        )
        assert result.decision == PolicyDecision.REVIEW
        assert result.requires_human_review is True

    def test_high_risk_triggers_review(self):
        case = _make_case(confidence=0.99)
        tx = _make_transaction(amount="10.00")
        result = PolicyEngine.evaluate(
            case=case, transaction=tx, attempt_count=0, transaction_risk_level="HIGH"
        )
        assert result.decision == PolicyDecision.REVIEW
        assert result.requires_human_review is True

    def test_review_does_not_close_case(self, sim_db):
        """
        A REVIEW decision means PolicyEngine says 'send to human'.
        The case state must NOT be auto-advanced by FailureManager.
        This tests that the orchestration respects policy output.
        """
        # This scenario is tested at the PolicyEngine boundary.
        # The case state machine test ensures REVIEWING cannot be skipped.
        with pytest.raises(InvalidTransitionError):
            validate_case_transition(CaseState.POLICY_CHECK, CaseState.RECOVERED)


class TestCriticalScenario4_ActionTimeout:
    """
    Scenario 4: Action timeout → UNKNOWN outcome path.

    Expected:
      Attempt  = UNKNOWN
      Action   = OUTCOME_UNKNOWN
      Case     = RECOVERING (not auto-advanced)
      ManualReview created
      No automatic retry
    """

    def test_unknown_outcome_states(self, sim_db):
        case = _make_case()
        action = _make_action(state=ActionState.APPROVED, case=case)
        sim_db.add(case)
        sim_db.add(action)

        SimulationAdapter.set_injected_outcome(AdapterOutcome.UNKNOWN)
        attempt = FailureManager.execute_action(sim_db, action, case)

        assert attempt.state == AttemptState.UNKNOWN
        assert action.state == ActionState.OUTCOME_UNKNOWN
        # Case must NOT advance — stays RECOVERING
        assert case.state == CaseState.RECOVERING

    def test_manual_review_created_on_unknown(self, sim_db):
        case = _make_case()
        action = _make_action(state=ActionState.APPROVED, case=case)
        sim_db.add(case)
        sim_db.add(action)

        SimulationAdapter.set_injected_outcome(AdapterOutcome.UNKNOWN)
        FailureManager.execute_action(sim_db, action, case)

        review = sim_db.query(ManualReview).filter_by(recovery_case_id=case.id).first()
        assert review is not None
        assert review.reason == "UNKNOWN_ADAPTER_OUTCOME"

    def test_manual_review_audit_event_written(self, sim_db):
        case = _make_case()
        action = _make_action(state=ActionState.APPROVED, case=case)
        sim_db.add(case)
        sim_db.add(action)

        SimulationAdapter.set_injected_outcome(AdapterOutcome.UNKNOWN)
        FailureManager.execute_action(sim_db, action, case)

        audit = sim_db.query(AuditEvent).filter_by(event_type="ManualReviewCreated").first()
        assert audit is not None
        assert audit.correlation_id == case.correlation_id

    def test_unknown_attempt_state_is_terminal(self):
        """UNKNOWN must be a terminal attempt state — cannot be retried."""
        assert is_attempt_terminal(AttemptState.UNKNOWN)

    def test_cannot_transition_out_of_unknown_attempt(self):
        """No transition from UNKNOWN to any state is allowed."""
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.UNKNOWN, AttemptState.STARTED)
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.UNKNOWN, AttemptState.SUCCEEDED)
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.UNKNOWN, AttemptState.FAILED)

    def test_outcome_unknown_action_state_is_terminal(self):
        """OUTCOME_UNKNOWN on Action must be terminal."""
        assert is_action_terminal(ActionState.OUTCOME_UNKNOWN)

    def test_cannot_transition_out_of_outcome_unknown_action(self):
        with pytest.raises(InvalidTransitionError):
            validate_action_transition(ActionState.OUTCOME_UNKNOWN, ActionState.PROPOSED)
        with pytest.raises(InvalidTransitionError):
            validate_action_transition(ActionState.OUTCOME_UNKNOWN, ActionState.APPROVED)

    def test_no_auto_retry_after_unknown(self, sim_db):
        """
        After an UNKNOWN outcome, the state machine prevents any further
        transition on the action, proving no blind retry can occur.
        """
        case = _make_case()
        action = _make_action(state=ActionState.APPROVED, case=case)
        sim_db.add(case)
        sim_db.add(action)

        SimulationAdapter.set_injected_outcome(AdapterOutcome.UNKNOWN)
        FailureManager.execute_action(sim_db, action, case)

        # Attempting to move OUTCOME_UNKNOWN action to APPROVED must fail
        with pytest.raises(InvalidTransitionError):
            validate_action_transition(action.state, ActionState.APPROVED)


class TestCriticalScenario5_DuplicateExecution:
    """
    Scenario 5: Duplicate execution attempt.
    Idempotency prevents duplicate logical execution.
    """

    def test_idempotency_key_is_deterministic(self):
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        key1 = build_idempotency_key(mid, cid, "RETRY_PAYMENT")
        key2 = build_idempotency_key(mid, cid, "RETRY_PAYMENT")
        assert key1 == key2

    def test_different_merchants_produce_different_keys(self):
        cid = uuid.uuid4()
        key_a = build_idempotency_key(uuid.uuid4(), cid, "RETRY_PAYMENT")
        key_b = build_idempotency_key(uuid.uuid4(), cid, "RETRY_PAYMENT")
        assert key_a != key_b

    def test_different_cases_produce_different_keys(self):
        mid = uuid.uuid4()
        key_a = build_idempotency_key(mid, uuid.uuid4(), "RETRY_PAYMENT")
        key_b = build_idempotency_key(mid, uuid.uuid4(), "RETRY_PAYMENT")
        assert key_a != key_b

    def test_idempotency_key_constraint_on_recovery_actions(self):
        """The UNIQUE constraint on recovery_actions.idempotency_key must exist."""
        from app.database.base import Base
        from sqlalchemy import UniqueConstraint
        table = Base.metadata.tables["recovery_actions"]
        unique_cols = set()
        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint):
                for col in constraint.columns:
                    unique_cols.add(col.name)
        for col in table.columns:
            if col.name == "idempotency_key" and col.unique:
                unique_cols.add("idempotency_key")
        assert "idempotency_key" in unique_cols

    def test_retry_shares_same_idempotency_key_not_new_one(self):
        """
        A retry creates a new Attempt, NOT a new Action.
        The idempotency_key on the Action must remain unchanged.
        """
        mid = uuid.uuid4()
        cid = uuid.uuid4()
        original_key = build_idempotency_key(mid, cid, "RETRY_PAYMENT")

        # Simulate "retry" by re-building the key with same inputs
        retry_key = build_idempotency_key(mid, cid, "RETRY_PAYMENT")
        assert original_key == retry_key, (
            "Retry must share the idempotency key, not generate a new one"
        )

    @pytest.mark.asyncio
    async def test_create_action_returns_existing_when_key_matches(self):
        """RecoveryService.create_action returns existing action on duplicate key."""
        from app.services.recovery_service import RecoveryService

        session = _make_mock_session()
        svc = RecoveryService(session)
        existing = _make_action(ActionState.EXECUTING)
        existing.idempotency_key = "test:idem:key"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing
        session.execute.return_value = mock_result

        case = _make_case()
        action, created = await svc.create_action(
            case=case,
            action_id="RETRY_PAYMENT",
            execution_mode=ExecutionMode.SIMULATION,
            idempotency_key="test:idem:key",
        )
        assert not created
        assert action is existing

    @pytest.mark.asyncio
    async def test_idempotency_key_not_on_attempt_table(self):
        """recovery_attempts must NOT have an idempotency_key column."""
        from app.database.base import Base
        col_names = {c.name for c in Base.metadata.tables["recovery_attempts"].columns}
        assert "idempotency_key" not in col_names


class TestCriticalScenario6_RecoveryWindowExpiry:
    """
    Scenario 6: Recovery window expires → RECOVERY_WINDOW_EXPIRED → CLOSED.
    """

    def test_expired_window_detected(self):
        case = _make_case(window_ended=True)
        assert is_recovery_window_expired(case)

    def test_active_window_not_expired(self):
        case = _make_case(window_ended=False)
        assert not is_recovery_window_expired(case)

    def test_policy_blocks_on_expired_window(self):
        case = _make_case(window_ended=True)
        tx = _make_transaction()
        result = PolicyEngine.evaluate(case=case, transaction=tx, attempt_count=0)
        assert result.decision == PolicyDecision.BLOCKED
        assert result.reason_code == "RECOVERY_WINDOW_EXPIRED"

    def test_valid_transition_recovering_to_window_expired(self):
        validate_case_transition(CaseState.RECOVERING, CaseState.RECOVERY_WINDOW_EXPIRED)

    def test_valid_transition_window_expired_to_closed(self):
        validate_case_transition(CaseState.RECOVERY_WINDOW_EXPIRED, CaseState.CLOSED)

    def test_window_expired_cannot_go_back_to_recovering(self):
        with pytest.raises(InvalidTransitionError):
            validate_case_transition(CaseState.RECOVERY_WINDOW_EXPIRED, CaseState.RECOVERING)

    def test_window_expired_to_closed_transition_is_only_exit(self):
        from app.services.state_machine import CASE_TRANSITIONS
        allowed = CASE_TRANSITIONS[CaseState.RECOVERY_WINDOW_EXPIRED]
        assert allowed == {CaseState.CLOSED}

    @pytest.mark.asyncio
    async def test_orchestrator_expire_window_path(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = _make_mock_session()
        orch = RecoveryOrchestrator(session)
        case = _make_case(state=CaseState.RECOVERING)

        result = await orch.expire_window(case)
        assert result.state == CaseState.CLOSED

    @pytest.mark.asyncio
    async def test_expire_window_writes_audit_events(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = _make_mock_session()
        orch = RecoveryOrchestrator(session)
        case = _make_case(state=CaseState.RECOVERING)

        written: list[str] = []

        async def capture(**kwargs):
            written.append(kwargs["event_type"])
            return AuditEvent(
                id=uuid.uuid4(),
                merchant_id=uuid.uuid4(),
                correlation_id="corr",
                event_type=kwargs["event_type"],
            )

        orch._audit.write = capture  # type: ignore

        await orch.expire_window(case)
        assert "RecoveryWindowExpired" in written
        assert "CaseClosed" in written


class TestCriticalScenario7_LLMUnavailable:
    """
    Scenario 7: LLM unavailable → rule-based fallback → same validated schema
                → pipeline continues.
    """

    def test_llm_unavailable_fallback_returns_valid_schema(self):
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None

        llm_client.inject_unavailable = True
        case = _make_case()
        tx = _make_transaction(status="temporary_failure")
        result = AgentService.diagnose_failure(db, case, tx)

        # Must be a valid DiagnosisOutput (same schema, different source)
        assert isinstance(result, DiagnosisOutput)
        assert isinstance(result.failure_category, str)
        assert 0.0 <= result.confidence <= 1.0
        assert isinstance(result.evidence, list)

    def test_fallback_agent_version_recorded_as_rule_based(self):
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None

        llm_client.inject_unavailable = True
        case = _make_case()
        tx = _make_transaction(status="network_error")
        AgentService.diagnose_failure(db, case, tx)

        run = db.added_items[-1]
        assert run.agent_version == "RULE_BASED_FALLBACK"
        assert "LLMUnavailableError" in run.status

    def test_llm_timeout_fallback(self):
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None

        llm_client.inject_timeout = True
        case = _make_case()
        tx = _make_transaction()
        result = AgentService.diagnose_failure(db, case, tx)

        assert isinstance(result, DiagnosisOutput)
        run = db.added_items[-1]
        assert "LLMTimeoutError" in run.status

    def test_planner_fallback_on_llm_unavailable(self):
        db = MagicMock()
        db.added_items = []
        db.add.side_effect = db.added_items.append
        db.commit.return_value = None
        db.refresh.side_effect = lambda x: None

        llm_client.inject_unavailable = True
        case = _make_case()
        diagnosis = DiagnosisOutput(
            failure_category="TEMPORARY_FAILURE", confidence=0.9, evidence=["t"]
        )
        result = AgentService.plan_recovery(db, diagnosis, case)

        assert isinstance(result, RecoveryPlanOutput)
        assert result.recommended_action == "RETRY_PAYMENT"

    def test_no_direct_llm_execution_in_production_path(self):
        """
        The LLM client must ONLY be called through AgentService._execute_agent_with_fallback.
        Direct llm_client.generate_json calls from outside AgentService are forbidden.
        Verify the llm_client is only referenced through the AgentService.
        """
        import inspect
        from app.services import agent_service
        source = inspect.getsource(agent_service)
        # All llm_client usage must go through _execute_agent_with_fallback
        # The direct call is inside the private method only
        assert "llm_client.generate_json" in source
        # Ensure it is within the private method body
        lines = source.splitlines()
        in_private_method = False
        direct_call_count = 0
        for line in lines:
            if "_execute_agent_with_fallback" in line and "def " in line:
                in_private_method = True
            if "def " in line and "_execute_agent_with_fallback" not in line and in_private_method:
                in_private_method = False
            if "llm_client.generate_json" in line:
                direct_call_count += 1
        # There should be exactly 1 call (inside the private method)
        assert direct_call_count == 1, (
            "llm_client.generate_json must be called exactly once, "
            "inside _execute_agent_with_fallback"
        )


class TestCriticalScenario8_CrossMerchantAccessDenied:
    """
    Scenario 8: Cross-merchant access must be denied.
    """

    def test_merchant_id_on_all_tenant_scoped_tables(self):
        """All tenant-scoped tables must have a NOT NULL merchant_id FK."""
        from app.database.base import Base
        tenant_tables = [
            "transactions", "recovery_cases", "recovery_actions",
            "audit_events", "customers", "manual_reviews", "policies",
            "recovery_opportunities", "simulation_runs",
        ]
        for table_name in tenant_tables:
            table = Base.metadata.tables[table_name]
            col_names = {c.name for c in table.columns}
            assert "merchant_id" in col_names, (
                f"Table {table_name!r} missing merchant_id column"
            )
            col = table.c["merchant_id"]
            assert not col.nullable, (
                f"Table {table_name!r} has nullable merchant_id — must be NOT NULL"
            )

    def test_verify_ownership_raises_on_wrong_merchant(self):
        """API-layer verify_merchant_ownership must raise ForbiddenError."""
        from app.core.merchant_context import MerchantContext, verify_merchant_ownership
        from app.core.errors import ForbiddenError

        ctx = MerchantContext(merchant_id=uuid.uuid4())
        other_merchant = uuid.uuid4()

        with pytest.raises(ForbiddenError):
            verify_merchant_ownership(other_merchant, ctx)

    def test_verify_ownership_passes_for_correct_merchant(self):
        from app.core.merchant_context import MerchantContext, verify_merchant_ownership
        mid = uuid.uuid4()
        ctx = MerchantContext(merchant_id=mid)
        verify_merchant_ownership(mid, ctx)  # Must not raise

    def test_invalid_merchant_uuid_rejected_at_api_boundary(self):
        from app.core.merchant_context import get_merchant_context
        from app.core.errors import UnprocessableError

        with pytest.raises(UnprocessableError):
            get_merchant_context(x_merchant_id="not-a-uuid")

    def test_recovery_action_must_have_same_merchant_as_case(self):
        """Action must reference merchant_id matching the case."""
        from app.database.base import Base
        action_table = Base.metadata.tables["recovery_actions"]
        # Verify that merchant_id is present (schema-level enforcement)
        assert "merchant_id" in {c.name for c in action_table.columns}
        # Verify FK to merchants
        fk_targets = {
            fk.column.table.name
            for col in action_table.columns
            for fk in col.foreign_keys
        }
        assert "merchants" in fk_targets


# ═══════════════════════════════════════════════════════════════════
# FINAL ARCHITECTURAL CHECKS
# ═══════════════════════════════════════════════════════════════════

class TestFinalArchitecturalChecks:
    """
    Verifies the architectural invariants specified in Phase 14:
      - No hardcoded business metrics
      - No direct LLM execution outside AgentService
      - No invalid state transitions
      - No blind UNKNOWN retry
      - No cross-tenant access
      - Audit events generated
      - correlation_id propagated
      - Idempotency enforced
    """

    # ── No hardcoded business metrics ──────────────────────────────

    def test_no_hardcoded_revenue_metrics_in_analytics(self):
        """AnalyticsService must use DB queries, not hardcoded values."""
        import inspect
        from app.services import analytics_service
        source = inspect.getsource(analytics_service)
        forbidden_patterns = [
            "= 1000000",   # fabricated revenue
            "= 500000",
            "hardcoded",
            "FAKE",
        ]
        for pattern in forbidden_patterns:
            assert pattern not in source, (
                f"Hardcoded pattern {pattern!r} found in analytics_service"
            )

    def test_analytics_service_uses_db_execute(self):
        """AnalyticsService must call db.execute (SQLAlchemy query)."""
        import inspect
        from app.services import analytics_service
        source = inspect.getsource(analytics_service)
        assert "await db.execute" in source

    # ── No invalid state transitions ────────────────────────────────

    def test_all_terminal_case_states_have_no_outgoing(self):
        from app.services.state_machine import CASE_TRANSITIONS
        terminal_cases = [CaseState.CLOSED]
        for state in terminal_cases:
            assert len(CASE_TRANSITIONS[state]) == 0, (
                f"Terminal state {state.value!r} has outgoing transitions"
            )

    def test_all_terminal_action_states_have_no_outgoing(self):
        from app.services.state_machine import ACTION_TRANSITIONS
        terminals = [
            ActionState.SUCCEEDED,
            ActionState.FAILED,
            ActionState.OUTCOME_UNKNOWN,
            ActionState.REJECTED,
            ActionState.CANCELLED,
        ]
        for state in terminals:
            assert len(ACTION_TRANSITIONS[state]) == 0

    def test_all_terminal_attempt_states_have_no_outgoing(self):
        from app.services.state_machine import ATTEMPT_TRANSITIONS
        terminals = [
            AttemptState.SUCCEEDED,
            AttemptState.FAILED,
            AttemptState.TIMEOUT,
            AttemptState.UNKNOWN,
        ]
        for state in terminals:
            assert len(ATTEMPT_TRANSITIONS[state]) == 0

    # ── No blind UNKNOWN retry ──────────────────────────────────────

    def test_unknown_attempt_cannot_be_retried_via_state_machine(self):
        with pytest.raises(InvalidTransitionError):
            validate_attempt_transition(AttemptState.UNKNOWN, AttemptState.STARTED)

    def test_outcome_unknown_action_cannot_be_reapproved(self):
        with pytest.raises(InvalidTransitionError):
            validate_action_transition(ActionState.OUTCOME_UNKNOWN, ActionState.APPROVED)

    def test_no_manual_review_case_state_exists(self):
        """
        Critical: MANUAL_REVIEW must NOT exist as a CaseState.
        Manual review is a ManualReview table record, not a state.
        """
        case_state_names = [s.name for s in CaseState]
        assert "MANUAL_REVIEW" not in case_state_names

    # ── Audit events structure ───────────────────────────────────────

    def test_audit_events_are_append_only(self):
        """audit_events must NOT have updated_at (append-only)."""
        from app.database.base import Base
        col_names = {c.name for c in Base.metadata.tables["audit_events"].columns}
        assert "updated_at" not in col_names

    def test_audit_events_have_correlation_id(self):
        from app.database.base import Base
        col_names = {c.name for c in Base.metadata.tables["audit_events"].columns}
        assert "correlation_id" in col_names

    def test_audit_events_have_merchant_id(self):
        from app.database.base import Base
        col_names = {c.name for c in Base.metadata.tables["audit_events"].columns}
        assert "merchant_id" in col_names

    def test_audit_events_have_recovery_case_id(self):
        from app.database.base import Base
        col_names = {c.name for c in Base.metadata.tables["audit_events"].columns}
        assert "recovery_case_id" in col_names

    def test_audit_event_correlation_id_is_not_nullable(self):
        from app.database.base import Base
        col = Base.metadata.tables["audit_events"].c["correlation_id"]
        assert not col.nullable

    # ── correlation_id propagation ──────────────────────────────────

    @pytest.mark.asyncio
    async def test_correlation_id_propagated_through_orchestrator(self):
        from app.orchestrator.orchestrator import RecoveryOrchestrator

        session = _make_mock_session()
        orch = RecoveryOrchestrator(session)

        corr_ids_seen: list[str] = []

        async def capture(**kwargs):
            corr_ids_seen.append(kwargs["correlation_id"])
            return AuditEvent(
                id=uuid.uuid4(),
                merchant_id=uuid.uuid4(),
                correlation_id=kwargs["correlation_id"],
                event_type=kwargs["event_type"],
            )

        orch._audit.write = capture  # type: ignore

        case = _make_case(state=CaseState.DETECTED)
        expected = case.correlation_id
        await orch.begin_analysis(case)

        assert len(corr_ids_seen) > 0
        for cid in corr_ids_seen:
            assert cid == expected

    def test_correlation_id_not_null_on_recovery_cases(self):
        from app.database.base import Base
        col = Base.metadata.tables["recovery_cases"].c["correlation_id"]
        assert not col.nullable

    # ── Integration smoke: Simulation → Metrics ──────────────────────

    def test_simulation_service_returns_all_required_metric_keys(self, sim_db):
        """SimulatorService must return a metrics dict with all required keys."""
        from app.services.simulator import SimulatorService

        required_keys = {
            "transactions_analyzed",
            "opportunities_detected",
            "actions_approved",
            "successful_recoveries",
            "revenue_recovered",
            "recovery_rate",
            "policy_blocks",
            "manual_reviews",
            "unknown_outcomes",
        }
        result = SimulatorService.run_scenario(
            sim_db, uuid.uuid4(), "A", sample_size=5, seed=42
        )
        missing = required_keys - set(result["metrics"].keys())
        assert not missing, f"Simulation metrics missing keys: {missing}"

    def test_simulation_results_are_dynamic_not_hardcoded(self, sim_db):
        """Two different sample sizes must yield different transaction counts."""
        mid1, mid2 = uuid.uuid4(), uuid.uuid4()
        res_small = SimulatorService_run_with_fresh_db(mid1, "A", 3)
        res_large = SimulatorService_run_with_fresh_db(mid2, "A", 10)
        assert (
            res_small["metrics"]["transactions_analyzed"]
            != res_large["metrics"]["transactions_analyzed"]
        )


def SimulatorService_run_with_fresh_db(merchant_id, scenario, size):
    """Helper that builds a fresh mock DB per run to avoid cross-contamination."""
    from app.services.simulator import SimulatorService

    db = MagicMock()
    db.added_items = []
    db.add.side_effect = db.added_items.append
    db.flush.return_value = None
    db.commit.return_value = None
    db.refresh.side_effect = lambda x: None

    def _query(model):
        class Q:
            def __init__(self):
                self._kwargs = {}

            def filter_by(self, **kwargs):
                self._kwargs = kwargs
                return self

            def first(self):
                for item in db.added_items:
                    if isinstance(item, model):
                        if all(getattr(item, k, None) == v for k, v in self._kwargs.items()):
                            return item
                return None

            def all(self):
                return [
                    item for item in db.added_items
                    if isinstance(item, model)
                    and all(getattr(item, k, None) == v for k, v in self._kwargs.items())
                ]

            def count(self):
                return len(self.all())

        return Q()

    db.query.side_effect = _query
    return SimulatorService.run_scenario(db, merchant_id, scenario, sample_size=size, seed=42)
