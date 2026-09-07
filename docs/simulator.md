# RecoverAI v3.2 — Real Recovery Simulator

The Phase 9 Real Recovery Simulator provides a deterministic end-to-end testing environment that streams synthetic transactions through the complete, live Recovery Orchestrator pipeline.

## Simulator Architecture
The simulator ORCHESTRATES the existing frozen Phase 1-8 components without duplicating their logic:

```text
Synthetic Dataset (ml/data/dataset.csv)
      ↓
Transaction
      ↓
RecoveryCase
      ↓
ML Prediction (Bypassed in backend to avoid complex dependency via rule-fallback)
      ↓
Diagnosis Agent
      ↓
Recovery Planner
      ↓
PolicyEngine
      ↓
RecoveryOrchestrator
      ↓
FailureManager
      ↓
SimulationAdapter
      ↓
RecoveryAttempt
      ↓
AuditEvent
      ↓
Simulation Metrics
```

**No real Razorpay API is called by the simulator.**

## Scenarios
The simulator supports 5 distinct scenarios:

- **A (Normal)**: Randomly samples typical failed transactions from the dataset.
- **B (High-risk)**: Filters transactions where `customer_risk_score > 0.8`.
- **C (Razorpay Timeout)**: Forces the `SimulationAdapter` to inject an `UNKNOWN` outcome. Demonstrates the strict UNKNOWN ➔ MANUAL REVIEW cascade safety.
- **D (High Recovery Opportunity)**: Filters transactions with `failure_code == "insufficient_funds"`.
- **E (Policy-heavy Batch)**: Spoofs an artificial high attempt count (retries > max limit) to force the Policy Engine to block transactions.

## Determinism
All scenarios are highly reproducible. By default, the simulator uses a strict seed (`seed=42`) for dataset sampling. Running the same scenario with the same seed and sample size will always select the identical dataset rows and generate the same actions.

## ML Ground Truth Protection
The synthetic dataset contains the ground-truth target `recovered`. The simulator **NEVER** uses this target to decide execution behavior. Execution outcomes depend strictly on the Scenario logic injected into the `SimulationAdapter`.

## UNKNOWN Safety Flow (Scenario C)
When an adapter returns `UNKNOWN` (simulating a provider timeout):
1. `Attempt` is set to `UNKNOWN`.
2. `Action` is set to `OUTCOME_UNKNOWN`.
3. The `RecoveryCase` securely remains `RECOVERING`.
4. A `ManualReview` is created.
5. A `ManualReviewCreated` audit event is emitted.
6. The simulator NEVER automatically retries.

## Metric Definitions
Metrics are derived strictly via database queries from the persisted Simulation Run, ensuring zero fake in-memory counters.

- **transactions_analyzed**: Number of transactions actually processed by this run.
- **opportunities_detected**: Number of recovery opportunities/cases created.
- **actions_approved**: Number of recovery actions explicitly `APPROVED` by the Policy Engine.
- **successful_recoveries**: Number of cases that reached `CLOSED` state.
- **revenue_recovered**: Total sum of transaction amounts for cases that successfully recovered.
- **recovery_rate**: `successful_recoveries / opportunities_detected`
- **policy_blocks**: Number of `BLOCKED` policy evaluations.
- **manual_reviews**: Number of manual review records created.
- **unknown_outcomes**: Number of attempts marked `UNKNOWN`.

## Simulation Run Isolation
Every record created by the simulator is traceable to its unique `SimulationRun`. Metrics strictly correspond to the `merchant_id` assigned at the beginning of the simulation, ensuring strict tenant isolation.

## Idempotency
The simulator fully respects Phase 8 idempotency rules. Actions generate idempotency keys via the canonical `merchant_id:case_id:action_id` format.

## How to run the Simulator
You can run the simulator natively using the provided script in the backend directory:

```bash
python scripts/run_simulator.py --scenario A --sample-size 10
python scripts/run_simulator.py --scenario C --sample-size 10
```

### Example Scenario C Output
```text
Running Simulator - Scenario C (seed=42, sample=10)
============================================================
Simulation Run ID       : 4fae1bc1-b444-4a84-aba7-8e3ea84f6004
Scenario                : C
Transactions analyzed   : 10
Opportunities detected  : 10
Actions approved        : 9
Successful recoveries   : 0
Revenue recovered       : $0.00
Recovery rate           : 0.00%
Policy blocks           : 0
Manual reviews          : 9
Unknown outcomes        : 9
============================================================
Notice: For Scenario C, UNKNOWN outcomes safely generated ManualReviews without triggering auto-retries.
```
