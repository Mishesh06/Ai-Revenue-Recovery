"""
RecoverAI v3.2 — Phase 7: AI Agent & LLM Client Tests

Verifies:
1. BaseLLMClient interface & MockLLMClient execution.
2. Pydantic structured output validation.
3. Strict deterministic rule-based fallback behavior under timeouts and errors.
4. Zero-PII prompt builder sanitization.
5. Provider factory resolution (Mock, OpenAI, Gemini).
"""

import json
import uuid
from unittest.mock import MagicMock, patch
import pytest

from app.models.agent_run import AgentRun
from app.models.enums import CaseState
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.agents import DiagnosisOutput, RecoveryPlanOutput
from app.services.agent_service import AgentService
from app.services.llm.base import LLMTimeoutError, LLMUnavailableError, LLMValidationError
from app.services.llm.factory import get_llm_client, set_llm_client_override
from app.services.llm.gemini_client import GeminiLLMClient
from app.services.llm.mock import MockLLMClient
from app.services.llm.openai_client import OpenAILLMClient
from app.services.llm.prompt_builder import build_diagnosis_prompt, build_planner_prompt
from app.services.llm_client import llm_client


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
        correlation_id=f"corr-{uuid.uuid4().hex[:8]}",
    )


@pytest.fixture
def mock_transaction():
    return Transaction(
        id=uuid.uuid4(),
        merchant_id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        amount="100.00",
        currency="USD",
        status="insufficient_funds",
    )


@pytest.fixture(autouse=True)
def reset_llm_client():
    """Reset LLM client behavior before each test."""
    set_llm_client_override(None)
    llm_client.inject_timeout = False
    llm_client.inject_unavailable = False
    llm_client.inject_malformed_json = False
    llm_client.inject_invalid_schema = False
    yield
    set_llm_client_override(None)


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
    assert "LLMValidationError" in run.status or "ValueError" in run.status


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
        failure_category="TEMPORARY_FAILURE", confidence=0.9, evidence=["test"]
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


# ── NEW EXTENSIVE LLM TESTS ───────────────────────────────────────────


def test_pii_scrubber_diagnosis_prompt(mock_case, mock_transaction):
    """Verifies that prompt builder strictly excludes customer PII."""
    prompt = build_diagnosis_prompt(mock_case, mock_transaction)

    # Assert prohibited PII strings are not present
    assert "card_number" not in prompt
    assert "pan" not in prompt
    assert "cvv" not in prompt
    assert "email" not in prompt
    assert "phone" not in prompt
    assert "customer_name" not in prompt

    # Assert required operational metadata is present
    assert "insufficient_funds" in prompt
    assert "USD" in prompt
    assert "STANDARD_TIER" in prompt or "100.00" in prompt or "USD" in prompt


def test_pii_scrubber_planner_prompt(mock_case):
    """Verifies planner prompt contains sanitized evidence."""
    diagnosis = DiagnosisOutput(
        failure_category="INSUFFICIENT_FUNDS",
        confidence=0.85,
        evidence=["Customer card balance below charge threshold"],
    )
    prompt = build_planner_prompt(diagnosis, mock_case)

    assert "INSUFFICIENT_FUNDS" in prompt
    assert "Customer card balance below charge threshold" in prompt
    assert "cvv" not in prompt
    assert "password" not in prompt


def test_openai_client_missing_key():
    """Verifies OpenAILLMClient raises LLMUnavailableError when API key is missing."""
    client = OpenAILLMClient(api_key="")
    with pytest.raises(LLMUnavailableError):
        client.generate_json("test prompt", "diagnosis")


def test_gemini_client_missing_key():
    """Verifies GeminiLLMClient raises LLMUnavailableError when API key is missing."""
    client = GeminiLLMClient(api_key="")
    with pytest.raises(LLMUnavailableError):
        client.generate_json("test prompt", "diagnosis")


def test_factory_provider_override():
    """Verifies factory respects client overrides."""
    custom_mock = MockLLMClient(model_name="custom-test-model")
    set_llm_client_override(custom_mock)

    client = get_llm_client()
    assert client.model_name == "custom-test-model"
    assert client.provider_name == "mock"
