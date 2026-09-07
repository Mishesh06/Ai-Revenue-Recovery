"""
RecoverAI v3.2 — PII-Free Contextual Prompt Builder

Constructs compact, anonymized prompts for Diagnosis and Recovery Planning agents.
Enforces strict zero-PII policy: No card numbers, customer names, emails, or phone numbers.
"""

from __future__ import annotations

import json
from typing import Any
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.agents import DiagnosisOutput


def _categorize_amount(amount_val: float) -> str:
    """Classifies transaction amount into discrete privacy tiers."""
    if amount_val < 50.0:
        return "MICRO_TIER (< 50 USD)"
    elif amount_val <= 250.0:
        return "STANDARD_TIER (50 - 250 USD)"
    elif amount_val <= 1000.0:
        return "HIGH_VALUE_TIER (250 - 1000 USD)"
    else:
        return "ENTERPRISE_TIER (> 1000 USD)"


def build_diagnosis_prompt(case: RecoveryCase, transaction: Transaction) -> str:
    """
    Builds a sanitized, PII-free prompt for the Diagnosis Agent.
    """
    amount_float = 0.0
    try:
        amount_float = float(transaction.amount) if transaction.amount else 0.0
    except (ValueError, TypeError):
        pass

    context = {
        "case_id": str(case.id),
        "status_code": transaction.status or "unknown",
        "currency": transaction.currency or "USD",
        "amount_tier": _categorize_amount(amount_float),
        "state": str(case.state.value if hasattr(case.state, "value") else case.state),
    }

    return (
        "Analyze the following payment decline event and categorize the root cause.\n"
        "Required JSON Output Schema:\n"
        "{\n"
        '  "failure_category": "TEMPORARY_FAILURE" | "NETWORK_ERROR" | "INSUFFICIENT_FUNDS" | '
        '"EXPIRED_CARD" | "CARD_DECLINED" | "FRAUD_RISK" | "ACCOUNT_CLOSED" | "UNKNOWN_FAILURE",\n'
        '  "confidence": <float between 0.0 and 1.0>,\n'
        '  "evidence": [<list of string observations>]\n'
        "}\n\n"
        f"Event Telemetry:\n{json.dumps(context, indent=2)}"
    )


def build_planner_prompt(
    diagnosis: DiagnosisOutput,
    case: RecoveryCase,
    transaction: Transaction | None = None,
) -> str:
    """
    Builds a sanitized, PII-free prompt for the Recovery Planner Agent.
    """
    context: dict[str, Any] = {
        "case_id": str(case.id),
        "failure_category": diagnosis.failure_category,
        "diagnostic_confidence": diagnosis.confidence,
        "evidence": diagnosis.evidence,
    }

    if transaction:
        try:
            amt = float(transaction.amount) if transaction.amount else 0.0
            context["amount_tier"] = _categorize_amount(amt)
            context["currency"] = transaction.currency or "USD"
        except (ValueError, TypeError):
            pass

    return (
        "Formulate an optimal, safe recovery intervention based on the diagnosis.\n"
        "Required JSON Output Schema:\n"
        "{\n"
        '  "recommended_action": "RETRY_PAYMENT" | "SEND_PAYMENT_LINK" | '
        '"REQUEST_CUSTOMER_ACTION" | "MANUAL_REVIEW",\n'
        '  "priority": "HIGH" | "MEDIUM" | "LOW",\n'
        '  "reason_code": "<MACHINE_READABLE_CODE>",\n'
        '  "confidence": <float between 0.0 and 1.0>\n'
        "}\n\n"
        f"Diagnostic Summary:\n{json.dumps(context, indent=2)}"
    )
