"""
RecoverAI v3.2 — Phase 3: API Contract Tests

Tests:
  1. Schema instantiation (no DB needed)
  2. Error model correctness
  3. Merchant context dependency (UUID validation)
  4. Route existence — every required endpoint returns expected HTTP status
  5. Tenant isolation — missing/invalid X-Merchant-ID returns 422
  6. ExecuteRequest validation — idempotency_key, execution_mode, correlation_id
  7. SimulationCreateRequest validation — execution_mode must be SIMULATION
  8. ManualReviewDecisionRequest validation — decision must be valid literal
  9. PaginatedResponse helper
  10. 404 responses use the standard error envelope

All tests run without a real database (TestClient + starlette test transport).
"""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.errors import (
    APIError,
    APIErrorEnvelope,
    ConflictError,
    ErrorCode,
    ForbiddenError,
    NotFoundError,
    UnprocessableError,
)
from app.core.merchant_context import MerchantContext, get_merchant_context, verify_merchant_ownership
from app.models.enums import CaseState, ExecutionMode
from app.schemas.analytics import AnalyticsResponse, DashboardResponse
from app.schemas.audit import AuditEventOut
from app.schemas.common import PaginatedResponse, PaginationParams
from app.schemas.policy import PolicyEvaluateRequest, PolicyEvaluateResponse, PolicyOut
from app.schemas.recovery import (
    AnalyzeRequest,
    AnalyzeResponse,
    ExecuteRequest,
    ExecuteResponse,
    RecommendRequest,
    RecommendResponse,
    RecoveryCaseOut,
)
from app.schemas.review import ManualReviewDecisionRequest
from app.schemas.simulation import SimulationCreateRequest, SimulationCreateResponse
from app.schemas.transaction import TransactionOut

# ── Shared fixtures ───────────────────────────────────────────────────────────

MERCHANT_A = str(uuid.uuid4())
MERCHANT_B = str(uuid.uuid4())
CASE_ID = str(uuid.uuid4())

from unittest.mock import AsyncMock
from app.database.session import get_db

async def override_get_db():
    db_mock = AsyncMock()
    # Provide simple mock execute to avoid 500s in contract tests
    async def mock_execute(stmt):
        class ResultMock:
            def all(self): return []
            def scalar_one_or_none(self): return None
            def scalar(self): return 0
            def scalars(self):
                class S:
                    def all(self): return []
                return S()
        return ResultMock()
    async def mock_scalar(stmt): return 0
    async def mock_run_sync(fn, *args, **kwargs):
        return fn(None, *args, **kwargs)
    db_mock.execute.side_effect = mock_execute
    db_mock.scalar.side_effect = mock_scalar
    db_mock.run_sync.side_effect = mock_run_sync
    yield db_mock

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app, raise_server_exceptions=False)

import app.services.simulator
from unittest.mock import patch

@pytest.fixture(autouse=True)
def mock_simulator():
    mock_simulator_result = {
        "simulation_id": str(uuid.uuid4()),
        "scenario": "MOCK",
        "metrics": {"transactions_analyzed": 0, "successful_recoveries": 0, "policy_blocks": 0, "unknown_outcomes": 0},
        "generated_cases": [str(uuid.uuid4())]
    }
    with patch("app.services.simulator.SimulatorService.run_scenario", return_value=mock_simulator_result) as m:
        yield m


def auth_headers(merchant_id: str) -> dict[str, str]:
    """Return the X-Merchant-ID header for a merchant."""
    return {"X-Merchant-ID": merchant_id}


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Schema Instantiation
# ═══════════════════════════════════════════════════════════════════════════════

class TestSchemaInstantiation:
    """All DTOs should instantiate without error given valid data."""

    def test_transaction_out(self):
        t = TransactionOut(
            id=uuid.uuid4(),
            merchant_id=uuid.uuid4(),
            amount=1000.00,
            currency="INR",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert t.currency == "INR"

    def test_recovery_case_out(self):
        rc = RecoveryCaseOut(
            id=uuid.uuid4(),
            merchant_id=uuid.uuid4(),
            transaction_id=uuid.uuid4(),
            state=CaseState.DETECTED,
            correlation_id="corr-001",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert rc.state == CaseState.DETECTED

    def test_execute_request_valid(self):
        req = ExecuteRequest(
            idempotency_key="merchant-x:case-y:RETRY_PAYMENT",
            execution_mode=ExecutionMode.SIMULATION,
            correlation_id="corr-001",
        )
        assert req.execution_mode == ExecutionMode.SIMULATION

    def test_execute_request_live_mode(self):
        req = ExecuteRequest(
            idempotency_key="m:c:ACTION",
            execution_mode=ExecutionMode.LIVE,
            correlation_id="trace-abc",
        )
        assert req.execution_mode == ExecutionMode.LIVE

    def test_simulation_create_request(self):
        req = SimulationCreateRequest(
            scenario="RETRY_PAYMENT_3X",
            execution_mode=ExecutionMode.SIMULATION,
        )
        assert req.scenario == "RETRY_PAYMENT_3X"

    def test_policy_evaluate_request(self):
        req = PolicyEvaluateRequest(
            recovery_case_id=uuid.uuid4(),
            context={"risk_score": 0.7},
        )
        assert req.context["risk_score"] == 0.7

    def test_dashboard_response(self):
        resp = DashboardResponse(merchant_id=MERCHANT_A)
        assert resp.recovery.total_cases == 0

    def test_analytics_response(self):
        resp = AnalyticsResponse(merchant_id=MERCHANT_A)
        assert resp.recovery_rate_series == []

    def test_paginated_response_build(self):
        params = PaginationParams(page=2, page_size=10)
        result = PaginatedResponse[dict].build(
            items=[{"x": 1}], total=25, pagination=params
        )
        assert result.pages == 3
        assert result.page == 2

    def test_manual_review_decision_request_valid(self):
        req = ManualReviewDecisionRequest(
            decision="APPROVED",
            reviewer="ops@recoverai.io",
        )
        assert req.decision == "APPROVED"


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Error Model
# ═══════════════════════════════════════════════════════════════════════════════

class TestErrorModel:
    def test_api_error_serialises(self):
        err = APIError(
            code=ErrorCode.NOT_FOUND,
            message="Resource not found.",
            request_id="req-123",
        )
        data = err.model_dump(mode="json")
        assert data["code"] == "not_found"
        assert data["request_id"] == "req-123"

    def test_api_error_envelope(self):
        envelope = APIErrorEnvelope(
            error=APIError(code=ErrorCode.FORBIDDEN, message="Access denied.")
        )
        data = envelope.model_dump(mode="json")
        assert data["error"]["code"] == "forbidden"

    def test_not_found_error_has_correct_status(self):
        exc = NotFoundError("Not found.")
        assert exc.status_code == 404
        assert exc.error_code == ErrorCode.NOT_FOUND

    def test_forbidden_error(self):
        exc = ForbiddenError("Forbidden.")
        assert exc.status_code == 403

    def test_conflict_error(self):
        exc = ConflictError("Conflict.")
        assert exc.status_code == 409
        assert exc.error_code == ErrorCode.CONFLICT

    def test_unprocessable_error(self):
        exc = UnprocessableError("Bad input.")
        assert exc.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Merchant Context
# ═══════════════════════════════════════════════════════════════════════════════

class TestMerchantContext:
    def test_valid_uuid_header(self):
        merchant_uuid = uuid.uuid4()
        ctx = get_merchant_context(x_merchant_id=str(merchant_uuid))
        assert ctx.merchant_id == merchant_uuid

    def test_invalid_uuid_raises(self):
        with pytest.raises(UnprocessableError):
            get_merchant_context(x_merchant_id="not-a-uuid")

    def test_empty_uuid_raises(self):
        with pytest.raises(UnprocessableError):
            get_merchant_context(x_merchant_id="")

    def test_verify_ownership_passes_when_same(self):
        mid = uuid.uuid4()
        ctx = MerchantContext(merchant_id=mid)
        # Should not raise
        verify_merchant_ownership(mid, ctx)

    def test_verify_ownership_raises_when_different(self):
        ctx = MerchantContext(merchant_id=uuid.uuid4())
        other_merchant = uuid.uuid4()
        with pytest.raises(ForbiddenError):
            verify_merchant_ownership(other_merchant, ctx)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Route Existence — tenant-scoped endpoints
# ═══════════════════════════════════════════════════════════════════════════════

class TestRouteExistence:
    """Every required endpoint should be reachable and return expected base status."""

    def test_health_get(self):
        # Health doesn't need a DB for import test; just ensure route exists
        resp = client.get("/health")
        # May return 200 or 500 depending on DB availability — just check route exists
        assert resp.status_code in (200, 500, 503)

    def test_dashboard_get(self):
        resp = client.get("/api/dashboard", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 200

    def test_transactions_list(self):
        resp = client.get("/api/transactions", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 200

    def test_transactions_detail_returns_404(self):
        resp = client.get(f"/api/transactions/{uuid.uuid4()}", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 404

    def test_recovery_list(self):
        resp = client.get("/api/recovery", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 200

    def test_recovery_detail_returns_404(self):
        resp = client.get(f"/api/recovery/{uuid.uuid4()}", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 404

    def test_recovery_analyze_accepts(self):
        resp = client.post(
            f"/api/recovery/{uuid.uuid4()}/analyze",
            headers=auth_headers(MERCHANT_A),
            json={"correlation_id": "corr-001"},
        )
        assert resp.status_code == 202

    def test_recovery_recommend_accepts(self):
        resp = client.post(
            f"/api/recovery/{uuid.uuid4()}/recommend",
            headers=auth_headers(MERCHANT_A),
            json={},
        )
        assert resp.status_code == 202

    def test_recovery_execute_accepts(self):
        resp = client.post(
            f"/api/recovery/{uuid.uuid4()}/execute",
            headers=auth_headers(MERCHANT_A),
            json={
                "idempotency_key": f"{MERCHANT_A}:{CASE_ID}:RETRY_PAYMENT",
                "execution_mode": "SIMULATION",
                "correlation_id": "corr-exe-001",
            },
        )
        assert resp.status_code == 202

    def test_policies_list(self):
        resp = client.get("/api/policies", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 200

    def test_policies_evaluate(self):
        resp = client.post(
            "/api/policies/evaluate",
            headers=auth_headers(MERCHANT_A),
            json={"recovery_case_id": str(uuid.uuid4()), "context": {}},
        )
        assert resp.status_code == 200

    def test_agents_list(self):
        resp = client.get("/api/agents")
        assert resp.status_code == 200

    def test_agents_status(self):
        resp = client.get("/api/agents/status")
        assert resp.status_code == 200

    def test_agents_activity(self):
        resp = client.get("/api/agents/activity")
        assert resp.status_code == 200

    def test_reviews_list(self):
        resp = client.get("/api/reviews", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 200

    def test_reviews_submit_returns_404(self):
        resp = client.post(
            f"/api/reviews/{uuid.uuid4()}",
            headers=auth_headers(MERCHANT_A),
            json={"decision": "APPROVED", "reviewer": "ops@recoverai.io"},
        )
        assert resp.status_code == 404

    def test_simulations_create(self):
        resp = client.post(
            "/api/simulations",
            headers=auth_headers(MERCHANT_A),
            json={"scenario": "RETRY_3X", "execution_mode": "SIMULATION"},
        )
        assert resp.status_code == 201

    def test_simulations_get_returns_404(self):
        resp = client.get(
            f"/api/simulations/{uuid.uuid4()}",
            headers=auth_headers(MERCHANT_A),
        )
        assert resp.status_code == 404

    def test_analytics_get(self):
        resp = client.get("/api/analytics", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 200

    def test_audit_list(self):
        resp = client.get("/api/audit", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 200

    def test_audit_detail_returns_404(self):
        resp = client.get(f"/api/audit/{uuid.uuid4()}", headers=auth_headers(MERCHANT_A))
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Tenant Isolation — missing or invalid X-Merchant-ID
# ═══════════════════════════════════════════════════════════════════════════════

class TestTenantIsolation:
    """Tenant-scoped endpoints must reject requests without a valid merchant header."""

    TENANT_SCOPED_GETS = [
        "/api/dashboard",
        "/api/transactions",
        "/api/recovery",
        "/api/policies",
        "/api/reviews",
        "/api/analytics",
        "/api/audit",
    ]

    @pytest.mark.parametrize("path", TENANT_SCOPED_GETS)
    def test_missing_header_returns_422(self, path):
        """No X-Merchant-ID header → 422 Unprocessable Entity."""
        resp = client.get(path)
        assert resp.status_code == 422

    @pytest.mark.parametrize("path", TENANT_SCOPED_GETS)
    def test_invalid_uuid_header_returns_422(self, path):
        """Non-UUID X-Merchant-ID → 422."""
        resp = client.get(path, headers={"X-Merchant-ID": "not-a-uuid"})
        assert resp.status_code == 422

    def test_error_envelope_has_correct_shape(self):
        """Error responses must use the standard APIErrorEnvelope shape."""
        resp = client.get("/api/transactions")
        data = resp.json()
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]

    def test_404_error_envelope_shape(self):
        """404 responses must also use the standard error envelope."""
        resp = client.get(
            f"/api/transactions/{uuid.uuid4()}",
            headers=auth_headers(MERCHANT_A),
        )
        assert resp.status_code == 404
        data = resp.json()
        assert data["error"]["code"] == "not_found"

    def test_agents_routes_have_no_tenant_requirement(self):
        """Agent routes are global — no header required."""
        resp = client.get("/api/agents")
        assert resp.status_code == 200

    def test_simulations_create_missing_header(self):
        resp = client.post(
            "/api/simulations",
            json={"scenario": "TEST", "execution_mode": "SIMULATION"},
        )
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ExecuteRequest Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestExecuteRequestValidation:
    def _execute(self, payload: dict[str, Any]) -> Any:
        return client.post(
            f"/api/recovery/{uuid.uuid4()}/execute",
            headers=auth_headers(MERCHANT_A),
            json=payload,
        )

    def test_valid_simulation_execute(self):
        resp = self._execute({
            "idempotency_key": "m:c:ACTION",
            "execution_mode": "SIMULATION",
            "correlation_id": "corr-001",
        })
        assert resp.status_code == 202
        data = resp.json()
        assert data["execution_mode"] == "SIMULATION"
        assert data["idempotency_key"] == "m:c:ACTION"
        assert data["status"] == "accepted"

    def test_valid_live_execute(self):
        resp = self._execute({
            "idempotency_key": "m:c:ACTION_LIVE",
            "execution_mode": "LIVE",
            "correlation_id": "corr-live-001",
        })
        assert resp.status_code == 202
        assert resp.json()["execution_mode"] == "LIVE"

    def test_missing_idempotency_key_returns_422(self):
        resp = self._execute({
            "execution_mode": "SIMULATION",
            "correlation_id": "corr-001",
        })
        assert resp.status_code == 422

    def test_missing_execution_mode_returns_422(self):
        resp = self._execute({
            "idempotency_key": "m:c:ACTION",
            "correlation_id": "corr-001",
        })
        assert resp.status_code == 422

    def test_invalid_execution_mode_returns_422(self):
        resp = self._execute({
            "idempotency_key": "m:c:ACTION",
            "execution_mode": "INVALID_MODE",
            "correlation_id": "corr-001",
        })
        assert resp.status_code == 422

    def test_missing_correlation_id_returns_422(self):
        resp = self._execute({
            "idempotency_key": "m:c:ACTION",
            "execution_mode": "SIMULATION",
        })
        assert resp.status_code == 422

    def test_blank_idempotency_key_returns_422(self):
        resp = self._execute({
            "idempotency_key": "   ",
            "execution_mode": "SIMULATION",
            "correlation_id": "corr-001",
        })
        assert resp.status_code == 422

    def test_blank_correlation_id_returns_422(self):
        resp = self._execute({
            "idempotency_key": "m:c:ACTION",
            "execution_mode": "SIMULATION",
            "correlation_id": "   ",
        })
        assert resp.status_code == 422

    def test_idempotency_key_too_long_returns_422(self):
        resp = self._execute({
            "idempotency_key": "x" * 801,
            "execution_mode": "SIMULATION",
            "correlation_id": "corr-001",
        })
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 7. SimulationCreateRequest Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestSimulationValidation:
    def _create(self, payload: dict[str, Any]) -> Any:
        return client.post(
            "/api/simulations",
            headers=auth_headers(MERCHANT_A),
            json=payload,
        )

    def test_valid_simulation(self):
        resp = self._create({"scenario": "RETRY_3X", "execution_mode": "SIMULATION"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "COMPLETED"
        assert "simulation_id" in data

    def test_missing_scenario_returns_422(self):
        resp = self._create({"execution_mode": "SIMULATION"})
        assert resp.status_code == 422

    def test_invalid_execution_mode_returns_422(self):
        resp = self._create({"scenario": "TEST", "execution_mode": "BOGUS"})
        assert resp.status_code == 422

    def test_blank_scenario_returns_422(self):
        resp = self._create({"scenario": "", "execution_mode": "SIMULATION"})
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 8. ManualReviewDecisionRequest Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestReviewDecisionValidation:
    def _submit(self, payload: dict[str, Any]) -> Any:
        return client.post(
            f"/api/reviews/{uuid.uuid4()}",
            headers=auth_headers(MERCHANT_A),
            json=payload,
        )

    def test_valid_approved_decision(self):
        # Should fail with 404 (stub), not 422 — meaning validation passed
        resp = self._submit({"decision": "APPROVED", "reviewer": "ops@test.io"})
        assert resp.status_code == 404

    def test_valid_rejected_decision(self):
        resp = self._submit({"decision": "REJECTED", "reviewer": "ops@test.io"})
        assert resp.status_code == 404

    def test_invalid_decision_returns_422(self):
        resp = self._submit({"decision": "MAYBE", "reviewer": "ops@test.io"})
        assert resp.status_code == 422

    def test_missing_reviewer_returns_422(self):
        resp = self._submit({"decision": "APPROVED"})
        assert resp.status_code == 422

    def test_missing_decision_returns_422(self):
        resp = self._submit({"reviewer": "ops@test.io"})
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 9. Response Shape Verification
# ═══════════════════════════════════════════════════════════════════════════════

class TestResponseShapes:
    """Verify that stub responses conform to the declared schema shapes."""

    def test_transactions_list_shape(self):
        resp = client.get("/api/transactions", headers=auth_headers(MERCHANT_A))
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "pages" in data
        assert data["total"] == 0

    def test_recovery_list_shape(self):
        resp = client.get("/api/recovery", headers=auth_headers(MERCHANT_A))
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_execute_response_shape(self):
        resp = client.post(
            f"/api/recovery/{uuid.uuid4()}/execute",
            headers=auth_headers(MERCHANT_A),
            json={
                "idempotency_key": "m:c:A",
                "execution_mode": "LIVE",
                "correlation_id": "c-1",
            },
        )
        data = resp.json()
        assert "case_id" in data
        assert "idempotency_key" in data
        assert "execution_mode" in data
        assert "status" in data

    def test_dashboard_shape(self):
        resp = client.get("/api/dashboard", headers=auth_headers(MERCHANT_A))
        data = resp.json()
        assert "merchant_id" in data
        assert "recovery" in data
        assert "financial" in data
        assert "agents" in data

    def test_analytics_shape(self):
        resp = client.get("/api/analytics", headers=auth_headers(MERCHANT_A))
        data = resp.json()
        assert "merchant_id" in data
        assert "recovery_rate_series" in data
        assert "failed_amount_series" in data

    def test_policy_evaluate_shape(self):
        resp = client.post(
            "/api/policies/evaluate",
            headers=auth_headers(MERCHANT_A),
            json={"recovery_case_id": str(uuid.uuid4())},
        )
        data = resp.json()
        assert "decision" in data
        assert "requires_human_review" in data
        assert "recovery_case_id" in data

    def test_agents_status_shape(self):
        resp = client.get("/api/agents/status")
        data = resp.json()
        assert "agents" in data
        assert isinstance(data["agents"], list)

    def test_simulation_create_shape(self):
        resp = client.post(
            "/api/simulations",
            headers=auth_headers(MERCHANT_A),
            json={"scenario": "S1", "execution_mode": "SIMULATION"},
        )
        data = resp.json()
        assert "simulation_id" in data
        assert "status" in data
        assert data["execution_mode"] == "SIMULATION"

    def test_analyze_response_shape(self):
        resp = client.post(
            f"/api/recovery/{uuid.uuid4()}/analyze",
            headers=auth_headers(MERCHANT_A),
            json={},
        )
        data = resp.json()
        assert "case_id" in data
        assert "status" in data
        assert data["status"] == "accepted"

    def test_recommend_response_shape(self):
        resp = client.post(
            f"/api/recovery/{uuid.uuid4()}/recommend",
            headers=auth_headers(MERCHANT_A),
            json={},
        )
        data = resp.json()
        assert "case_id" in data
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
