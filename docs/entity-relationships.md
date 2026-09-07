# RecoverAI v3.2 — Entity Relationships

> **Phase 2 Reference Document**
> Canonical entity relationship map, FK chain analysis, cascade rules,
> and constraint inventory verified against live `Base.metadata`.

---

## Ownership Hierarchy

```
Merchant (root tenant)
 │
 ├── Customer
 │    └── Transaction
 │         │
 │         └── RecoveryCase ─────────────────────────────────────────────┐
 │                  │                                                     │
 │    ┌─────────────┼─────────────────────────────┐                      │
 │    │             │             │               │                       │
 │  RecoveryOpportunity   ModelPrediction   AuditEvent           ManualReview
 │                  │
 │          AIDecision ←── AgentRun (global)
 │          AIDecision ←── ModelVersion (global)
 │                  │
 │         PolicyEvaluation ←── Policy ←── PolicyVersion
 │                  │
 │         RecoveryAction (IDEMPOTENCY OWNER)
 │                  │
 │         RecoveryAttempt × N
 │
 └── SimulationRun
          └── SimulationResult

GlobalTables (no merchant_id):
  users, model_versions, model_evaluations, agent_runs, system_events
```

---

## Foreign Key Map

All foreign keys with their column names, target tables, and ON DELETE behavior.

### Core Domain

| Table | FK Column | → Target | ON DELETE |
|-------|-----------|----------|-----------|
| `customers` | `merchant_id` | `merchants.id` | RESTRICT |
| `transactions` | `merchant_id` | `merchants.id` | RESTRICT |
| `transactions` | `customer_id` | `customers.id` | SET NULL |
| `recovery_cases` | `merchant_id` | `merchants.id` | RESTRICT |
| `recovery_cases` | `transaction_id` | `transactions.id` | RESTRICT |
| `recovery_opportunities` | `merchant_id` | `merchants.id` | RESTRICT |
| `recovery_opportunities` | `transaction_id` | `transactions.id` | RESTRICT |
| `recovery_opportunities` | `recovery_case_id` | `recovery_cases.id` | SET NULL |
| `recovery_actions` | `merchant_id` | `merchants.id` | RESTRICT |
| `recovery_actions` | `recovery_case_id` | `recovery_cases.id` | RESTRICT |
| `recovery_actions` | `policy_evaluation_id` | `policy_evaluations.id` | SET NULL |
| `recovery_attempts` | `recovery_action_id` | `recovery_actions.id` | RESTRICT |
| `audit_events` | `merchant_id` | `merchants.id` | RESTRICT |
| `audit_events` | `recovery_case_id` | `recovery_cases.id` | SET NULL |
| `audit_events` | `transaction_id` | `transactions.id` | SET NULL |
| `manual_reviews` | `merchant_id` | `merchants.id` | RESTRICT |
| `manual_reviews` | `recovery_case_id` | `recovery_cases.id` | RESTRICT |

### Policy Domain

| Table | FK Column | → Target | ON DELETE |
|-------|-----------|----------|-----------|
| `policies` | `merchant_id` | `merchants.id` | RESTRICT |
| `policy_versions` | `policy_id` | `policies.id` | RESTRICT |
| `policy_evaluations` | `policy_id` | `policies.id` | RESTRICT |
| `policy_evaluations` | `recovery_case_id` | `recovery_cases.id` | RESTRICT |

### ML / AI Domain

| Table | FK Column | → Target | ON DELETE |
|-------|-----------|----------|-----------|
| `model_predictions` | `model_version_id` | `model_versions.id` | SET NULL |
| `model_predictions` | `transaction_id` | `transactions.id` | RESTRICT |
| `model_predictions` | `recovery_case_id` | `recovery_cases.id` | SET NULL |
| `model_evaluations` | `model_version_id` | `model_versions.id` | RESTRICT |
| `ai_decisions` | `prediction_id` | `model_predictions.id` | SET NULL |
| `ai_decisions` | `recovery_case_id` | `recovery_cases.id` | RESTRICT |
| `ai_decisions` | `agent_run_id` | `agent_runs.id` | SET NULL |

### Simulation Domain

| Table | FK Column | → Target | ON DELETE |
|-------|-----------|----------|-----------|
| `simulation_runs` | `merchant_id` | `merchants.id` | RESTRICT |
| `simulation_results` | `simulation_run_id` | `simulation_runs.id` | **CASCADE** |

> **Note:** `simulation_results` uses `CASCADE` because results are entirely
> owned by the run — deleting a run must clean up all its results.

---

## Decision Trace Chain

The canonical trace linking a payment failure to the final recovery attempt:

```
transactions
  │ id (UUID, PK)
  │
  ├─(transaction_id)──► model_predictions
  │                        │ id (UUID, PK)
  │                        │ transaction_id → transactions.id  ✦ NOT NULL
  │                        │ recovery_case_id → recovery_cases.id  nullable
  │                        │ model_version_id → model_versions.id  nullable
  │
  ├─(transaction_id)──► recovery_cases
  │                        │ id (UUID, PK)
  │                        │ merchant_id → merchants.id  ✦ NOT NULL
  │                        │ correlation_id  ✦ NOT NULL, UNIQUE
  │                        │ state (CaseState)
  │                        │
  │     ┌──────────────────┤
  │     │                  │
  │   ◄─┘                  ├─(recovery_case_id)──► policy_evaluations
  │                        │                           │ id (UUID, PK)
  │                        │                           │ policy_id → policies.id
  │                        │                           │ decision (APPROVED/REJECTED/MANUAL_REVIEW)
  │                        │                           │ requires_human_review
  │                        │
  │     (prediction_id)────┴──────────────────────────►ai_decisions
  │                                                     │ id (UUID, PK)
  │                                                     │ prediction_id  nullable
  │                                                     │ recovery_case_id ✦ NOT NULL
  │                                                     │ agent_run_id  nullable
  │
  └─ recovery_actions ◄─(policy_evaluation_id)─ policy_evaluations
       │ id (UUID, PK)
       │ merchant_id ✦ NOT NULL
       │ recovery_case_id ✦ NOT NULL
       │ action_id (string, e.g. "RETRY_PAYMENT")
       │ idempotency_key ✦ UNIQUE
       │ state (ActionState)
       │
       └─(recovery_action_id)──► recovery_attempts × N
                                    │ id (UUID, PK)
                                    │ attempt_number
                                    │ state (AttemptState)
                                    │ UNIQUE(recovery_action_id, attempt_number)
```

### Trace Link Summary

| Link | Column | Nullable | Direction |
|------|--------|----------|-----------|
| Transaction → ModelPrediction | `transaction_id` | NOT NULL | one-to-many |
| ModelPrediction → AIDecision | `prediction_id` | **nullable** | one-to-many |
| AIDecision → RecoveryCase | `recovery_case_id` | NOT NULL | many-to-one |
| RecoveryCase → PolicyEvaluation | `recovery_case_id` | NOT NULL | one-to-many |
| PolicyEvaluation → RecoveryAction | `policy_evaluation_id` | **nullable** | one-to-many |
| RecoveryAction → RecoveryAttempt | `recovery_action_id` | NOT NULL | one-to-many |

**Nullable links** are intentional: prediction may not exist for rule-based decisions; policy_evaluation_id may not be set for manually triggered actions.

---

## SQLAlchemy ORM Relationships

### Merchant (root)

```python
Merchant.customers          → [Customer]          lazy="raise"
Merchant.transactions       → [Transaction]        lazy="raise"
Merchant.recovery_cases     → [RecoveryCase]       lazy="raise"
Merchant.recovery_opportunities → [RecoveryOpportunity] lazy="raise"
Merchant.policies           → [Policy]             lazy="raise"
Merchant.recovery_actions   → [RecoveryAction]     lazy="raise"
Merchant.audit_events       → [AuditEvent]         lazy="raise"
Merchant.manual_reviews     → [ManualReview]       lazy="raise"
Merchant.simulation_runs    → [SimulationRun]      lazy="raise"
```

### RecoveryCase

```python
RecoveryCase.merchant           → Merchant               lazy="raise"
RecoveryCase.transaction        → Transaction             lazy="raise"
RecoveryCase.recovery_opportunities → [RecoveryOpportunity] lazy="raise"
RecoveryCase.ai_decisions       → [AIDecision]           lazy="raise"
RecoveryCase.recovery_actions   → [RecoveryAction]       lazy="raise"
RecoveryCase.audit_events       → [AuditEvent]           lazy="raise"
RecoveryCase.manual_reviews     → [ManualReview]         lazy="raise"
RecoveryCase.model_predictions  → [ModelPrediction]      lazy="raise"
RecoveryCase.policy_evaluations → [PolicyEvaluation]     lazy="raise"
```

### RecoveryAction (Idempotency owner)

```python
RecoveryAction.merchant           → Merchant           lazy="raise"
RecoveryAction.recovery_case      → RecoveryCase       lazy="raise"
RecoveryAction.policy_evaluation  → PolicyEvaluation   lazy="raise"
RecoveryAction.recovery_attempts  → [RecoveryAttempt]  lazy="raise"
                                     cascade="all, delete-orphan"
```

### Policy

```python
Policy.merchant     → Merchant           lazy="raise"
Policy.versions     → [PolicyVersion]    lazy="raise"  cascade="all, delete-orphan"
Policy.evaluations  → [PolicyEvaluation] lazy="raise"
```

### ModelVersion

```python
ModelVersion.predictions  → [ModelPrediction]  lazy="raise"
ModelVersion.evaluations  → [ModelEvaluation]  lazy="raise"  cascade="all, delete-orphan"
```

### SimulationRun

```python
SimulationRun.merchant  → Merchant            lazy="raise"
SimulationRun.results   → [SimulationResult]  lazy="raise"  cascade="all, delete-orphan"
```

> **`lazy="raise"`** is set on ALL relationships. This prevents accidental N+1
> queries — all relationship loading must be explicit via `selectinload()` or `joinedload()`.

---

## Constraint Inventory

### UNIQUE Constraints

| Table | Columns | Constraint Name | Purpose |
|-------|---------|----------------|---------|
| `merchants` | `api_key` | column-level unique | One API key per merchant |
| `users` | `email` | column-level unique | One account per email |
| `recovery_cases` | `correlation_id` | column-level unique | One trace ID per case |
| `recovery_actions` | `idempotency_key` | `uq_recovery_actions_idempotency_key` | Canonical idempotency |
| `recovery_attempts` | `(recovery_action_id, attempt_number)` | `uq_recovery_attempts_action_attempt` | Monotonic attempt ordering |
| `policy_versions` | `(policy_id, version)` | `uq_policy_versions_policy_version` | One version number per policy |
| `model_versions` | `(model_name, version)` | `uq_model_versions_name_version` | One version per model name |

### Cascade Behaviors

| Relationship | ORM Cascade | DB ON DELETE | Rationale |
|-------------|-------------|--------------|-----------|
| `RecoveryAction → RecoveryAttempt` | `all, delete-orphan` | RESTRICT | Attempts are children of the action |
| `Policy → PolicyVersion` | `all, delete-orphan` | RESTRICT | Versions are owned by policy |
| `SimulationRun → SimulationResult` | `all, delete-orphan` | **CASCADE** | Results are children of the run |
| `ModelVersion → ModelEvaluation` | `all, delete-orphan` | RESTRICT | Evaluations are per-version records |
| All `merchant_id` FKs | none | **RESTRICT** | Prevent accidental merchant deletion |

---

## Indexes

All indexes are explicitly declared. No implicit indexes beyond PK.

| Table | Index | Columns |
|-------|-------|---------|
| `recovery_cases` | `ix_recovery_cases_merchant_id` | `merchant_id` |
| `recovery_cases` | `ix_recovery_cases_transaction_id` | `transaction_id` |
| `recovery_cases` | `ix_recovery_cases_state` | `state` |
| `recovery_cases` | `ix_recovery_cases_correlation_id` | `correlation_id` |
| `recovery_actions` | `ix_recovery_actions_merchant_id` | `merchant_id` |
| `recovery_actions` | `ix_recovery_actions_case_id` | `recovery_case_id` |
| `recovery_actions` | `ix_recovery_actions_state` | `state` |
| `recovery_actions` | `ix_recovery_actions_idempotency_key` | `idempotency_key` |
| `recovery_attempts` | `ix_recovery_attempts_action_id` | `recovery_action_id` |
| `recovery_attempts` | `ix_recovery_attempts_state` | `state` |
| `audit_events` | `ix_audit_events_merchant_id` | `merchant_id` |
| `audit_events` | `ix_audit_events_correlation_id` | `correlation_id` |
| `audit_events` | `ix_audit_events_recovery_case_id` | `recovery_case_id` |
| `audit_events` | `ix_audit_events_transaction_id` | `transaction_id` |
| `audit_events` | `ix_audit_events_event_type` | `event_type` |
| `audit_events` | `ix_audit_events_timestamp` | `timestamp` |
| `model_predictions` | `ix_model_predictions_transaction_id` | `transaction_id` |
| `model_predictions` | `ix_model_predictions_case_id` | `recovery_case_id` |
| `model_predictions` | `ix_model_predictions_model_version_id` | `model_version_id` |
| `ai_decisions` | `ix_ai_decisions_recovery_case_id` | `recovery_case_id` |
| `ai_decisions` | `ix_ai_decisions_prediction_id` | `prediction_id` |
| `agent_runs` | `ix_agent_runs_agent_name` | `agent_name` |
| `agent_runs` | `ix_agent_runs_status` | `status` |
| `agent_runs` | `ix_agent_runs_timestamp` | `timestamp` |

---

## Tenant Isolation Classification

### Direct `merchant_id` (NOT NULL → `merchants.id` RESTRICT)

```
customers · transactions · recovery_cases · recovery_opportunities
policies · recovery_actions · audit_events · manual_reviews · simulation_runs
```

### Scoped via FK chain (no direct `merchant_id`)

| Table | Chain |
|-------|-------|
| `recovery_attempts` | → `recovery_actions.merchant_id` |
| `policy_versions` | → `policies.merchant_id` |
| `policy_evaluations` | → `recovery_cases.merchant_id` |
| `model_predictions` | → `transactions.merchant_id` |
| `ai_decisions` | → `recovery_cases.merchant_id` |
| `simulation_results` | → `simulation_runs.merchant_id` |

### Global (no tenant scope)

```
users · model_versions · model_evaluations · agent_runs · system_events
```

---

## Append-Only Tables

These tables use `CreatedAtMixin` (no `updated_at`). Application layer must never `UPDATE` or `DELETE` rows.

| Table | Rationale |
|-------|-----------|
| `audit_events` | Immutable event log — the source of truth for the window timeline |
| `recovery_attempts` | Each attempt is an immutable execution record |
| `ai_decisions` | AI recommendations are immutable once issued |
| `policy_evaluations` | Policy decisions are deterministic and immutable |
| `model_predictions` | Inference outputs are immutable snapshots |
| `model_evaluations` | Model performance snapshots are immutable |
| `policy_versions` | Rule snapshots are immutable once published |
| `agent_runs` | Agent execution traces are immutable |
| `simulation_results` | Calculated metric results are immutable |
