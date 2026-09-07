# RecoverAI v3.2 — API Contract

> **Phase 3** — Full API surface defined. Business logic, ML, LLM, Policy Engine, Orchestrator, and Razorpay adapters are deferred to future phases.

---

## Base URL

```
http://<host>/
```

All domain endpoints are prefixed with `/api`.

---

## Tenant Isolation

Every merchant-owned resource requires the `X-Merchant-ID` header:

```
X-Merchant-ID: 550e8400-e29b-41d4-a716-446655440000
```

- Must be a valid UUID v4.
- Missing or malformed values return `422 Unprocessable Entity`.
- If the resolved resource's `merchant_id` does not match the header, the server returns `403 Forbidden`.
- **Agent routes** (`/api/agents/*`) are the only endpoints that do not require this header — `agent_runs` is a global table.

> **Phase 3 note**: The `X-Merchant-ID` header is a clean abstraction placeholder. Swapping in JWT / OAuth token parsing in a future phase only requires changing `app/core/merchant_context.py::get_merchant_context()` — no route-level changes needed.

---

## Standard Error Envelope

All error responses use this shape regardless of status code:

```json
{
  "error": {
    "code": "not_found",
    "message": "Recovery case abc123 not found.",
    "details": [],
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `code` | `ErrorCode` | Machine-readable code |
| `message` | `string` | Human-readable description |
| `details` | `ErrorDetail[]` | Per-field validation errors (422 only) |
| `request_id` | `string` | Echoed from `X-Request-ID` or generated |

### ErrorCode values

| Code | HTTP Status |
|---|---|
| `not_found` | 404 |
| `forbidden` | 403 |
| `validation_error` | 422 |
| `conflict` | 409 |
| `unprocessable` | 422 |
| `internal_error` | 500 |

---

## Pagination

List endpoints return a paginated envelope:

```json
{
  "items": [...],
  "total": 142,
  "page": 1,
  "page_size": 20,
  "pages": 8
}
```

**Query params** (all list endpoints):

| Param | Default | Max | Description |
|---|---|---|---|
| `page` | `1` | — | 1-based page number |
| `page_size` | `20` | `200` | Items per page |

---

## Endpoints

### Health

#### `GET /health`

Liveness probe. Verifies backend process is running and database is reachable.

**No authentication required.**

**Response 200**:
```json
{
  "status": "ok",
  "database": "connected",
  "service": "RecoverAI",
  "version": "3.2.0"
}
```

---

### Transactions

#### `GET /api/transactions`

List failed transactions for the authenticated merchant (paginated).

**Headers**: `X-Merchant-ID` required.

**Query params**:
| Param | Type | Description |
|---|---|---|
| `status` | `string?` | Filter by gateway status (e.g. `failed`) |

**Response 200**: `PaginatedResponse<TransactionOut>`

**TransactionOut** schema:
| Field | Type |
|---|---|
| `id` | `UUID` |
| `merchant_id` | `UUID` |
| `customer_id` | `UUID?` |
| `external_transaction_id` | `string?` |
| `amount` | `float` |
| `currency` | `string` (ISO 4217) |
| `status` | `string?` |
| `payment_method` | `string?` |
| `failed_at` | `datetime?` |
| `created_at` | `datetime` |
| `updated_at` | `datetime` |

**Errors**: `422` (invalid header)

---

#### `GET /api/transactions/{transaction_id}`

Single transaction detail.

**Headers**: `X-Merchant-ID` required.

**Response 200**: `TransactionOut`

**Errors**: `404` (not found), `403` (wrong merchant), `422` (invalid header)

---

### Recovery Cases

#### `GET /api/recovery`

List recovery cases for the authenticated merchant (paginated).

**Headers**: `X-Merchant-ID` required.

**Query params**:
| Param | Type | Description |
|---|---|---|
| `state` | `CaseState?` | Filter by state |

**CaseState values**: `DETECTED`, `ANALYZING`, `PREDICTED`, `DIAGNOSED`, `PLANNED`, `POLICY_CHECK`, `RECOVERING`, `RECOVERED`, `RECOVERY_WINDOW_EXPIRED`, `CLOSED`

**Response 200**: `PaginatedResponse<RecoveryCaseOut>`

**RecoveryCaseOut** schema:
| Field | Type |
|---|---|
| `id` | `UUID` |
| `merchant_id` | `UUID` |
| `transaction_id` | `UUID` |
| `state` | `CaseState` |
| `correlation_id` | `string` |
| `confidence` | `float?` (0–1) |
| `recovery_window_started_at` | `datetime?` |
| `recovery_window_ends_at` | `datetime?` |
| `recovered_at` | `datetime?` |
| `created_at` | `datetime` |
| `updated_at` | `datetime` |

---

#### `GET /api/recovery/{case_id}`

Single recovery case detail.

**Response 200**: `RecoveryCaseOut`

**Errors**: `404`, `403`, `422`

---

#### `POST /api/recovery/{case_id}/analyze`

Trigger ML analysis for a recovery case.

**Headers**: `X-Merchant-ID` required.

**Request body** (`AnalyzeRequest`):
| Field | Type | Required | Description |
|---|---|---|---|
| `correlation_id` | `string?` | No | Trace ID; defaults to case's own `correlation_id` |

**Response 202** (`AnalyzeResponse`):
```json
{
  "case_id": "uuid",
  "status": "accepted",
  "message": "..."
}
```

**Errors**: `404`, `403`, `422`

---

#### `POST /api/recovery/{case_id}/recommend`

Trigger recommendation engine.

**Headers**: `X-Merchant-ID` required.

**Request body** (`RecommendRequest`):
| Field | Type | Required |
|---|---|---|
| `correlation_id` | `string?` | No |

**Response 202** (`RecommendResponse`):
```json
{
  "case_id": "uuid",
  "status": "accepted",
  "message": "...",
  "recommendations": []
}
```

---

#### `POST /api/recovery/{case_id}/execute`

Execute a recovery action. Supports idempotent retries.

**Headers**: `X-Merchant-ID` required.

**Request body** (`ExecuteRequest`):
| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `idempotency_key` | `string` | **Yes** | 1–800 chars, non-blank | Canonical key: `{merchant_id}:{recovery_case_id}:{action_id}` |
| `execution_mode` | `ExecutionMode` | **Yes** | `LIVE` or `SIMULATION` | Determines adapter used |
| `correlation_id` | `string` | **Yes** | 1–255 chars, non-blank | Trace ID for the execution audit chain |

**Idempotency**: Submitting the same `idempotency_key` twice returns the original response without side effects (future phase will enforce via DB unique constraint).

**Response 202** (`ExecuteResponse`):
```json
{
  "case_id": "uuid",
  "idempotency_key": "merchant-x:case-y:RETRY_PAYMENT",
  "execution_mode": "SIMULATION",
  "status": "accepted",
  "message": "..."
}
```

**Errors**: `404`, `403`, `409` (idempotency conflict), `422`

---

### Policies

#### `GET /api/policies`

List recovery policies for the authenticated merchant.

**Response 200**: `PaginatedResponse<PolicyOut>`

**PolicyOut** schema:
| Field | Type |
|---|---|
| `id` | `UUID` |
| `merchant_id` | `UUID` |
| `name` | `string` |
| `description` | `string?` |
| `is_active` | `bool` |
| `created_at` | `datetime` |
| `updated_at` | `datetime` |

---

#### `POST /api/policies/evaluate`

Evaluate active policies against a recovery case.

**Request body** (`PolicyEvaluateRequest`):
| Field | Type | Required | Description |
|---|---|---|---|
| `recovery_case_id` | `UUID` | **Yes** | Case to evaluate |
| `context` | `dict?` | No | Additional evaluation context |

**Response 200** (`PolicyEvaluateResponse`):
| Field | Type | Description |
|---|---|---|
| `recovery_case_id` | `UUID` | |
| `decision` | `string` | `APPROVED` / `REJECTED` / `MANUAL_REVIEW` |
| `reason_code` | `string?` | |
| `reason` | `string?` | Human-readable explanation |
| `risk_level` | `string?` | `LOW` / `MEDIUM` / `HIGH` |
| `requires_human_review` | `bool` | |

---

### Agents

> **No tenant scope** — agent_runs is a global table.

#### `GET /api/agents`

List all agent runs (paginated).

**Query params**: `status` (filter by run status), `agent_name` (filter by name)

**Response 200**: `PaginatedResponse<AgentRunOut>`

---

#### `GET /api/agents/status`

Per-agent health summary.

**Response 200** (`AgentStatusResponse`):
```json
{
  "agents": [
    {
      "agent_name": "DiagnosisAgent",
      "last_run_status": "SUCCEEDED",
      "last_run_at": "...",
      "total_runs": 42,
      "success_rate": 0.95
    }
  ]
}
```

---

#### `GET /api/agents/activity`

Recent agent run log.

**Query params**: `limit` (1–100, default 20)

**Response 200** (`AgentActivityResponse`)

---

### Manual Reviews

#### `GET /api/reviews`

List manual reviews for the authenticated merchant.

**Query params**: `decision` (filter by decision value or `null` for pending)

**Response 200**: `PaginatedResponse<ManualReviewOut>`

**ManualReviewOut** schema:
| Field | Type |
|---|---|
| `id` | `UUID` |
| `merchant_id` | `UUID` |
| `recovery_case_id` | `UUID` |
| `reason` | `string` |
| `reviewer` | `string?` |
| `decision` | `string?` (`APPROVED`/`REJECTED`/`ESCALATED`) |
| `timestamp` | `datetime` |
| `comment` | `string?` |

---

#### `POST /api/reviews/{review_id}`

Submit a human review decision.

**Request body** (`ManualReviewDecisionRequest`):
| Field | Type | Required | Constraints |
|---|---|---|---|
| `decision` | `ReviewDecision` | **Yes** | `APPROVED` / `REJECTED` / `ESCALATED` |
| `reviewer` | `string` | **Yes** | 1–255 chars |
| `comment` | `string?` | No | Max 4000 chars |

**Response 200** (`ManualReviewDecisionResponse`)

**Errors**: `404`, `403`, `422`

---

### Simulations

#### `POST /api/simulations`

Create a dry-run simulation.

**Request body** (`SimulationCreateRequest`):
| Field | Type | Required | Constraints |
|---|---|---|---|
| `scenario` | `string` | **Yes** | 1–255 chars |
| `execution_mode` | `ExecutionMode` | No | Default: `SIMULATION` |
| `configuration` | `dict?` | No | Scenario-specific params |

**Response 201** (`SimulationCreateResponse`):
```json
{
  "simulation_id": "uuid",
  "scenario": "RETRY_3X",
  "execution_mode": "SIMULATION",
  "status": "PENDING",
  "message": "..."
}
```

---

#### `GET /api/simulations/{simulation_id}`

Get simulation run and results.

**Response 200** (`SimulationRunOut` with embedded `SimulationResultOut[]`)

**Errors**: `404`, `403`, `422`

---

### Analytics & Dashboard

#### `GET /api/dashboard`

Aggregated KPI summary for the authenticated merchant.

**Response 200** (`DashboardResponse`):
```json
{
  "merchant_id": "uuid",
  "recovery": {
    "total_cases": 0,
    "cases_recovered": 0,
    "cases_pending": 0,
    "cases_expired": 0,
    "recovery_rate": 0.0
  },
  "financial": {
    "total_failed_amount": 0.0,
    "total_recovered_amount": 0.0,
    "currency": "INR"
  },
  "agents": {
    "total_runs": 0,
    "successful_runs": 0,
    "failed_runs": 0,
    "avg_latency_ms": null
  }
}
```

---

#### `GET /api/analytics`

Time-series analytics for the authenticated merchant.

**Response 200** (`AnalyticsResponse`):
```json
{
  "merchant_id": "uuid",
  "recovery_rate_series": [],
  "failed_amount_series": [],
  "recovered_amount_series": []
}
```

---

### Audit Log

> Audit events are **append-only and immutable**. No write endpoints exist.

#### `GET /api/audit`

List audit events (newest first).

**Query params**:
| Param | Type | Description |
|---|---|---|
| `event_type` | `string?` | Filter by canonical event type |
| `correlation_id` | `string?` | Filter by correlation_id (all events for one case) |
| `recovery_case_id` | `UUID?` | Filter by linked case |

**Valid event types**: `CaseClosed`, `DiagnosisCreated`, `ManualReviewCreated`, `OpportunityDetected`, `PaymentFailed`, `PolicyEvaluated`, `PredictionCreated`, `RecoveryApproved`, `RecoveryExecuted`, `RecoveryFailed`, `RecoveryPlanned`, `RecoverySucceeded`, `RecoveryWindowExpired`

**Response 200**: `PaginatedResponse<AuditEventOut>`

---

#### `GET /api/audit/{event_id}`

Single audit event detail.

**Response 200**: `AuditEventOut`

**Errors**: `404`, `403`, `422`

---

## Schemas Summary

| Schema | Module | Direction |
|---|---|---|
| `TransactionOut` | `schemas/transaction.py` | Response |
| `RecoveryCaseOut` | `schemas/recovery.py` | Response |
| `RecoveryActionOut` | `schemas/recovery.py` | Response |
| `RecoveryAttemptOut` | `schemas/recovery.py` | Response |
| `AnalyzeRequest` / `AnalyzeResponse` | `schemas/recovery.py` | Request / Response |
| `RecommendRequest` / `RecommendResponse` | `schemas/recovery.py` | Request / Response |
| `ExecuteRequest` / `ExecuteResponse` | `schemas/recovery.py` | Request / Response |
| `PolicyOut` | `schemas/policy.py` | Response |
| `PolicyVersionOut` | `schemas/policy.py` | Response |
| `PolicyEvaluationOut` | `schemas/policy.py` | Response |
| `PolicyEvaluateRequest` / `PolicyEvaluateResponse` | `schemas/policy.py` | Request / Response |
| `AgentRunOut` | `schemas/agent.py` | Response |
| `AgentStatusResponse` | `schemas/agent.py` | Response |
| `AgentActivityResponse` | `schemas/agent.py` | Response |
| `ManualReviewOut` | `schemas/review.py` | Response |
| `ManualReviewDecisionRequest` / `ManualReviewDecisionResponse` | `schemas/review.py` | Request / Response |
| `SimulationRunOut` | `schemas/simulation.py` | Response |
| `SimulationResultOut` | `schemas/simulation.py` | Response |
| `SimulationCreateRequest` / `SimulationCreateResponse` | `schemas/simulation.py` | Request / Response |
| `DashboardResponse` | `schemas/analytics.py` | Response |
| `AnalyticsResponse` | `schemas/analytics.py` | Response |
| `AuditEventOut` | `schemas/audit.py` | Response |
| `PaginatedResponse[T]` | `schemas/common.py` | Response wrapper |
| `PaginationParams` | `schemas/common.py` | Query params |
| `APIError` / `APIErrorEnvelope` | `core/errors.py` | Error response |

---

## Files Created (Phase 3)

```
app/
  core/
    errors.py              ← Error model, exceptions, handlers
    merchant_context.py    ← Tenant isolation abstraction
  schemas/
    common.py              ← PaginationParams, PaginatedResponse[T]
    transaction.py         ← TransactionOut
    recovery.py            ← RecoveryCaseOut, ExecuteRequest/Response, …
    policy.py              ← PolicyOut, PolicyEvaluateRequest/Response
    agent.py               ← AgentRunOut, AgentStatusResponse, …
    review.py              ← ManualReviewOut, ManualReviewDecisionRequest/Response
    simulation.py          ← SimulationRunOut, SimulationCreateRequest/Response
    analytics.py           ← DashboardResponse, AnalyticsResponse
    audit.py               ← AuditEventOut
  api/
    transactions.py        ← GET /api/transactions[/{id}]
    recovery.py            ← GET/POST /api/recovery[/{id}[/analyze|recommend|execute]]
    policies.py            ← GET /api/policies, POST /api/policies/evaluate
    agents.py              ← GET /api/agents[/status|activity]
    reviews.py             ← GET /api/reviews, POST /api/reviews/{id}
    simulations.py         ← POST /api/simulations, GET /api/simulations/{id}
    analytics.py           ← GET /api/dashboard, GET /api/analytics
    audit.py               ← GET /api/audit[/{id}]
  main.py                  ← Updated: all routers + exception handlers registered
tests/
  test_api_contract.py     ← 88 tests covering schemas, errors, routes, isolation
docs/
  api-contract.md          ← This document
```
