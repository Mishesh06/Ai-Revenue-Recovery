"""
RecoverAI v3.2 — Phase 5: Policy Engine Tests

Tests the deterministic policy evaluation logic.
No LLM dependencies. No DB dependencies.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.models.enums import CaseState, PolicyDecision
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.services.policy_engine import PolicyEngine


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_mock_case(
    confidence: float | None = 0.85,
    window_expired: bool = False,
) -> RecoveryCase:
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=uuid.uuid4(),
        transaction_id=uuid.uuid4(),
        state=CaseState.PLANNED,
        correlation_id=f"corr-{uuid.uuid4().hex[:8]}",
        confidence=confidence,
    )
    if window_expired:
        case.recovery_window_ends_at = datetime.now(tz=timezone.utc) - timedelta(days=1)
    else:
        case.recovery_window_ends_at = datetime.now(tz=timezone.utc) + timedelta(days=7)
    return case


def make_mock_transaction(amount: str = "100.00") -> Transaction:
    return Transaction(
        id=uuid.uuid4(),
        merchant_id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        amount=amount,
        currency="USD",
        status="failed",
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestPolicyEngine:

    def test_approved_action(self):
        """Happy path: eligible for retry, good confidence, low risk, low amount."""
        case = make_mock_case(confidence=0.90, window_expired=False)
        tx = make_mock_transaction(amount="50.00")

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=1,
            transaction_risk_level="LOW",
            failure_code="insufficient_funds",
        )

        assert result.decision == PolicyDecision.APPROVED
        assert result.reason_code == "WITHIN_RETRY_LIMIT"
        assert not result.requires_human_review
        assert result.policy_id == PolicyEngine.POLICY_ID
        assert result.policy_version == PolicyEngine.POLICY_VERSION

    import pytest
    @pytest.mark.parametrize("attempt_count, expected_decision, expected_reason_code", [
        (0, PolicyDecision.APPROVED, "WITHIN_RETRY_LIMIT"),
        (1, PolicyDecision.APPROVED, "WITHIN_RETRY_LIMIT"),
        (2, PolicyDecision.APPROVED, "WITHIN_RETRY_LIMIT"),
        (3, PolicyDecision.BLOCKED, "RETRY_LIMIT_EXCEEDED"),
        (4, PolicyDecision.BLOCKED, "RETRY_LIMIT_EXCEEDED"),
    ])
    def test_retry_limit_semantics(self, attempt_count, expected_decision, expected_reason_code):
        """Verify that attempt_count represents PREVIOUS attempts, allowing EXACTLY MAX_RETRIES (3) attempts."""
        case = make_mock_case(confidence=0.90, window_expired=False)
        tx = make_mock_transaction(amount="50.00")

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=attempt_count,
            transaction_risk_level="LOW",
            failure_code="insufficient_funds",
        )

        assert result.decision == expected_decision
        assert result.reason_code == expected_reason_code

    def test_expired_recovery_window(self):
        """BLOCKED if recovery window is expired."""
        case = make_mock_case(window_expired=True)
        tx = make_mock_transaction()

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=0,
        )

        assert result.decision == PolicyDecision.BLOCKED
        assert result.reason_code == "RECOVERY_WINDOW_EXPIRED"
        assert not result.requires_human_review

    def test_high_risk_review(self):
        """REVIEW if transaction risk is HIGH."""
        case = make_mock_case(confidence=0.95)
        tx = make_mock_transaction(amount="10.00")

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=0,
            transaction_risk_level="HIGH",
        )

        assert result.decision == PolicyDecision.REVIEW
        assert result.reason_code == "REQUIRES_HUMAN_REVIEW"
        assert result.requires_human_review is True
        assert "HIGH risk" in result.reason

    def test_low_confidence_review(self):
        """REVIEW if confidence < threshold."""
        case = make_mock_case(confidence=0.50)  # Below 0.60
        tx = make_mock_transaction()

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=0,
            transaction_risk_level="LOW",
        )

        assert result.decision == PolicyDecision.REVIEW
        assert result.reason_code == "REQUIRES_HUMAN_REVIEW"
        assert result.requires_human_review is True
        assert "Prediction confidence" in result.reason

    def test_high_amount_review(self):
        """REVIEW if transaction amount > threshold."""
        case = make_mock_case(confidence=0.99)
        tx = make_mock_transaction(amount="5000.00")  # Above 1000.00

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=0,
            transaction_risk_level="LOW",
        )

        assert result.decision == PolicyDecision.REVIEW
        assert result.reason_code == "REQUIRES_HUMAN_REVIEW"
        assert result.requires_human_review is True
        assert "amount" in result.reason

    def test_blocked_action_hard_failure(self):
        """BLOCKED if failure code is a hard decline."""
        case = make_mock_case()
        tx = make_mock_transaction()

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=0,
            failure_code="stolen_card",
        )

        assert result.decision == PolicyDecision.BLOCKED
        assert result.reason_code == "HARD_DECLINE_NOT_ELIGIBLE"
        assert not result.requires_human_review

    def test_multiple_review_reasons_combined(self):
        """If multiple review conditions hit, reason string combines them."""
        case = make_mock_case(confidence=0.20)
        tx = make_mock_transaction(amount="2000.00")

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=0,
            transaction_risk_level="HIGH",
        )

        assert result.decision == PolicyDecision.REVIEW
        assert result.requires_human_review is True
        # Check that all 3 conditions are mentioned in the reason string
        assert "Prediction confidence" in result.reason
        assert "Transaction amount" in result.reason
        assert "HIGH risk" in result.reason

    def test_blocked_takes_precedence_over_review(self):
        """If a case warrants a BLOCKED decision, it overrides any REVIEW conditions."""
        # Both low confidence AND expired window
        case = make_mock_case(confidence=0.10, window_expired=True)
        tx = make_mock_transaction()

        result = PolicyEngine.evaluate(
            case=case,
            transaction=tx,
            attempt_count=0,
        )

        # BLOCKED wins
        assert result.decision == PolicyDecision.BLOCKED
        assert result.reason_code == "RECOVERY_WINDOW_EXPIRED"
        assert not result.requires_human_review
