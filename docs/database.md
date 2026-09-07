# RecoverAI v3.2 — Database Architecture

> **Phase 1 + Phase 2 Verified Reference Document**
> Describes all tables, relationships, state enums, idempotency rules,
> tenant isolation, and the decision trace chain.

---

## Phase 2 Verification Status

| Check | Status | Tests |
|-------|--------|-------|
| All 21 tables registered in `Base.metadata` | ✅ Verified | `test_model_imports` |
| Decision trace chain — all 6 FK links | ✅ Verified | `test_decision_trace` |
| Tenant isolation — 9 direct + 6 FK-chain scoped | ✅ Verified | `test_tenant_isolation` |
| Global tables have no `merchant_id` | ✅ Verified | `test_tenant_isolation` |
| `merchant_id` FK uses `RESTRICT` everywhere | ✅ Verified | `test_tenant_isolation` |
| `CaseState` / `ActionState` / `AttemptState` independent | ✅ Verified | `test_state_machines` |
| No shared state columns, no merged enums | ✅ Verified | `test_state_machines` |
| Idempotency key structure & uniqueness | ✅ Verified | `test_idempotency` |
| Retry creates Attempt, not new Action | ✅ Verified | `test_retry_pattern` |
| `attempt_number` unique per action | ✅ Verified | `test_retry_pattern` |
| Recovery window fields (3 nullable, TIMESTAMPTZ) | ✅ Verified | `test_recovery_window` |
| Audit events — append-only, no `updated_at` | ✅ Verified | `test_audit_events`, `test_recovery_window` |
| Cascade — 4 parent→child relationships | ✅ **Added in Phase 2** | `test_relationships` |
| All FK relationships bidirectional via `back_populates` | ✅ Verified | `test_relationships` |
| **Total pure-Python tests** | **232 passed** | — |

### Phase 2 Hardening Changes

The following cascade settings were added to 4 ORM relationships:

| Model | Relationship | Cascade Added |
|-------|-------------|---------------|
| `RecoveryAction` | `recovery_attempts` | `all, delete-orphan` |
| `Policy` | `versions` | `all, delete-orphan` |
| `SimulationRun` | `results` | `all, delete-orphan` |
| `ModelVersion` | `evaluations` | `all, delete-orphan` |

See [entity-relationships.md](entity-relationships.md) for the complete FK map and constraint inventory.

---

---

## Table of Contents

1. [Overview](#overview)
2. [Tables](#tables)
3. [State Enums](#state-enums)
4. [Decision Trace Chain](#decision-trace-chain)
5. [Idempotency Rule](#idempotency-rule)
6. [Tenant Isolation](#tenant-isolation)
7. [Append-Only Tables](#append-only-tables)
8. [Indexes](#indexes)
9. [Relationships Summary](#relationships-summary)

---

## Overview

RecoverAI uses a single **PostgreSQL** database accessed via **SQLAlchemy 2.x async** ORM.

- **21 tables** registered in `Base.metadata` (authoritative count — not hardcoded)
- **UUID primary keys** throughout
- **Timezone-aware timestamps** (all `TIMESTAMPTZ`)
- **JSONB** for structured data fields (gateway responses, ML output, policy rules)
- **Alembic** for versioned schema migrations

---

## Tables

### Core

| Table | Tenant-Scoped | Description |
|-------|--------------|-------------|
| `users` | ❌ Global | Internal system users / reviewers |
| `merchants` | — Root tenant | Root tenant entity |
| `customers` | ✅ `merchant_id` | Merchant's customers |
| `transactions` | ✅ `merchant_id` | Payment transactions (root of trace chain) |
| `recovery_cases` | ✅ `merchant_id` | Central recovery workflow entity |
| `recovery_opportunities` | ✅ `merchant_id` | Detected recovery windows |
| `ai_decisions` | ❌ Global | AI recommendation records |
| `recovery_actions` | ✅ `merchant_id` | Approved recovery actions (idempotency owner) |
| `recovery_attempts` | — Via FK chain | Execution attempts for an action |
| `audit_events` | ✅ `merchant_id` | Append-only event log |
| `system_events` | ❌ Global | Infrastructure-level events |

### Policy

| Table | Tenant-Scoped | Description |
|-------|--------------|-------------|
| `policies` | ✅ `merchant_id` | Policy definitions |
| `policy_versions` | — Via `policy_id` | Versioned, immutable rule snapshots |
| `policy_evaluations` | — Via `recovery_case_id` | Deterministic policy evaluation records |

### ML

| Table | Tenant-Scoped | Description |
|-------|--------------|-------------|
| `model_versions` | ❌ Global | ML model registry |
| `model_predictions` | — Via `transaction_id` | Inference output per transaction |
| `model_evaluations` | ❌ Global | Model performance metrics |

### AI

| Table | Tenant-Scoped | Description |
|-------|--------------|-------------|
| `agent_runs` | ❌ Global | LLM + rule-based agent execution log |

### Human Review

| Table | Tenant-Scoped | Description |
|-------|--------------|-------------|
| `manual_reviews` | ✅ `merchant_id` | Human-in-the-loop review records |

### Simulation

| Table | Tenant-Scoped | Description |
|-------|--------------|-------------|
| `simulation_runs` | ✅ `merchant_id` | Simulation execution runs |
| `simulation_results` | — Via `simulation_run_id` | Calculated metric results (never hardcoded) |

---

## State Enums

All enums are **independent** — CaseState, ActionState, and AttemptState are separate
Python `enum.Enum` subclasses and separate PostgreSQL `ENUM` types.

### CaseState

The lifecycle of a `RecoveryCase`:

```
DETECTED → ANALYZING → PREDICTED → DIAGNOSED → PLANNED → POLICY_CHECK
                                                         → RECOVERING → RECOVERED
                                                                      → RECOVERY_WINDOW_EXPIRED
                                                                      → CLOSED
```

| Value | Meaning |
|-------|---------|
| `DETECTED` | Payment failure detected |
| `ANALYZING` | Collecting data for prediction |
| `PREDICTED` | ML model has produced a prediction |
| `DIAGNOSED` | Root cause identified |
| `PLANNED` | Recovery plan created |
| `POLICY_CHECK` | Awaiting policy engine decision |
| `RECOVERING` | Recovery action executing |
| `RECOVERED` | Payment successfully recovered |
| `RECOVERY_WINDOW_EXPIRED` | Recovery window closed without success |
| `CLOSED` | Case closed (terminal) |

### ActionState

The lifecycle of a `RecoveryAction`:

| Value | Meaning |
|-------|---------|
| `PROPOSED` | Action recommended by AI |
| `APPROVED` | Policy approved the action |
| `REJECTED` | Policy or human rejected the action |
| `EXECUTING` | Action is being executed |
| `SUCCEEDED` | Execution succeeded |
| `FAILED` | Execution failed |
| `OUTCOME_UNKNOWN` | Adapter returned ambiguous result |
| `CANCELLED` | Action was cancelled |

### AttemptState

The lifecycle of a `RecoveryAttempt`:

| Value | Meaning |
|-------|---------|
| `STARTED` | Attempt has begun |
| `SUCCEEDED` | Attempt completed successfully |
| `FAILED` | Attempt failed with a known error |
| `TIMEOUT` | Attempt timed out |
| `UNKNOWN` | Outcome could not be determined |

### ExecutionMode

| Value | Meaning |
|-------|---------|
| `LIVE` | Use Razorpay Live Adapter |
| `SIMULATION` | Use Simulation Adapter (dry-run) |

---

## Decision Trace Chain

Every step in the recovery workflow is linked by explicit foreign keys:

```
transactions
    │  id
    ▼
model_predictions
    │  transaction_id → transactions.id
    │  recovery_case_id → recovery_cases.id
    ▼
ai_decisions
    │  prediction_id → model_predictions.id
    │  recovery_case_id → recovery_cases.id
    │  agent_run_id → agent_runs.id
    ▼
policy_evaluations
    │  policy_id → policies.id
    │  recovery_case_id → recovery_cases.id
    ▼
recovery_actions
    │  recovery_case_id → recovery_cases.id
    │  policy_evaluation_id → policy_evaluations.id
    ▼
recovery_attempts
       recovery_action_id → recovery_actions.id
```

**Important identifiers in the trace:**

| Identifier | Column | Location |
|-----------|--------|----------|
| `prediction_id` | `model_predictions.id` | Referenced by `ai_decisions.prediction_id` |
| `decision_id` | `ai_decisions.id` | Referenced via agent_run and case |
| `policy_evaluation_id` | `policy_evaluations.id` | Referenced by `recovery_actions.policy_evaluation_id` |
| `action_id` | `recovery_actions.action_id` (string) | Action type identifier (e.g. `RETRY_PAYMENT`) |
| `idempotency_key` | `recovery_actions.idempotency_key` | Unique key per logical action |

---

## Idempotency Rule

### Canonical Definition

```
idempotency_key = f"{merchant_id}:{recovery_case_id}:{action_id}"
```

**Example:**
```
550e8400-e29b-41d4-a716-446655440000:7c9e6679-7425-40de-944b-e07fc1f90ae7:RETRY_PAYMENT
```

### Rules

| Rule | Detail |
|------|--------|
| **One key per logical action** | Same merchant + case + action_type = same key |
| **Shared across all attempts** | Retry creates a new `RecoveryAttempt`, NOT a new key |
| **DB-level enforcement** | `UNIQUE(idempotency_key)` on `recovery_actions` |
| **Deterministic** | Same inputs always produce the same key |
| **Not on attempt table** | `recovery_attempts` has NO `idempotency_key` column |

### Where it lives

- ✅ `recovery_actions.idempotency_key` — owner of the constraint
- ❌ `recovery_attempts` — never has a separate idempotency_key

---

## Tenant Isolation

### Merchant-scoped tables

These tables carry `merchant_id UUID NOT NULL REFERENCES merchants(id)`:

- `customers`
- `transactions`
- `recovery_cases`
- `recovery_opportunities`
- `policies`
- `recovery_actions`
- `audit_events`
- `manual_reviews`
- `simulation_runs`

### Global tables (no merchant_id)

These are platform-wide and intentionally NOT tenant-scoped:

- `users` — internal system accounts
- `model_versions` — global ML model registry
- `model_evaluations` — platform-wide model performance
- `agent_runs` — AI execution log (all merchants share models)
- `system_events` — infrastructure events

### Tenant context via FK chain

Some tables don't have a direct `merchant_id` but can resolve it via FK:
- `policy_versions` → `policies.merchant_id`
- `policy_evaluations` → `recovery_cases.merchant_id`
- `model_predictions` → `transactions.merchant_id`
- `recovery_attempts` → `recovery_actions.merchant_id`
- `simulation_results` → `simulation_runs.merchant_id`

---

## Append-Only Tables

The following tables use `CreatedAtMixin` (no `updated_at`) to reinforce immutability:

| Table | Rationale |
|-------|-----------|
| `audit_events` | Event log — records must never change |
| `recovery_attempts` | Each attempt is an immutable execution record |
| `ai_decisions` | AI recommendations are immutable once created |
| `policy_evaluations` | Policy decisions are immutable (deterministic engine) |
| `model_predictions` | Inference outputs are immutable |
| `model_evaluations` | Performance snapshots are immutable |
| `policy_versions` | Rule snapshots are immutable once published |
| `agent_runs` | Execution traces are immutable |
| `simulation_results` | Calculated results are immutable |

**Application-layer enforcement:** Services MUST NOT call `UPDATE` or `DELETE` on these tables. Future phases may add PostgreSQL-level row security policies for additional protection.

---

## Indexes

### Minimum required indexes

| Table | Indexed Columns |
|-------|----------------|
| `customers` | `merchant_id`, `(merchant_id, external_customer_id)` |
| `transactions` | `merchant_id`, `customer_id`, `(merchant_id, external_transaction_id)` |
| `recovery_cases` | `merchant_id`, `transaction_id`, `state`, `correlation_id` |
| `recovery_opportunities` | `merchant_id`, `transaction_id`, `recovery_case_id` |
| `recovery_actions` | `merchant_id`, `recovery_case_id`, `state`, `idempotency_key` |
| `recovery_attempts` | `recovery_action_id`, `state` |
| `audit_events` | `merchant_id`, `correlation_id`, `recovery_case_id`, `transaction_id`, `event_type`, `timestamp` |
| `ai_decisions` | `recovery_case_id`, `prediction_id` |
| `policy_evaluations` | `policy_id`, `recovery_case_id` |
| `model_predictions` | `transaction_id`, `recovery_case_id`, `model_version_id` |
| `model_evaluations` | `model_version_id` |
| `agent_runs` | `agent_name`, `status`, `timestamp` |
| `manual_reviews` | `merchant_id`, `recovery_case_id` |
| `simulation_runs` | `merchant_id`, `status` |
| `simulation_results` | `simulation_run_id` |
| `system_events` | `event_type`, `timestamp` |

---

## Relationships Summary

```
Merchant ──────────────────────────┐
    │                              │
    ├── Customer ──── Transaction  │
    │                    │         │
    │               RecoveryCase  │
    │                    │         │
    │       ┌────────────┼────────┴──────────────┐
    │       │            │                        │
    │  RecoveryOpportunity  PolicyEvaluation   AuditEvent
    │                    │
    │             RecoveryAction ──── RecoveryAttempt
    │                    │
    │             (idempotency_key)
    │
    ├── Policy ──── PolicyVersion
    │
    ├── ManualReview
    │
    └── SimulationRun ──── SimulationResult

ModelVersion ──── ModelPrediction ──── AIDecision
      └─────────── ModelEvaluation     (+ AgentRun)
```
