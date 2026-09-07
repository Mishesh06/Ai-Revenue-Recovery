"""
RecoverAI v3.2 — Domain Enums

All state machines and mode enums are defined here as independent enums.
Case, Action, and Attempt states MUST NOT be merged.
"""

import enum


class CaseState(str, enum.Enum):
    """
    Recovery Case state machine.

    Lifecycle:
      DETECTED → ANALYZING → PREDICTED → DIAGNOSED → PLANNED
               → POLICY_CHECK → RECOVERING → RECOVERED
                                           → RECOVERY_WINDOW_EXPIRED
                                           → CLOSED
    """
    DETECTED = "DETECTED"
    ANALYZING = "ANALYZING"
    PREDICTED = "PREDICTED"
    DIAGNOSED = "DIAGNOSED"
    PLANNED = "PLANNED"
    POLICY_CHECK = "POLICY_CHECK"
    RECOVERING = "RECOVERING"
    RECOVERED = "RECOVERED"
    RECOVERY_WINDOW_EXPIRED = "RECOVERY_WINDOW_EXPIRED"
    CLOSED = "CLOSED"


class ActionState(str, enum.Enum):
    """
    Recovery Action state machine.

    Independent from CaseState — do NOT conflate.

    Lifecycle:
      PROPOSED → APPROVED → EXECUTING → SUCCEEDED
                          → FAILED
                          → OUTCOME_UNKNOWN
              → REJECTED
              → CANCELLED
    """
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTING = "EXECUTING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    OUTCOME_UNKNOWN = "OUTCOME_UNKNOWN"
    CANCELLED = "CANCELLED"


class AttemptState(str, enum.Enum):
    """
    Recovery Attempt state machine.

    Independent from ActionState — do NOT conflate.
    One Action may have multiple Attempts; each Attempt gets its own state.
    """
    STARTED = "STARTED"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"
    UNKNOWN = "UNKNOWN"


class ExecutionMode(str, enum.Enum):
    """
    Determines which adapter is used for execution.

    LIVE       → Razorpay Live Adapter (production)
    SIMULATION → Simulation Adapter (testing / dry-run)
    """
    LIVE = "LIVE"
    SIMULATION = "SIMULATION"


class PolicyDecision(str, enum.Enum):
    """
    Policy engine decisions.
    """
    APPROVED = "APPROVED"
    REVIEW = "REVIEW"
    BLOCKED = "BLOCKED"
