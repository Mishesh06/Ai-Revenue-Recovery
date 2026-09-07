"""
RecoverAI v3.2 — Recovery Orchestrator

The Orchestrator owns the complete recovery workflow lifecycle.
It is the ONLY entry point for moving a RecoveryCase through its state machine.

Design rules:
  1. No direct state mutation — all writes go through RecoveryService.
  2. No ML, LLM, Razorpay, or policy engine calls (deferred to future phases).
     These are represented as explicit method stubs with clear boundaries.
  3. Every public method validates transitions before persisting.
  4. correlation_id is always propagated — never derived independently.
  5. Retry: creates a new RecoveryAttempt under the SAME RecoveryAction,
     and transitions the case back to POLICY_CHECK first.
  6. UNKNOWN: delegates to RecoveryService.handle_unknown_outcome().
     Never auto-retries.

Lifecycle (happy path)::

    DETECTED
      → begin_analysis()    → ANALYZING
      → record_prediction() → PREDICTED
      → record_diagnosis()  → DIAGNOSED
      → plan_recovery()     → PLANNED
      → check_policy()      → POLICY_CHECK
      → begin_recovery()    → RECOVERING
      → execute_action()    → creates RecoveryAction (PROPOSED→APPROVED→EXECUTING)
                               + RecoveryAttempt (STARTED)
      → record_attempt_outcome(SUCCEEDED) → Attempt SUCCEEDED, Action SUCCEEDED
      → complete_recovery()  → RECOVERED → CLOSED

Retry path::

    RECOVERING (action FAILED)
      → retry_action()      → Case: RECOVERING → POLICY_CHECK → RECOVERING
                               New RecoveryAttempt (STARTED)

Expiry path::

    RECOVERING
      → expire_window()     → RECOVERY_WINDOW_EXPIRED → CLOSED
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ActionState, AttemptState, CaseState, ExecutionMode
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.recovery_case import RecoveryCase
from app.services.audit_service import AuditService
from app.services.recovery_service import RecoveryService
from app.services.state_machine import (
    build_idempotency_key,
    is_recovery_window_expired,
)


class RecoveryOrchestrator:
    """
    Entry point for all recovery workflow state changes.

    Usage::

        async with AsyncSession(...) as session:
            orchestrator = RecoveryOrchestrator(session)
            case = await orchestrator.begin_analysis(case)
            await session.commit()
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._svc = RecoveryService(session)
        self._audit = AuditService(session)

    # ── Phase 1: DETECTED → ANALYZING ─────────────────────────────────────────

    async def begin_analysis(self, case: RecoveryCase) -> RecoveryCase:
        """
        Transition: DETECTED → ANALYZING.

        Called when the system picks up a new failed-payment case for analysis.
        In future phases, this would enqueue an ML prediction job.
        """
        return await self._svc.transition_case(
            case=case,
            new_state=CaseState.ANALYZING,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
            event_type="OpportunityDetected",
            event_data={"case_id": str(case.id)},
        )

    # ── Phase 2: ANALYZING → PREDICTED ────────────────────────────────────────

    async def record_prediction(
        self,
        case: RecoveryCase,
        confidence: float | None = None,
    ) -> RecoveryCase:
        """
        Transition: ANALYZING → PREDICTED.

        Called after the ML model produces a prediction.
        confidence (0.0–1.0) is stored on the case and passed as event_data.
        """
        if confidence is not None:
            case.confidence = confidence
            self._session.add(case)
            await self._session.flush()

        return await self._svc.transition_case(
            case=case,
            new_state=CaseState.PREDICTED,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
            event_type="PredictionCreated",
            event_data={"confidence": confidence},
        )

    # ── Phase 3: PREDICTED → DIAGNOSED ────────────────────────────────────────

    async def record_diagnosis(self, case: RecoveryCase) -> RecoveryCase:
        """
        Transition: PREDICTED → DIAGNOSED.

        Called after the diagnosis agent produces a root-cause analysis.
        """
        return await self._svc.transition_case(
            case=case,
            new_state=CaseState.DIAGNOSED,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
            event_type="DiagnosisCreated",
            event_data={"case_id": str(case.id)},
        )

    # ── Phase 4: DIAGNOSED → PLANNED ──────────────────────────────────────────

    async def plan_recovery(self, case: RecoveryCase) -> RecoveryCase:
        """
        Transition: DIAGNOSED → PLANNED.

        Called after the planning agent selects an action strategy.
        """
        return await self._svc.transition_case(
            case=case,
            new_state=CaseState.PLANNED,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
            event_type="RecoveryPlanned",
            event_data={"case_id": str(case.id)},
        )

    # ── Phase 5: PLANNED → POLICY_CHECK ───────────────────────────────────────

    async def check_policy(self, case: RecoveryCase) -> RecoveryCase:
        """
        Transition: PLANNED → POLICY_CHECK (or RECOVERING → POLICY_CHECK for retries).

        In future phases, this will invoke the Policy Engine.
        For now it is a pure state transition.
        """
        return await self._svc.transition_case(
            case=case,
            new_state=CaseState.POLICY_CHECK,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
            event_type="PolicyEvaluated",
            event_data={"case_id": str(case.id), "decision": "APPROVED"},
        )

    # ── Phase 6: POLICY_CHECK → RECOVERING ────────────────────────────────────

    async def begin_recovery(self, case: RecoveryCase) -> RecoveryCase:
        """
        Transition: POLICY_CHECK → RECOVERING.

        Opens the recovery window. Sets recovery_window_started_at if not already set.
        """
        return await self._svc.transition_case(
            case=case,
            new_state=CaseState.RECOVERING,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
            event_type="RecoveryApproved",
            event_data={"case_id": str(case.id)},
        )

    # ── Execute action (RECOVERING → Action lifecycle) ────────────────────────

    async def execute_action(
        self,
        case: RecoveryCase,
        action_id: str,
        execution_mode: ExecutionMode,
        idempotency_key: str | None = None,
    ) -> tuple[RecoveryAction, RecoveryAttempt]:
        """
        Create (or retrieve) a RecoveryAction, approve and begin executing it,
        then create the first RecoveryAttempt.

        Idempotency:
          If a RecoveryAction with the same idempotency_key already exists,
          it is returned without creating a new one. A new RecoveryAttempt
          IS still created (retrying an action creates a new attempt).

        Args:
            case:            The case in RECOVERING state.
            action_id:       String identifier for the action type (e.g. "RETRY_PAYMENT").
            execution_mode:  LIVE or SIMULATION.
            idempotency_key: Canonical key. If None, built via build_idempotency_key().

        Returns:
            (action, attempt): The RecoveryAction and its new RecoveryAttempt.
        """
        if idempotency_key is None:
            idempotency_key = build_idempotency_key(
                merchant_id=case.merchant_id,
                recovery_case_id=case.id,
                action_id=action_id,
            )

        action, created = await self._svc.create_action(
            case=case,
            action_id=action_id,
            execution_mode=execution_mode,
            idempotency_key=idempotency_key,
        )

        # Move action to APPROVED then EXECUTING (only if it was just created
        # or if it's still PROPOSED)
        if action.state == ActionState.PROPOSED:
            action = await self._svc.transition_action(action, ActionState.APPROVED)
            action = await self._svc.transition_action(action, ActionState.EXECUTING)

        # Always create a new attempt (retry semantics)
        attempt = await self._svc.create_attempt(action)

        await self._audit.write(
            merchant_id=case.merchant_id,
            correlation_id=case.correlation_id,
            event_type="RecoveryExecuted",
            recovery_case_id=case.id,
            event_data={
                "action_id": str(action.id),
                "action_type": action.action_id,
                "attempt_number": attempt.attempt_number,
                "execution_mode": execution_mode.value,
                "idempotency_key": idempotency_key,
            },
        )
        return action, attempt

    # ── Record attempt outcome ────────────────────────────────────────────────

    async def record_attempt_outcome(
        self,
        attempt: RecoveryAttempt,
        action: RecoveryAction,
        case: RecoveryCase,
        outcome: AttemptState,
        correlation_id: str,
        error_code: str | None = None,
        error_message: str | None = None,
        adapter_response_reference: str | None = None,
    ) -> tuple[RecoveryAttempt, RecoveryAction, RecoveryCase]:
        """
        Record the result of an attempt and drive the appropriate state transitions.

        Outcome mappings:
          SUCCEEDED → Attempt:SUCCEEDED, Action:SUCCEEDED, Case:RECOVERED
          FAILED    → Attempt:FAILED,    Action:FAILED,    Case stays RECOVERING
          TIMEOUT   → Attempt:TIMEOUT,   Action:FAILED,    Case stays RECOVERING
          UNKNOWN   → delegates to handle_unknown_outcome() — ManualReviewCreated

        Args:
            attempt:                   The RecoveryAttempt to finalize.
            action:                    The parent RecoveryAction.
            case:                      The RecoveryCase being worked.
            outcome:                   AttemptState terminal value.
            correlation_id:            Trace ID.
            error_code:                Optional error code (for FAILED/TIMEOUT).
            error_message:             Optional error message.
            adapter_response_reference: Optional external reference ID.

        Returns:
            (attempt, action, case) with final states.
        """
        # Attach error fields to the attempt before transition
        if error_code is not None:
            attempt.error_code = error_code
        if error_message is not None:
            attempt.error_message = error_message
        if adapter_response_reference is not None:
            attempt.adapter_response_reference = adapter_response_reference
        self._session.add(attempt)

        # UNKNOWN outcome: special path — never auto-retry
        if outcome == AttemptState.UNKNOWN:
            return await self._svc.handle_unknown_outcome(
                attempt=attempt,
                action=action,
                case=case,
                audit_svc=self._audit,
                correlation_id=correlation_id,
            )

        # Transition attempt to terminal state
        attempt = await self._svc.transition_attempt(attempt, outcome)

        # Drive action and case based on outcome
        if outcome == AttemptState.SUCCEEDED:
            action = await self._svc.transition_action(action, ActionState.SUCCEEDED)
            # Case: RECOVERING → RECOVERED
            case = await self._svc.transition_case(
                case=case,
                new_state=CaseState.RECOVERED,
                audit_svc=self._audit,
                correlation_id=correlation_id,
                event_type="RecoverySucceeded",
                event_data={
                    "action_id": str(action.id),
                    "attempt_number": attempt.attempt_number,
                },
            )

        elif outcome in {AttemptState.FAILED, AttemptState.TIMEOUT}:
            action = await self._svc.transition_action(action, ActionState.FAILED)
            # Case stays in RECOVERING — caller may retry or expire
            await self._audit.write(
                merchant_id=case.merchant_id,
                correlation_id=correlation_id,
                event_type="RecoveryFailed",
                recovery_case_id=case.id,
                event_data={
                    "action_id": str(action.id),
                    "attempt_number": attempt.attempt_number,
                    "outcome": outcome.value,
                    "error_code": error_code,
                },
            )

        return attempt, action, case

    # ── Retry action ──────────────────────────────────────────────────────────

    async def retry_action(
        self,
        action: RecoveryAction,
        case: RecoveryCase,
        correlation_id: str,
    ) -> RecoveryAttempt:
        """
        Create a new RecoveryAttempt under the SAME RecoveryAction.

        Rule: Before retrying, the case must go back to POLICY_CHECK
        so the current policy version is re-evaluated.

        Flow:
          Case: RECOVERING → POLICY_CHECK → RECOVERING
          New RecoveryAttempt created (attempt_number += 1)
          The RecoveryAction stays in its current state (FAILED/EXECUTING).
          Only the case state cycles through POLICY_CHECK.

        Args:
            action:         The RecoveryAction to retry (typically FAILED).
            case:           The parent RecoveryCase.
            correlation_id: Trace ID.

        Returns:
            The new RecoveryAttempt in STARTED state.
        """
        # Re-evaluate policy before retrying
        case = await self._svc.transition_case(
            case=case,
            new_state=CaseState.POLICY_CHECK,
            audit_svc=self._audit,
            correlation_id=correlation_id,
            event_type="PolicyEvaluated",
            event_data={"case_id": str(case.id), "decision": "APPROVED", "retry": True},
        )
        case = await self._svc.transition_case(
            case=case,
            new_state=CaseState.RECOVERING,
            audit_svc=self._audit,
            correlation_id=correlation_id,
            event_type="RecoveryApproved",
            event_data={"case_id": str(case.id), "retry": True},
        )

        # Create a new attempt under the same action (action state unchanged)
        new_attempt = await self._svc.create_attempt(action)

        await self._audit.write(
            merchant_id=case.merchant_id,
            correlation_id=correlation_id,
            event_type="RecoveryExecuted",
            recovery_case_id=case.id,
            event_data={
                "action_id": str(action.id),
                "attempt_number": new_attempt.attempt_number,
                "retry": True,
            },
        )
        return new_attempt

    # ── Complete recovery (RECOVERED → CLOSED) ────────────────────────────────

    async def complete_recovery(self, case: RecoveryCase) -> RecoveryCase:
        """
        Transition: RECOVERING → RECOVERED → CLOSED.

        Convenience method for the happy-path completion.
        Typically called after record_attempt_outcome(SUCCEEDED) has moved
        the case to RECOVERED.
        """
        return await self._svc.close_case(
            case=case,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
        )

    # ── Expire recovery window ────────────────────────────────────────────────

    async def expire_window(self, case: RecoveryCase) -> RecoveryCase:
        """
        Transition: RECOVERING → RECOVERY_WINDOW_EXPIRED → CLOSED.

        Called when is_recovery_window_expired() returns True or a scheduler
        detects the deadline has passed.
        """
        case = await self._svc.expire_recovery_window(
            case=case,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
        )
        return await self._svc.close_case(
            case=case,
            audit_svc=self._audit,
            correlation_id=case.correlation_id,
        )
