"""
RecoverAI v3.2 — State Machine Validators

Pure Python — no I/O, no async, no DB dependency.

Defines the canonical valid transitions for all three independent state machines:
  CaseState    → RecoveryCase lifecycle
  ActionState  → RecoveryAction lifecycle
  AttemptState → RecoveryAttempt lifecycle

Key design rules:
  1. Every transition must be in the explicit allow-list — deny-by-default.
  2. Invalid transitions raise InvalidTransitionError immediately.
  3. The Orchestrator is the ONLY caller of these validators.
     No API route or service method may mutate state without going through here.
  4. CaseState, ActionState, AttemptState are INDEPENDENT — never cross-check.
  5. Terminal states have empty frozensets (no transitions allowed out of them).

Recovery window:
  is_recovery_window_expired() checks wall-clock time against
  recovery_window_ends_at. Called before every RECOVERING attempt.

Idempotency key:
  build_idempotency_key() is the single canonical implementation.
  Format: "{merchant_id}:{recovery_case_id}:{action_id}"
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.models.enums import ActionState, AttemptState, CaseState

if TYPE_CHECKING:
    from app.models.recovery_case import RecoveryCase


# ── Exception ─────────────────────────────────────────────────────────────────

class InvalidTransitionError(ValueError):
    """
    Raised when a requested state transition is not in the allow-list.

    Attributes:
        current:  The entity's current state value.
        requested: The state that was requested.
        machine:  Name of the state machine ('case', 'action', 'attempt').
    """
    def __init__(self, current: str, requested: str, machine: str) -> None:
        self.current = current
        self.requested = requested
        self.machine = machine
        super().__init__(
            f"[{machine}] Invalid transition: {current!r} → {requested!r}. "
            f"This transition is not in the allow-list."
        )


# ── Case state machine ─────────────────────────────────────────────────────────
#
# DETECTED → ANALYZING → PREDICTED → DIAGNOSED → PLANNED → POLICY_CHECK
#         → RECOVERING → RECOVERED → CLOSED
#                      → RECOVERY_WINDOW_EXPIRED → CLOSED
#
# Special rule: RECOVERING can re-enter POLICY_CHECK for retries.
# Any non-terminal case can also transition to CLOSED (force-close).

CASE_TRANSITIONS: dict[CaseState, frozenset[CaseState]] = {
    CaseState.DETECTED: frozenset({CaseState.ANALYZING, CaseState.CLOSED}),
    CaseState.ANALYZING: frozenset({CaseState.PREDICTED, CaseState.CLOSED}),
    CaseState.PREDICTED: frozenset({CaseState.DIAGNOSED, CaseState.CLOSED}),
    CaseState.DIAGNOSED: frozenset({CaseState.PLANNED, CaseState.CLOSED}),
    CaseState.PLANNED: frozenset({CaseState.POLICY_CHECK, CaseState.CLOSED}),
    CaseState.POLICY_CHECK: frozenset({
        CaseState.RECOVERING,
        CaseState.CLOSED,
    }),
    CaseState.RECOVERING: frozenset({
        CaseState.RECOVERED,
        CaseState.RECOVERY_WINDOW_EXPIRED,
        CaseState.POLICY_CHECK,   # retry: go back to re-evaluate policy
        CaseState.CLOSED,
    }),
    CaseState.RECOVERED: frozenset({CaseState.CLOSED}),
    CaseState.RECOVERY_WINDOW_EXPIRED: frozenset({CaseState.CLOSED}),
    # Terminal — no transitions out
    CaseState.CLOSED: frozenset(),
}


# ── Action state machine ───────────────────────────────────────────────────────
#
# PROPOSED → APPROVED → EXECUTING → SUCCEEDED  (terminal)
#                                 → FAILED      (terminal)
#                                 → OUTCOME_UNKNOWN (terminal — never auto-retry)
#                                 → CANCELLED   (terminal)
#          → REJECTED  (terminal)
#          → CANCELLED (terminal)

ACTION_TRANSITIONS: dict[ActionState, frozenset[ActionState]] = {
    ActionState.PROPOSED: frozenset({
        ActionState.APPROVED,
        ActionState.REJECTED,
        ActionState.CANCELLED,
    }),
    ActionState.APPROVED: frozenset({
        ActionState.EXECUTING,
        ActionState.CANCELLED,
    }),
    ActionState.EXECUTING: frozenset({
        ActionState.SUCCEEDED,
        ActionState.FAILED,
        ActionState.OUTCOME_UNKNOWN,
        ActionState.CANCELLED,
    }),
    # Terminal states — no transitions out
    ActionState.SUCCEEDED: frozenset(),
    ActionState.FAILED: frozenset(),
    ActionState.OUTCOME_UNKNOWN: frozenset(),
    ActionState.REJECTED: frozenset(),
    ActionState.CANCELLED: frozenset(),
}


# ── Attempt state machine ──────────────────────────────────────────────────────
#
# STARTED → SUCCEEDED  (terminal)
#         → FAILED     (terminal)
#         → TIMEOUT    (terminal)
#         → UNKNOWN    (terminal — never auto-retry)

ATTEMPT_TRANSITIONS: dict[AttemptState, frozenset[AttemptState]] = {
    AttemptState.STARTED: frozenset({
        AttemptState.SUCCEEDED,
        AttemptState.FAILED,
        AttemptState.TIMEOUT,
        AttemptState.UNKNOWN,
    }),
    # Terminal states — no transitions out
    AttemptState.SUCCEEDED: frozenset(),
    AttemptState.FAILED: frozenset(),
    AttemptState.TIMEOUT: frozenset(),
    AttemptState.UNKNOWN: frozenset(),
}


# ── Validators ────────────────────────────────────────────────────────────────

def validate_case_transition(
    current: CaseState,
    requested: CaseState,
) -> None:
    """
    Assert that the requested CaseState transition is valid.

    Raises:
        InvalidTransitionError: If the transition is not in CASE_TRANSITIONS.
    """
    allowed = CASE_TRANSITIONS.get(current, frozenset())
    if requested not in allowed:
        raise InvalidTransitionError(
            current=current.value,
            requested=requested.value,
            machine="case",
        )


def validate_action_transition(
    current: ActionState,
    requested: ActionState,
) -> None:
    """
    Assert that the requested ActionState transition is valid.

    Raises:
        InvalidTransitionError: If the transition is not in ACTION_TRANSITIONS.
    """
    allowed = ACTION_TRANSITIONS.get(current, frozenset())
    if requested not in allowed:
        raise InvalidTransitionError(
            current=current.value,
            requested=requested.value,
            machine="action",
        )


def validate_attempt_transition(
    current: AttemptState,
    requested: AttemptState,
) -> None:
    """
    Assert that the requested AttemptState transition is valid.

    Raises:
        InvalidTransitionError: If the transition is not in ATTEMPT_TRANSITIONS.
    """
    allowed = ATTEMPT_TRANSITIONS.get(current, frozenset())
    if requested not in allowed:
        raise InvalidTransitionError(
            current=current.value,
            requested=requested.value,
            machine="attempt",
        )


# ── Terminal state helpers ─────────────────────────────────────────────────────

def is_case_terminal(state: CaseState) -> bool:
    """Return True if the CaseState is a terminal (no valid outgoing transitions)."""
    return len(CASE_TRANSITIONS.get(state, frozenset())) == 0


def is_action_terminal(state: ActionState) -> bool:
    """Return True if the ActionState is a terminal."""
    return len(ACTION_TRANSITIONS.get(state, frozenset())) == 0


def is_attempt_terminal(state: AttemptState) -> bool:
    """Return True if the AttemptState is a terminal."""
    return len(ATTEMPT_TRANSITIONS.get(state, frozenset())) == 0


# ── Recovery window ───────────────────────────────────────────────────────────

def is_recovery_window_expired(case: "RecoveryCase") -> bool:
    """
    Return True if the case's recovery window has passed.

    Rules:
      - If recovery_window_ends_at is None, the window is NOT expired
        (it hasn't been set yet — window hasn't opened).
      - Comparison is made against UTC wall clock.

    This must be checked before every recovery attempt.
    """
    if case.recovery_window_ends_at is None:
        return False
    now = datetime.now(tz=timezone.utc)
    # Ensure both sides are tz-aware for comparison
    ends_at = case.recovery_window_ends_at
    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    return now > ends_at


# ── Idempotency key ───────────────────────────────────────────────────────────

def build_idempotency_key(
    merchant_id: uuid.UUID,
    recovery_case_id: uuid.UUID,
    action_id: str,
) -> str:
    """
    Build the canonical idempotency key for a RecoveryAction.

    Format: "{merchant_id}:{recovery_case_id}:{action_id}"

    This is the SINGLE authoritative implementation.
    All callers (Orchestrator, tests, API) must use this function.
    Never construct the key manually.
    """
    return f"{merchant_id}:{recovery_case_id}:{action_id}"
