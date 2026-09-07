"""
RecoverAI v3.2 — Recovery Service

Owns ALL database mutations in the recovery workflow.

Rules:
  - This service is the single source of truth for state persistence.
  - State validation is always delegated to state_machine.py BEFORE writing.
  - Every case state transition writes an audit event.
  - Action/Attempt transitions do NOT write audit events by default
    (only the Orchestrator layer does, to avoid double-writing).
  - Idempotency: create_action() returns existing action if idempotency_key matches.
  - UNKNOWN outcome: handled by handle_unknown_outcome() — never auto-retried.
  - attempt_number is monotonically increasing per action, sourced from DB count.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ActionState, AttemptState, CaseState, ExecutionMode
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.recovery_case import RecoveryCase
from app.services.audit_service import AuditService
from app.services.state_machine import (
    build_idempotency_key,
    validate_action_transition,
    validate_attempt_transition,
    validate_case_transition,
)


class RecoveryService:
    """
    Transactional recovery workflow service.

    Owns all INSERT/UPDATE operations on:
      - recovery_cases
      - recovery_actions
      - recovery_attempts
      - audit_events (via AuditService)

    Callers are responsible for committing the session.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Case transitions ──────────────────────────────────────────────────────

    async def transition_case(
        self,
        case: RecoveryCase,
        new_state: CaseState,
        audit_svc: AuditService,
        correlation_id: str,
        event_type: str,
        event_data: dict[str, Any] | None = None,
    ) -> RecoveryCase:
        """
        Validate and persist a CaseState transition, then write an audit event.

        Args:
            case:           The RecoveryCase to transition.
            new_state:      The target CaseState.
            audit_svc:      AuditService bound to the same session.
            correlation_id: Trace ID propagated through the entire lifecycle.
            event_type:     Canonical audit event type for this transition.
            event_data:     Optional JSONB payload attached to the audit event.

        Returns:
            The mutated RecoveryCase (same object, state updated in-place).

        Raises:
            InvalidTransitionError: If the transition is not in the allow-list.
            ValueError: If event_type is not canonical.
        """
        validate_case_transition(case.state, new_state)
        case.state = new_state

        # Set timestamps for specific states
        now = datetime.now(tz=timezone.utc)
        if new_state == CaseState.RECOVERING and case.recovery_window_started_at is None:
            case.recovery_window_started_at = now
        if new_state == CaseState.RECOVERED:
            case.recovered_at = now

        self._session.add(case)
        await self._session.flush()

        await audit_svc.write(
            merchant_id=case.merchant_id,
            correlation_id=correlation_id,
            event_type=event_type,
            recovery_case_id=case.id,
            event_data=event_data,
        )
        return case

    # ── Action transitions ────────────────────────────────────────────────────

    async def transition_action(
        self,
        action: RecoveryAction,
        new_state: ActionState,
    ) -> RecoveryAction:
        """
        Validate and persist an ActionState transition.

        Note: Does NOT write an audit event — the Orchestrator layer handles that
        alongside the case transition to avoid duplicate events.

        Raises:
            InvalidTransitionError: If the transition is not in the allow-list.
        """
        validate_action_transition(action.state, new_state)
        action.state = new_state
        self._session.add(action)
        await self._session.flush()
        return action

    # ── Attempt transitions ───────────────────────────────────────────────────

    async def transition_attempt(
        self,
        attempt: RecoveryAttempt,
        new_state: AttemptState,
    ) -> RecoveryAttempt:
        """
        Validate and persist an AttemptState transition.

        Raises:
            InvalidTransitionError: If the transition is not in the allow-list.
        """
        validate_attempt_transition(attempt.state, new_state)
        attempt.state = new_state

        now = datetime.now(tz=timezone.utc)
        if new_state in {
            AttemptState.SUCCEEDED,
            AttemptState.FAILED,
            AttemptState.TIMEOUT,
            AttemptState.UNKNOWN,
        }:
            attempt.completed_at = now

        self._session.add(attempt)
        await self._session.flush()
        return attempt

    # ── Action creation (idempotency-safe) ────────────────────────────────────

    async def create_action(
        self,
        case: RecoveryCase,
        action_id: str,
        execution_mode: ExecutionMode,
        idempotency_key: str,
    ) -> tuple[RecoveryAction, bool]:
        """
        Create a new RecoveryAction, or return the existing one if the
        idempotency_key is already present.

        Returns:
            (action, created): created=True if a new action was inserted,
                               created=False if an existing one was returned.
        """
        # Check for existing action with same key
        result = await self._session.execute(
            select(RecoveryAction).where(
                RecoveryAction.idempotency_key == idempotency_key
            )
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            return existing, False

        action = RecoveryAction(
            merchant_id=case.merchant_id,
            recovery_case_id=case.id,
            action_id=action_id,
            state=ActionState.PROPOSED,
            execution_mode=execution_mode,
            idempotency_key=idempotency_key,
        )
        self._session.add(action)
        await self._session.flush()
        return action, True

    # ── Attempt creation ──────────────────────────────────────────────────────

    async def create_attempt(
        self,
        action: RecoveryAction,
    ) -> RecoveryAttempt:
        """
        Create a new RecoveryAttempt for the given action.

        attempt_number is monotonically increasing — computed from the
        current count of attempts on the action, not hardcoded.

        Returns:
            The newly created RecoveryAttempt in STARTED state.
        """
        # Count existing attempts for this action to determine next number
        result = await self._session.execute(
            select(func.count()).where(
                RecoveryAttempt.recovery_action_id == action.id
            )
        )
        current_count = result.scalar_one()
        next_attempt_number = current_count + 1

        attempt = RecoveryAttempt(
            recovery_action_id=action.id,
            attempt_number=next_attempt_number,
            state=AttemptState.STARTED,
            started_at=datetime.now(tz=timezone.utc),
        )
        self._session.add(attempt)
        await self._session.flush()
        return attempt

    # ── Unknown outcome handler ───────────────────────────────────────────────

    async def handle_unknown_outcome(
        self,
        attempt: RecoveryAttempt,
        action: RecoveryAction,
        case: RecoveryCase,
        audit_svc: AuditService,
        correlation_id: str,
    ) -> tuple[RecoveryAttempt, RecoveryAction, RecoveryCase]:
        """
        Handle an ambiguous/unknown adapter result.

        Rule (canonical RecoverAI):
          Attempt  → UNKNOWN
          Action   → OUTCOME_UNKNOWN
          Case     → NO automatic retry; stays in current state pending manual review.
                     An audit event ManualReviewCreated is written.

        NEVER retry automatically when the outcome is UNKNOWN.

        Returns:
            (attempt, action, case) with updated states.
        """
        attempt = await self.transition_attempt(attempt, AttemptState.UNKNOWN)
        action = await self.transition_action(action, ActionState.OUTCOME_UNKNOWN)

        # Case stays in its current state (RECOVERING); manual review is triggered
        await audit_svc.write(
            merchant_id=case.merchant_id,
            correlation_id=correlation_id,
            event_type="ManualReviewCreated",
            recovery_case_id=case.id,
            event_data={
                "reason": "Adapter returned ambiguous outcome (UNKNOWN). Manual review required.",
                "action_id": str(action.id),
                "attempt_id": str(attempt.id),
                "attempt_number": attempt.attempt_number,
            },
        )
        return attempt, action, case

    # ── Recovery window expiry ────────────────────────────────────────────────

    async def expire_recovery_window(
        self,
        case: RecoveryCase,
        audit_svc: AuditService,
        correlation_id: str,
    ) -> RecoveryCase:
        """
        Transition the case to RECOVERY_WINDOW_EXPIRED and write an audit event.

        Raises:
            InvalidTransitionError: If the current state does not allow this transition.
        """
        return await self.transition_case(
            case=case,
            new_state=CaseState.RECOVERY_WINDOW_EXPIRED,
            audit_svc=audit_svc,
            correlation_id=correlation_id,
            event_type="RecoveryWindowExpired",
            event_data={"expired_at": datetime.now(tz=timezone.utc).isoformat()},
        )

    # ── Case closure ──────────────────────────────────────────────────────────

    async def close_case(
        self,
        case: RecoveryCase,
        audit_svc: AuditService,
        correlation_id: str,
    ) -> RecoveryCase:
        """
        Transition the case to CLOSED and write a CaseClosed audit event.

        Raises:
            InvalidTransitionError: If the current state does not allow CLOSED.
        """
        return await self.transition_case(
            case=case,
            new_state=CaseState.CLOSED,
            audit_svc=audit_svc,
            correlation_id=correlation_id,
            event_type="CaseClosed",
            event_data={"closed_at": datetime.now(tz=timezone.utc).isoformat()},
        )
