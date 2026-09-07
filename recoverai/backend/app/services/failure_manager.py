"""
RecoverAI v3.2 — Failure Manager (Action Execution Service)

Executes recovery actions via Adapters, classifies failures, and 
strictly updates state machines following Phase 4 transition rules.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.recovery_case import RecoveryCase
from app.models.manual_review import ManualReview
from app.models.audit_event import AuditEvent
from app.models.enums import AttemptState, ActionState, CaseState, ExecutionMode

from app.services.state_machine import (
    validate_case_transition,
    validate_action_transition,
    validate_attempt_transition,
)
from app.services.adapters.base import BaseActionAdapter, AdapterOutcome
from app.services.adapters.simulation import SimulationAdapter
from app.services.adapters.razorpay_test import RazorpayTestAdapter

class FailureManager:
    """Action Execution and Failure Classification Service."""

    @classmethod
    def execute_action(
        cls, db: Session, action: RecoveryAction, case: RecoveryCase
    ) -> RecoveryAttempt:
        """Executes the action and cascades state machine updates."""
        
        # 1. Select Adapter
        adapter: BaseActionAdapter
        if action.execution_mode == ExecutionMode.LIVE:
            adapter = RazorpayTestAdapter()
        else:
            adapter = SimulationAdapter()
            
        # 2. Transition Action to EXECUTING (if not already)
        if action.state != ActionState.EXECUTING:
            validate_action_transition(action.state, ActionState.EXECUTING)
            cls._create_audit(db, action, case, "ActionExecuting", action.state.value, ActionState.EXECUTING.value)
            action.state = ActionState.EXECUTING
            
        # 3. Create strictly one RecoveryAttempt
        # Query max attempt number
        max_attempt = db.query(RecoveryAttempt).filter_by(recovery_action_id=action.id).count()
        
        attempt = RecoveryAttempt(
            recovery_action_id=action.id,
            attempt_number=max_attempt + 1,
            state=AttemptState.STARTED,
            started_at=datetime.now(timezone.utc)
        )
        db.add(attempt)
        db.flush() # flush to get attempt.id
        
        cls._create_audit(db, action, case, "AttemptStarted", None, AttemptState.STARTED.value, attempt_id=attempt.id)
        
        # 4. Execute via Adapter (Pass idempotency_key explicitly)
        response = adapter.execute_action(action, action.idempotency_key)
        
        # 5. Route Outcome
        if response.outcome == AdapterOutcome.SUCCESS:
            cls._handle_success(db, action, case, attempt, response)
            
        elif response.outcome == AdapterOutcome.TEMPORARY_FAILURE:
            cls._handle_temporary_failure(db, action, case, attempt, response)
            
        elif response.outcome == AdapterOutcome.INVALID_REQUEST:
            cls._handle_invalid_request(db, action, case, attempt, response)
            
        elif response.outcome == AdapterOutcome.UNKNOWN:
            cls._handle_unknown(db, action, case, attempt, response)
            
        db.commit()
        db.refresh(attempt)
        return attempt

    @classmethod
    def _handle_success(cls, db, action, case, attempt, response):
        # Attempt: STARTED -> SUCCEEDED
        validate_attempt_transition(attempt.state, AttemptState.SUCCEEDED)
        cls._create_audit(db, action, case, "AttemptSucceeded", attempt.state.value, AttemptState.SUCCEEDED.value, attempt.id, response)
        attempt.state = AttemptState.SUCCEEDED
        
        # Action: EXECUTING -> SUCCEEDED
        validate_action_transition(action.state, ActionState.SUCCEEDED)
        cls._create_audit(db, action, case, "ActionSucceeded", action.state.value, ActionState.SUCCEEDED.value, attempt.id, response)
        action.state = ActionState.SUCCEEDED
        
        # Case: RECOVERING -> RECOVERED
        validate_case_transition(case.state, CaseState.RECOVERED)
        cls._create_audit(db, action, case, "CaseRecovered", case.state.value, CaseState.RECOVERED.value, attempt.id, response)
        case.state = CaseState.RECOVERED
        case.recovery_success_timestamp = datetime.now(timezone.utc)
        
        # Case: RECOVERED -> CLOSED
        validate_case_transition(case.state, CaseState.CLOSED)
        cls._create_audit(db, action, case, "CaseClosed", case.state.value, CaseState.CLOSED.value, attempt.id, response)
        case.state = CaseState.CLOSED

    @classmethod
    def _handle_temporary_failure(cls, db, action, case, attempt, response):
        # Attempt: STARTED -> FAILED
        validate_attempt_transition(attempt.state, AttemptState.FAILED)
        cls._create_audit(db, action, case, "AttemptFailed", attempt.state.value, AttemptState.FAILED.value, attempt.id, response)
        attempt.state = AttemptState.FAILED
        
        # Action remains EXECUTING (No transition)
        # Case remains RECOVERING (No transition)
        # Return control to PolicyEngine / Orchestrator for retry evaluation.

    @classmethod
    def _handle_invalid_request(cls, db, action, case, attempt, response):
        # Attempt: STARTED -> FAILED
        validate_attempt_transition(attempt.state, AttemptState.FAILED)
        cls._create_audit(db, action, case, "AttemptFailed", attempt.state.value, AttemptState.FAILED.value, attempt.id, response)
        attempt.state = AttemptState.FAILED
        
        # Action: EXECUTING -> FAILED
        validate_action_transition(action.state, ActionState.FAILED)
        cls._create_audit(db, action, case, "ActionFailed", action.state.value, ActionState.FAILED.value, attempt.id, response)
        action.state = ActionState.FAILED
        
        # Case remains RECOVERING per Phase 8 safety constraints unless another logic handles closure

    @classmethod
    def _handle_unknown(cls, db, action, case, attempt, response):
        # Attempt: STARTED -> UNKNOWN
        validate_attempt_transition(attempt.state, AttemptState.UNKNOWN)
        cls._create_audit(db, action, case, "AttemptUnknown", attempt.state.value, AttemptState.UNKNOWN.value, attempt.id, response)
        attempt.state = AttemptState.UNKNOWN
        
        # Action: EXECUTING -> OUTCOME_UNKNOWN
        validate_action_transition(action.state, ActionState.OUTCOME_UNKNOWN)
        cls._create_audit(db, action, case, "ActionOutcomeUnknown", action.state.value, ActionState.OUTCOME_UNKNOWN.value, attempt.id, response)
        action.state = ActionState.OUTCOME_UNKNOWN
        
        # Case remains RECOVERING (Do not add MANUAL_REVIEW CaseState)
        
        # 1. Create ManualReview record
        review = ManualReview(
            merchant_id=action.merchant_id,
            recovery_case_id=case.id,
            reason="UNKNOWN_ADAPTER_OUTCOME"
        )
        db.add(review)
        
        # 2. Write ManualReviewCreated AuditEvent
        cls._create_audit(
            db, action, case, "ManualReviewCreated", 
            case.state.value, case.state.value, 
            attempt.id, response
        )

    @classmethod
    def _create_audit(
        cls, db, action, case, event_type: str, old_state: Optional[str], new_state: str, 
        attempt_id: Optional[str] = None, response = None
    ):
        event = AuditEvent(
            event_type=event_type,
            merchant_id=action.merchant_id,
            recovery_case_id=case.id,
            correlation_id=case.correlation_id,
            event_data={
                "recovery_action_id": str(action.id),
                "recovery_attempt_id": str(attempt_id) if attempt_id else None,
                "previous_state": old_state,
                "new_state": new_state,
                "provider_reference": response.provider_reference if response else None,
                "provider_code": response.provider_code if response else None,
                "outcome": response.outcome.value if response else None,
                "message": response.message if response else None,
            }
        )
        db.add(event)
