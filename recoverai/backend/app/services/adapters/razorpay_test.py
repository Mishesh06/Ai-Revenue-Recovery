"""
RecoverAI v3.2 — Razorpay Test Adapter

Test-only mock adapter for Razorpay execution.
Does NOT call real Razorpay APIs. Does NOT use real credentials.
"""
from typing import ClassVar

from app.models.recovery_action import RecoveryAction
from app.services.adapters.base import BaseActionAdapter, AdapterResponse, AdapterOutcome


class RazorpayTestAdapter(BaseActionAdapter):
    """
    Mock adapter simulating Razorpay responses.
    Deterministic — uses class-level injection for testing specific outcomes.
    """
    
    _injected_outcome: ClassVar[AdapterOutcome] = AdapterOutcome.SUCCESS

    @classmethod
    def set_injected_outcome(cls, outcome: AdapterOutcome):
        cls._injected_outcome = outcome

    def execute_action(
        self,
        action: RecoveryAction,
        idempotency_key: str
    ) -> AdapterResponse:
        
        outcome = self._injected_outcome
        
        return AdapterResponse(
            outcome=outcome,
            provider_reference=f"pay_mock_{idempotency_key[:8]}",
            provider_code="rzp_mock",
            message=f"Razorpay mock outcome: {outcome.value}",
            raw_response_metadata={"mocked": True, "idempotency_used": idempotency_key}
        )
