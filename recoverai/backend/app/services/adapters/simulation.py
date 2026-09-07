"""
RecoverAI v3.2 — Simulation Adapter

Deterministically simulates action execution without external side-effects.
"""
from typing import ClassVar

from app.models.recovery_action import RecoveryAction
from app.services.adapters.base import BaseActionAdapter, AdapterResponse, AdapterOutcome


class SimulationAdapter(BaseActionAdapter):
    """
    Simulates external execution.
    Deterministic — uses class-level injection for testing specific outcomes.
    """
    
    # Allows tests to explicitly select the desired simulated outcome globally
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
            provider_reference=f"sim_{idempotency_key}",
            provider_code="SIM_00",
            message=f"Simulated outcome: {outcome.value}",
            raw_response_metadata={"idempotency_used": idempotency_key}
        )
