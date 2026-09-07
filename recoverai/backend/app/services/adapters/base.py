"""
RecoverAI v3.2 — Base Action Adapter

Defines the core interface for action execution (Live or Simulation).
"""

import enum
from typing import Any, Dict, Optional
from pydantic import BaseModel
from app.models.recovery_action import RecoveryAction


class AdapterOutcome(str, enum.Enum):
    SUCCESS = "SUCCESS"
    TEMPORARY_FAILURE = "TEMPORARY_FAILURE"
    INVALID_REQUEST = "INVALID_REQUEST"
    UNKNOWN = "UNKNOWN"


class AdapterResponse(BaseModel):
    outcome: AdapterOutcome
    provider_reference: Optional[str] = None
    provider_code: Optional[str] = None
    message: Optional[str] = None
    raw_response_metadata: Dict[str, Any] = {}


class BaseActionAdapter:
    """Abstract base class for all Action Adapters."""
    
    def execute_action(
        self,
        action: RecoveryAction,
        idempotency_key: str
    ) -> AdapterResponse:
        """
        Execute the action via the provider.
        The adapter is responsible ONLY for external execution.
        It must NOT mutate application state machines.
        """
        raise NotImplementedError("Subclasses must implement execute_action")
