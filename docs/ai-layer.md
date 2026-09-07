# RecoverAI v3.2 — AI Recommendation Layer (Phase 7)

## Overview
The AI Recommendation layer utilizes diagnostic and planning agents (LLMs) to inspect failure context and recommend an optimal recovery action.

## Core Rules & Constraints
1. **Advisory Only**: The AI agents **NEVER** authorize or execute financial actions.
2. **No External Triggers**: The AI layer cannot call Razorpay, alter database State Machines directly, or bypass the Policy Engine.
3. **Pydantic Validation**: All outputs strictly conform to predefined JSON schemas. Invalid output triggers a fallback.

## Fallback Matrix
If the LLM is unavailable, times out, or produces malformed/invalid output, the following deterministic rule-based fallback matrix is activated:

### Diagnosis Fallback
- `stolen_card`, `fraud_suspected`, `lost_card` → `FRAUD_RISK`
- `account_closed` → `ACCOUNT_CLOSED`
- `temporary_failure` → `TEMPORARY_FAILURE`
- `network_error` → `NETWORK_ERROR`
- `insufficient_funds` → `INSUFFICIENT_FUNDS`
- `expired_card` → `EXPIRED_CARD`
- `card_declined` → `CARD_DECLINED`
- All others → `UNKNOWN_FAILURE`

### Recovery Planner Fallback
Based entirely on the diagnosis:
- `FRAUD_RISK` → `MANUAL_REVIEW`
- `ACCOUNT_CLOSED` → `MANUAL_REVIEW`
- `UNKNOWN_FAILURE` → `MANUAL_REVIEW`
- `TEMPORARY_FAILURE` → `RETRY_PAYMENT`
- `NETWORK_ERROR` → `RETRY_PAYMENT`
- `INSUFFICIENT_FUNDS` → `SEND_PAYMENT_LINK`
- `EXPIRED_CARD` → `REQUEST_CUSTOMER_ACTION`
- `CARD_DECLINED` → `REQUEST_CUSTOMER_ACTION`

## Auditing
Every execution is recorded in the `agent_runs` table. 
- Successful LLM generations are recorded with `agent_version = 'LLM'`.
- Fallbacks are recorded with `agent_version = 'RULE_BASED_FALLBACK'` and the specific failure reason is logged in the `status` field.
