"""
RecoverAI v3.2 — Phase 7: AI Agent Tests

Verifies LLM valid parsing, Pydantic validation, and strict rule-based fallback behavior.
"""

import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.agent_run import AgentRun
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.models.enums import CaseState
from app.schemas.agents import DiagnosisOutput, RecoveryPlanOutput
from app.services.agent_service import AgentService
from app.services.llm_client import llm_client
from unittest.mock import MagicMock

# Test DB Setup
@pytest.fixture
def db():
    db_mock = MagicMock()
    # To capture the added AgentRun
    db_mock.added_items = []
    def add(item):
        db_mock.added_items.append(item)
    db_mock.add.side_effect = add
    yield db_mock

@pytest.fixture
def mock_case():
    return RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=uuid.uuid4(),
        transaction_id=uuid.uuid4(),
        state=CaseState.PLANNED,
        correlation_id=f"corr-{uuid.uuid4().hex[:8]}"
    )

@pytest.fixture
def mock_transaction():
    return Transaction(
        id=uuid.uuid4(),
        merchant_id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        amount="100.00",
        currency="USD",
        status="insufficient_funds"
    )

@pytest.fixture(autouse=True)
def reset_llm_client():
    """Reset LLM client behavior before each test."""
    llm_client.inject_timeout = False
    llm_client.inject_unavailable = False
    llm_client.inject_malformed_json = False
    llm_client.inject_invalid_schema = False
    yield

def test_valid_llm_diagnosis(db, mock_case, mock_transaction):
    """Test standard valid LLM response yields LLM agent_version."""
    result = AgentService.diagnose_failure(db, mock_case, mock_transaction)
    
    # Assert Pydantic model returned
    assert isinstance(result, DiagnosisOutput)
    assert result.failure_category == "TEMPORARY_FAILURE"
    assert result.confidence == 0.91
    
    # Assert DB record
    run = db.added_items[-1]
    assert run.agent_name == "DiagnosisAgent"
    assert run.agent_version == "LLM"
    assert run.status == "SUCCESS"
    assert run.output["failure_category"] == "TEMPORARY_FAILURE"

def test_timeout_fallback(db, mock_case, mock_transaction):
    """Test LLM timeout activates fallback."""
    llm_client.inject_timeout = True
    result = AgentService.diagnose_failure(db, mock_case, mock_transaction)
    
    assert isinstance(result, DiagnosisOutput)
    assert result.confidence == 1.0  # Fallback logic confidence
    
    run = db.added_items[-1]
    assert run.agent_version == "RULE_BASED_FALLBACK"
    assert "FALLBACK_ACTIVATED" in run.status
    assert "LLMTimeoutError" in run.status

def test_unavailable_fallback(db, mock_case, mock_transaction):
    """Test LLM unavailable activates fallback."""
    llm_client.inject_unavailable = True
    result = AgentService.diagnose_failure(db, mock_case, mock_transaction)
    
    assert isinstance(result, DiagnosisOutput)
    
    run = db.added_items[-1]
    assert run.agent_version == "RULE_BASED_FALLBACK"
    assert "LLMUnavailableError" in run.status

def test_malformed_json_fallback(db, mock_case, mock_transaction):
    """Test LLM returning broken JSON activates fallback."""
    llm_client.inject_malformed_json = True
    result = AgentService.diagnose_failure(db, mock_case, mock_transaction)
    
    assert isinstance(result, DiagnosisOutput)
    
    run = db.added_items[-1]
    assert run.agent_version == "RULE_BASED_FALLBACK"
    assert "ValueError" in run.status

def test_invalid_schema_fallback(db, mock_case, mock_transaction):
    """Test LLM returning valid JSON but wrong schema activates fallback."""
    llm_client.inject_invalid_schema = True
    result = AgentService.diagnose_failure(db, mock_case, mock_transaction)
    
    assert isinstance(result, DiagnosisOutput)
    
    run = db.added_items[-1]
    assert run.agent_version == "RULE_BASED_FALLBACK"
    assert "ValidationError" in run.status

def test_planner_valid_execution(db, mock_case):
    """Test Planner agent standard execution."""
    diagnosis = DiagnosisOutput(
        failure_category="TEMPORARY_FAILURE",
        confidence=0.9,
        evidence=["test"]
    )
    result = AgentService.plan_recovery(db, diagnosis, mock_case)
    
    assert isinstance(result, RecoveryPlanOutput)
    assert result.recommended_action == "RETRY_PAYMENT"
    
    run = db.added_items[-1]
    assert run.agent_name == "RecoveryPlannerAgent"
    assert run.agent_version == "LLM"
    assert run.status == "SUCCESS"

def test_planner_fallback_execution(db, mock_case):
    """Test Planner agent fallback execution based on diagnosis."""
    llm_client.inject_unavailable = True
    
    # Test Temporary Failure -> Retry
    diagnosis_temp = DiagnosisOutput(
        failure_category="TEMPORARY_FAILURE", confidence=0.9, evidence=["test"]
    )
    res_temp = AgentService.plan_recovery(db, diagnosis_temp, mock_case)
    assert res_temp.recommended_action == "RETRY_PAYMENT"
    assert res_temp.reason_code == "FALLBACK_RETRY_PAYMENT"
    
    # Test Fraud Risk -> Manual Review
    diagnosis_fraud = DiagnosisOutput(
        failure_category="FRAUD_RISK", confidence=0.9, evidence=["test"]
    )
    res_fraud = AgentService.plan_recovery(db, diagnosis_fraud, mock_case)
    assert res_fraud.recommended_action == "MANUAL_REVIEW"
    assert res_fraud.reason_code == "FALLBACK_MANUAL_REVIEW"
    
    # Test Account Closed -> Manual Review
    diagnosis_closed = DiagnosisOutput(
        failure_category="ACCOUNT_CLOSED", confidence=0.9, evidence=["test"]
    )
    res_closed = AgentService.plan_recovery(db, diagnosis_closed, mock_case)
    assert res_closed.recommended_action == "MANUAL_REVIEW"
    
    # Test Unknown Failure -> Manual Review
    diagnosis_unknown = DiagnosisOutput(
        failure_category="UNKNOWN_FAILURE", confidence=0.9, evidence=["test"]
    )
    res_unknown = AgentService.plan_recovery(db, diagnosis_unknown, mock_case)
    assert res_unknown.recommended_action == "MANUAL_REVIEW"
    
    # Verify DB logging
    run = db.added_items[-1]
    assert run.agent_version == "RULE_BASED_FALLBACK"
