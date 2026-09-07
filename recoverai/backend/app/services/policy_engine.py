"""
RecoverAI v3.2 — Policy Engine

Deterministic, versioned, structured, and ML/LLM-free policy evaluation.
Answers only: "Is this proposed recovery action allowed?"

Outputs a versioned PolicyEvaluationResult.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.models.enums import PolicyDecision
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.services.state_machine import is_recovery_window_expired


@dataclass
class PolicyEvaluationResult:
    """Standardized output from the Policy Engine."""
    decision: PolicyDecision
    reason_code: str
    reason: str
    policy_id: str
    policy_version: str
    evaluated_at: str
    risk_level: str
    requires_human_review: bool


class PolicyEngine:
    """
    Deterministic rule evaluator for recovery actions.

    Prioritizes BLOCKED over REVIEW over APPROVED.
    """

    POLICY_ID = "recovery_core_policy"
    POLICY_VERSION = "1.0"

    MAX_RETRIES = 3
    HIGH_AMOUNT_THRESHOLD = 1000.00
    LOW_CONFIDENCE_THRESHOLD = 0.60

    # Hard failures that should never be retried
    HARD_FAILURES = {
        "stolen_card",
        "lost_card",
        "fraud_suspected",
        "account_closed",
    }

    @classmethod
    def evaluate(
        cls,
        case: RecoveryCase,
        transaction: Transaction,
        attempt_count: int,
        transaction_risk_level: str = "LOW",
        failure_code: str | None = None,
    ) -> PolicyEvaluationResult:
        """
        Evaluate if a recovery action is allowed based on deterministic rules.
        """
        now_iso = datetime.now(tz=timezone.utc).isoformat()
        requires_human_review = False
        risk_level = transaction_risk_level.upper()

        # ── 1. Block conditions (Deterministic Rejections) ──────────

        # Rule: Exceeded retry limit
        if attempt_count >= cls.MAX_RETRIES:
            return cls._build_result(
                PolicyDecision.BLOCKED,
                "RETRY_LIMIT_EXCEEDED",
                f"Maximum retry limit of {cls.MAX_RETRIES} reached.",
                risk_level,
                False,
                now_iso,
            )

        # Rule: Expired recovery window
        if is_recovery_window_expired(case):
            return cls._build_result(
                PolicyDecision.BLOCKED,
                "RECOVERY_WINDOW_EXPIRED",
                "The recovery window for this case has expired.",
                risk_level,
                False,
                now_iso,
            )

        # Rule: Failure eligibility (hard declines)
        if failure_code and failure_code.lower() in cls.HARD_FAILURES:
            return cls._build_result(
                PolicyDecision.BLOCKED,
                "HARD_DECLINE_NOT_ELIGIBLE",
                f"Transaction failed with a hard decline code: {failure_code}.",
                risk_level,
                False,
                now_iso,
            )

        # ── 2. Review conditions (Deterministic Escalations) ────────

        review_reasons = []

        # Rule: Low confidence
        if case.confidence is not None and case.confidence < cls.LOW_CONFIDENCE_THRESHOLD:
            requires_human_review = True
            review_reasons.append(f"Prediction confidence ({case.confidence}) is below threshold ({cls.LOW_CONFIDENCE_THRESHOLD}).")

        # Rule: High transaction amount
        amount_float = float(transaction.amount)
        if amount_float > cls.HIGH_AMOUNT_THRESHOLD:
            requires_human_review = True
            review_reasons.append(f"Transaction amount ({amount_float}) exceeds automatic threshold ({cls.HIGH_AMOUNT_THRESHOLD}).")

        # Rule: High risk
        if risk_level == "HIGH":
            requires_human_review = True
            review_reasons.append("Transaction is flagged as HIGH risk.")

        if requires_human_review:
            return cls._build_result(
                PolicyDecision.REVIEW,
                "REQUIRES_HUMAN_REVIEW",
                " | ".join(review_reasons),
                risk_level,
                True,
                now_iso,
            )

        # ── 3. Approved (If no blocks or reviews) ───────────────────

        return cls._build_result(
            PolicyDecision.APPROVED,
            "WITHIN_RETRY_LIMIT",
            "Transaction is eligible for retry. No review conditions triggered.",
            risk_level,
            False,
            now_iso,
        )

    @classmethod
    def _build_result(
        cls,
        decision: PolicyDecision,
        reason_code: str,
        reason: str,
        risk_level: str,
        requires_human_review: bool,
        evaluated_at: str,
    ) -> PolicyEvaluationResult:
        return PolicyEvaluationResult(
            decision=decision,
            reason_code=reason_code,
            reason=reason,
            policy_id=cls.POLICY_ID,
            policy_version=cls.POLICY_VERSION,
            evaluated_at=evaluated_at,
            risk_level=risk_level,
            requires_human_review=requires_human_review,
        )
