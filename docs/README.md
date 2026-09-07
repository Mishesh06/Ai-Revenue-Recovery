# RecoverAI Architecture & Technical Documentation

Welcome to the technical documentation hub for **RecoverAI v3.2** — Payment Failure Recovery & Orchestration Engine.

---

## 📚 Documentation Index

| Document | Description |
|---|---|
| [System Overview & Status](../README.md) | High-level overview, implementation status, quickstart, and API specifications |
| [Database Architecture](database.md) | PostgreSQL schema, 21 relational tables, multi-tenant isolation, and state machine columns |
| [Entity Relationships](entity-relationships.md) | Foreign key diagrams, trace chains, and ER mapping across the recovery lifecycle |
| [API Contract & Endpoints](api-contract.md) | Complete REST API specification, request/response schemas, and error definitions |
| [AI Agent Architecture](ai-layer.md) | Multi-agent design, MockLLMClient, and deterministic rule-based fallback logic |
| [Machine Learning Engine](ml.md) | Synthetic dataset generation, Scikit-Learn training pipeline, and model registry |
| [Action Adapters & Gateway Integration](action-adapters.md) | BaseActionAdapter interface, RazorpayTestAdapter (mock), and FailureManager |
| [Simulation & Replay Engine](simulator.md) | Zero-risk sandbox execution, mock state transitions, and step-by-step audit replay |
| [Frontend Foundation & Design System](frontend-foundation.md) | Next.js 15 App Router architecture, glassmorphic UI system, and state management |

---

## 🏗️ System Architecture at a Glance

```mermaid
graph TD
    User([End Customer / Merchant]) --> Ingest[FastAPI Ingestion & Idempotency Layer]
    Ingest --> DB[(PostgreSQL Database)]
    
    subgraph Decision Layer
        Ingest --> ML[ML Recovery Scoring Model]
        ML --> DiagAgent[Diagnosis Agent (Mock/Rule Fallback)]
        DiagAgent --> PlanAgent[Planner Agent (Mock/Rule Fallback)]
        PlanAgent --> Policy[Deterministic Policy Engine]
    end
    
    subgraph Execution & Adaptation
        Policy -->|Approved| Adapter[Gateway Adapter (Simulation / Test Mock)]
        Policy -->|Blocked / High Risk| Review[Human-in-the-Loop Review Queue]
        Adapter --> Outcome{Attempt Outcome}
        Outcome -->|Success| Recovered[Case Recovered & Closed]
        Outcome -->|Failed| Retry[Retry State Machine]
        Outcome -->|Timeout / Unknown| Review
    end
    
    subgraph Observability & UI
        DB --> Audit[Append-Only Audit Event Log]
        Audit --> UI[Next.js 15 Glassmorphic Command Center]
    end
```

---

## 🛡️ Core Architectural Principles

1. **Deterministic Safety Guardrails**: AI proposals are evaluated by versioned policy rules (`PolicyEngine`) before executing any adapter action.
2. **True Tenant Isolation**: Every merchant entity is strictly partitioned at the database level via `merchant_id` foreign keys with `RESTRICT` and tenant-scoped session middleware.
3. **Strict Idempotency**: Recovery attempts and gateway dispatches require deterministic idempotency keys (`UNIQUE(idempotency_key)`).
4. **Append-Only Auditability**: Every state transition, agent decision, policy evaluation, and adapter response is logged immutably in `audit_events`.
