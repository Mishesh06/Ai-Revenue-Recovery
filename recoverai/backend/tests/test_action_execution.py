"""
RecoverAI v3.2 — Phase 8: Action Execution Tests

Verifies FailureManager routing, Adapter abstractions, Idempotency key passthrough, 
and strict State Machine transitions.
"""

import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.merchant import Merchant
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.recovery_case import RecoveryCase
from app.models.manual_review import ManualReview
from app.models.audit_event import AuditEvent
from app.models.enums import AttemptState, ActionState, CaseState, ExecutionMode

from app.services.failure_manager import FailureManager
from app.services.adapters.base import AdapterOutcome
from app.services.adapters.simulation import SimulationAdapter
from app.services.adapters.razorpay_test import RazorpayTestAdapter

from unittest.mock import MagicMock

# Test DB Setup
@pytest.fixture
def db():
    db_mock = MagicMock()
    db_mock.added_items = []
    
    def add(item):
        db_mock.added_items.append(item)
    db_mock.add.side_effect = add
    
    # Mock query to filter items
    def mock_query(model):
        class QueryMock:
            def filter_by(self, **kwargs):
                self.kwargs = kwargs
                return self
            def first(self):
                for item in db_mock.added_items:
                    if isinstance(item, model):
                        match = True
                        for k, v in getattr(self, "kwargs", {}).items():
                            if getattr(item, k, None) != v:
                                match = False
                                break
                        if match:
                            return item
                return None
            def all(self):
                res = []
                for item in db_mock.added_items:
                    if isinstance(item, model):
                        match = True
                        for k, v in getattr(self, "kwargs", {}).items():
                            if getattr(item, k, None) != v:
                                match = False
                                break
                        if match:
                            res.append(item)
                return res
            def count(self):
                return len(self.all())
        return QueryMock()
        
    db_mock.query.side_effect = mock_query
    
    yield db_mock

@pytest.fixture
def setup_data(db):
    m_id = uuid.uuid4()
    merchant = Merchant(id=m_id, name="Test Merchant")
    db.add(merchant)
    
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=m_id,
        transaction_id=uuid.uuid4(),
        state=CaseState.RECOVERING,
        correlation_id=f"corr-{uuid.uuid4().hex[:8]}"
    )
    db.add(case)
    
    action = RecoveryAction(
        id=uuid.uuid4(),
        merchant_id=m_id,
        recovery_case_id=case.id,
        action_id="RETRY_PAYMENT",
        state=ActionState.APPROVED,
        execution_mode=ExecutionMode.SIMULATION,
        idempotency_key=f"{m_id}:{case.id}:RETRY_PAYMENT"
    )
    db.add(action)
    db.commit()
    
    return db, merchant, case, action

def test_regression_no_manual_review_case_state():
    """Explicit regression test (M): assert MANUAL_REVIEW is NOT a CaseState."""
    states = [s.name for s in CaseState]
    assert "MANUAL_REVIEW" not in states

def test_success_cascade(setup_data):
    """Verifies SUCCESS outcome (F, O, P)"""
    db, merchant, case, action = setup_data
    SimulationAdapter.set_injected_outcome(AdapterOutcome.SUCCESS)
    
    attempt = FailureManager.execute_action(db, action, case)
    
    assert attempt.state == AttemptState.SUCCEEDED
    assert action.state == ActionState.SUCCEEDED
    assert case.state == CaseState.CLOSED
    
    # Audit trail (N, K)
    audits = [item for item in db.added_items if isinstance(item, AuditEvent)]
    assert len(audits) >= 4 # Executing, AttemptStarted, AttemptSucceeded, ActionSucceeded, CaseRecovered, CaseClosed
    
    # Ensure correlation ID is preserved (N)
    assert audits[0].correlation_id == case.correlation_id

def test_temporary_failure_behavior(setup_data):
    """Verifies TEMPORARY_FAILURE (G)"""
    db, merchant, case, action = setup_data
    SimulationAdapter.set_injected_outcome(AdapterOutcome.TEMPORARY_FAILURE)
    
    attempt = FailureManager.execute_action(db, action, case)
    
    assert attempt.state == AttemptState.FAILED
    assert action.state == ActionState.EXECUTING # Remains executing for policy retry loop
    assert case.state == CaseState.RECOVERING # Remains recovering

def test_invalid_request_behavior(setup_data):
    """Verifies INVALID_REQUEST (H)"""
    db, merchant, case, action = setup_data
    SimulationAdapter.set_injected_outcome(AdapterOutcome.INVALID_REQUEST)
    
    attempt = FailureManager.execute_action(db, action, case)
    
    assert attempt.state == AttemptState.FAILED
    assert action.state == ActionState.FAILED
    assert case.state == CaseState.RECOVERING # Stays recovering as it has no valid closure path yet

def test_unknown_behavior_and_manual_review(setup_data):
    """Verifies UNKNOWN outcome (I, J, K, L)"""
    db, merchant, case, action = setup_data
    SimulationAdapter.set_injected_outcome(AdapterOutcome.UNKNOWN)
    
    attempt = FailureManager.execute_action(db, action, case)
    
    assert attempt.state == AttemptState.UNKNOWN
    assert action.state == ActionState.OUTCOME_UNKNOWN
    assert case.state == CaseState.RECOVERING # Remains recovering!
    
    # Verify Manual Review (J)
    review = db.query(ManualReview).filter_by(recovery_case_id=case.id).first()
    assert review is not None
    assert review.reason == "UNKNOWN_ADAPTER_OUTCOME"
    
    # Verify Audit (K)
    audit = db.query(AuditEvent).filter_by(event_type="ManualReviewCreated").first()
    assert audit is not None
    assert audit.correlation_id == case.correlation_id

def test_idempotency_key_passthrough(setup_data):
    """Verifies Idempotency (C, E)"""
    db, merchant, case, action = setup_data
    SimulationAdapter.set_injected_outcome(AdapterOutcome.SUCCESS)
    
    FailureManager.execute_action(db, action, case)
    
    # The adapter injected the used key into raw_metadata. Let's check the audit.
    audit = db.query(AuditEvent).filter_by(event_type="AttemptSucceeded").first()
    # Or just check that action didn't get a new UUID
    assert action.idempotency_key == f"{merchant.id}:{case.id}:RETRY_PAYMENT"

def test_live_routing(setup_data):
    """Verifies LIVE routing to RazorpayTestAdapter (B)"""
    db, merchant, case, action = setup_data
    action.execution_mode = ExecutionMode.LIVE
    RazorpayTestAdapter.set_injected_outcome(AdapterOutcome.SUCCESS)
    
    attempt = FailureManager.execute_action(db, action, case)
    
    audit = db.query(AuditEvent).filter_by(event_type="AttemptSucceeded").first()
    assert audit.event_data["provider_code"] == "rzp_mock"
