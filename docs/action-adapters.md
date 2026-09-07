# RecoverAI v3.2 — Action Adapters & Failure Manager

## Overview
The execution layer isolates all external system interactions (like Razorpay) from the core orchestrator via the `BaseActionAdapter` abstraction. The `FailureManager` routes executions and classifies outcomes to securely transition state machines according to Phase 4 rules.

## Adapter Abstraction
`BaseActionAdapter` enforces the `execute_action(action, idempotency_key)` interface.
It returns an `AdapterResponse` containing:
- `outcome` (SUCCESS, TEMPORARY_FAILURE, INVALID_REQUEST, UNKNOWN)
- `provider_reference`
- `provider_code`
- `message`

### Implementations
1. **SimulationAdapter**: Used when `execution_mode = SIMULATION`. Deterministically simulates outcomes without any external calls.
2. **RazorpayTestAdapter**: Used when `execution_mode = LIVE`. *Note: In Phase 8, this is purely a deterministic test mock and does NOT call the real Razorpay API.*

## Failure Classifications
The `FailureManager` classifies outcomes and updates states:
- **SUCCESS**: Attempt `SUCCEEDED`, Action `SUCCEEDED`, Case `RECOVERED` → `CLOSED`.
- **TEMPORARY_FAILURE**: Attempt `FAILED`, Action stays `EXECUTING`, Case stays `RECOVERING`. PolicyEngine is responsible for authorizing retries.
- **INVALID_REQUEST**: Attempt `FAILED`, Action `FAILED`. Execution halts.
- **UNKNOWN**: Attempt `UNKNOWN`, Action `OUTCOME_UNKNOWN`. Case stays `RECOVERING`. Triggers `ManualReview` record generation. Never auto-retries.

## Idempotency
- The `FailureManager` strictly passes `action.idempotency_key` unchanged to the adapter.
- New keys are NEVER generated for retries.
- Retries happen under the SAME `RecoveryAction` (and thus use the exact same key).

## Audit Trail & State Safety
- All state updates route exclusively through the Phase 4 validators (`validate_case_transition`, etc.).
- Every execution cascade writes comprehensive `AuditEvent` records, including `AttemptStarted`, `ActionSucceeded`, `CaseRecovered`, etc., preserving tenant isolation and `correlation_id` across the trace.
