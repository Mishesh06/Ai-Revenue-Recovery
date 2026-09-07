# ⚡ RecoverAI (v3.2)

### Payment Failure Recovery & Orchestration Engine

RecoverAI is an open-source payment failure recovery system built with FastAPI, PostgreSQL, Scikit-Learn, and Next.js. It evaluates failed transactions, simulates diagnostic workflows, enforces deterministic policy guardrails, and records immutable audit event streams.

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.0+-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-563%20Passing-success?style=flat-square&logo=pytest&logoColor=white)](https://github.com/Mishesh06/Ai-Revenue-Recovery)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 🧭 Repository Implementation Status

To maintain engineering transparency, the table below distinguishes what is genuinely implemented, what is mocked or simulated, and what is planned for future phases.

### ✅ Implemented Functionality

* **PostgreSQL Relational Schema**: 21 tables managed with async SQLAlchemy 2.0 and Alembic migrations, covering tenants, customers, transactions, recovery cases, actions, attempts, policy evaluations, and audit events.
* **Deterministic Policy Engine (`app/services/policy_engine.py`)**: Evaluates recovery actions against hard business rules:
  - Hard decline exclusions (`stolen_card`, `lost_card`, `fraud_suspected`, `account_closed`)
  - Maximum retry ceilings (`MAX_RETRIES = 3`)
  - Recovery window expiration checks
  - Amount thresholds (`HIGH_AMOUNT_THRESHOLD = 1000.00`) and low confidence escalation (`LOW_CONFIDENCE_THRESHOLD = 0.60`) to manual review
* **Recovery Orchestration & State Machine (`app/services/failure_manager.py`)**: Cascades updates across three non-colliding state models:
  - `RecoveryCase` (`NEW` → `INVESTIGATING` → `RECOVERY_PLANNED` → `EXECUTING` → `RECOVERED` / `FAILED` / `CLOSED`)
  - `RecoveryAction` (`PENDING` → `APPROVED` → `EXECUTING` → `SUCCEEDED` / `FAILED` / `OUTCOME_UNKNOWN`)
  - `RecoveryAttempt` (`STARTED` → `SUCCEEDED` / `FAILED` / `UNKNOWN`)
* **Multi-Tenant Scoping**: Row-level merchant partitioning via `merchant_id` foreign keys with `RESTRICT` on delete and middleware validation via `X-Merchant-ID`.
* **Append-Only Audit Logging (`app/services/audit_service.py`)**: Immutable chronological logging of state changes, provider references, and action outcomes into `audit_events`.
* **ML Predictive Pipeline (`ml/`)**: Scikit-Learn `RandomForestClassifier` trained on a synthetic feature dataset (`ml/data/dataset.csv`), with a versioned registry (`registry.json`) and prediction endpoint (`ml/predict.py`).
* **Simulation Sandbox (`app/services/simulator.py`)**: Executes end-to-end recovery scenarios (Scenarios A–E) against sampled data, evaluating policies, updating state machines, and generating audit streams without external side effects.
* **Next.js 15 Frontend (`recoverai/frontend/`)**: 12 route views featuring dark glassmorphic UI, live API data loading, interactive simulation scrubber, decision trace inspector, and manual review modal workflows.
* **Comprehensive Test Suite**: 563 backend pytest test cases and 5 ML pipeline tests verifying schema integrity, tenant isolation, idempotency, and state machine transitions.

---

### ⚠️ Mocked or Simulated Components

* **Mock LLM Client (`app/services/llm_client.py`)**: Returns static, hardcoded JSON dictionaries (`mock_diagnosis_response` and `mock_planner_response`) with failure injection toggles (timeout, unavailable, malformed JSON). **No external LLM APIs (OpenAI, Anthropic, Gemini, etc.) are called.**
* **Rule-Based Agent Fallback (`app/services/agent_service.py`)**: Uses deterministic Python `if/else` mappings for failure categories and recommended actions when mock LLM calls fail or default.
* **Razorpay Test Adapter (`app/services/adapters/razorpay_test.py`)**: An in-memory test mock adhering to the `BaseActionAdapter` interface. **Does not call live Razorpay APIs.** Generates synthetic provider references (`pay_mock_*`).
* **Simulation Adapter (`app/services/adapters/simulation.py`)**: In-memory adapter with class-injected outcomes (`SUCCESS`, `UNKNOWN`, etc.) for dry-run testing. Generates synthetic references (`sim_*`).
* **Synthetic ML Training Data (`ml/data/generate_dataset.py`)**: The 10,000-record dataset is generated mathematically using NumPy distributions (log-normal, beta, Poisson). **Simulation metrics and model evaluation scores reflect synthetic statistical formulas, not live commercial recovery benchmarks.**

---

### ❌ Not Yet Implemented (Future Roadmap)

* **Live LLM Integration**: Real API client integration for generative diagnosis or prompt-based planning.
* **Live Razorpay Gateway Integration**: Network-level communication with Razorpay Orders/Payments APIs, webhook signature verification, and live token exchanges.
* **Production Commercial Data**: Calibrated models trained on real banking transactions or real gateway decline telemetry.
* **Production Authentication**: Multi-tenant OAuth 2.0 / JWT token authentication (currently uses `X-Merchant-ID` header validation).
* **Direct Single-Case Action Endpoints**: `/api/recovery/{id}/analyze`, `/recommend`, and `/execute` routes currently return HTTP 202 acceptance stubs (end-to-end orchestration is run via `/api/simulations`).

---

## 🏗️ Architecture

```mermaid
graph TD
    classDef primary fill:#1e1e2e,stroke:#7287fd,stroke-width:2px,color:#cdd6f4;
    classDef success fill:#1e1e2e,stroke:#a6e3a1,stroke-width:2px,color:#a6e3a1;
    classDef warning fill:#1e1e2e,stroke:#f9e2af,stroke-width:2px,color:#f9e2af;
    classDef info fill:#1e1e2e,stroke:#89dceb,stroke-width:2px,color:#89dceb;

    TX[Failed Transaction Record / Webhook]:::info --> Ingest[FastAPI Ingestion Layer]:::primary
    Ingest --> DB[(PostgreSQL 15 Database)]:::primary
    
    subgraph Decision Layer
        Ingest --> ML[ML Scoring Model (RandomForest)]:::info
        ML --> Diag[Diagnosis Agent (Mock/Rule Fallback)]:::warning
        Diag --> Plan[Planner Agent (Mock/Rule Fallback)]:::warning
        Plan --> Policy[Deterministic Policy Engine]:::success
    end

    subgraph Execution Adapters (Offline / Mock)
        Policy -->|Approved| Adapter[RazorpayTestAdapter / SimulationAdapter]:::warning
        Policy -->|Review / High Risk| ManualQueue[Human Review Queue]:::warning
        Adapter --> Outcome{Adapter Outcome}:::info
        Outcome -->|SUCCESS| Recovered[Case Closed & Succeeded]:::success
        Outcome -->|TEMPORARY_FAILURE| RetrySM[Retry Handling]:::warning
        Outcome -->|UNKNOWN| ManualQueue
    end

    subgraph Observability
        DB --> Audit[Append-Only Audit Stream]:::primary
        Audit --> UI[Next.js 15 Command Center]:::primary
        ManualQueue --> UI
    end
```

---

## 📁 Repository Structure

```
.
├── docs/                                  # Technical architecture documentation
│   ├── README.md                          # Documentation index
│   ├── database.md                        # PostgreSQL schema specifications (21 tables)
│   ├── entity-relationships.md            # Foreign key diagrams & state relations
│   ├── api-contract.md                    # REST API specifications
│   ├── ai-layer.md                        # Agent architecture & fallback logic
│   ├── ml.md                              # ML dataset generation & model registry
│   ├── action-adapters.md                 # Adapter interface & FailureManager
│   ├── simulator.md                       # Simulation engine & scenario definitions
│   └── frontend-foundation.md             # Next.js 15 UI architecture
├── recoverai/
│   ├── backend/                           # FastAPI Backend
│   │   ├── app/
│   │   │   ├── api/                       # REST route controllers
│   │   │   ├── core/                      # Config, merchant context, error handlers
│   │   │   ├── database/                  # SQLAlchemy async session & declarative base
│   │   │   ├── models/                    # 21 SQLAlchemy ORM models
│   │   │   ├── orchestrator/              # Recovery case orchestration logic
│   │   │   ├── schemas/                   # Pydantic validation schemas
│   │   │   ├── services/                  # Core services (AgentService, PolicyEngine, FailureManager, Simulator, adapters/)
│   │   │   │   └── adapters/              # Gateway adapters (SimulationAdapter, RazorpayTestAdapter)
│   │   │   └── main.py                    # FastAPI entrypoint
│   │   ├── scripts/                       # DB initialization (init_db.py) & demo seeding (seed_demo.py)
│   │   ├── tests/                         # 570 pytest unit/integration tests
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── frontend/                          # Next.js 15 App Router Frontend
│   │   ├── src/
│   │   │   ├── app/                       # 12 page routes (analytics, audit, simulator, review, etc.)
│   │   │   ├── components/                # UI components, scrubber timeline, decision modals
│   │   │   ├── context/                   # Merchant context state
│   │   │   └── lib/                       # API client & formatting utilities
│   │   ├── package.json
│   │   └── Dockerfile
│   └── ml/                                # Machine Learning Pipeline
│       ├── data/                          # generate_dataset.py & dataset.csv (synthetic)
│       ├── models/                        # registry.json & model_latest.pkl
│       ├── training/                      # train.py (RandomForest pipeline)
│       └── evaluation/                    # evaluate.py (Threshold & business cost analysis)
├── docker-compose.yml                     # Multi-container orchestration
├── Makefile                               # Developer CLI commands
├── scripts/
│   ├── setup.sh                           # Environment setup script
│   └── test.sh                            # Test runner script
├── LICENSE                                # MIT License
└── CONTRIBUTING.md                        # Contribution guidelines
```

---

## 🚀 Quickstart

### Option 1: Docker Compose

```bash
docker compose up --build
```

* **Frontend**: `http://localhost:3000`
* **Backend API**: `http://localhost:8000` (mapped to container port 8000)
* **OpenAPI Docs**: `http://localhost:8000/docs`

---

### Option 2: Local Development

#### Prerequisites
* **Python**: 3.11+
* **Node.js**: 18+ (Node 20 recommended)
* **PostgreSQL**: 14+

#### 1. Backend Setup
```bash
cd recoverai/backend
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# Initialize database schema & seed demo data
python scripts/init_db.py
python scripts/seed_demo.py

# Launch FastAPI server (default port: 8001)
uvicorn app.main:app --reload --port 8001
```

#### 2. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env.local

# Launch Next.js development server (default port: 3000)
npm run dev
```

Visit `http://localhost:3000`. The default demo merchant ID is `aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa`.

---

## 🧪 Testing

Run test commands from the repository root:

```bash
# Run all test suites
bash scripts/test.sh
# or
make test
```

### Individual Test Suites
* **Backend Unit & Integration Tests (563 Tests)**:
  ```bash
  cd recoverai/backend && source .venv/bin/activate && pytest -v
  ```
* **ML Pipeline Tests (5 Tests)**:
  ```bash
  cd recoverai/backend && source .venv/bin/activate && PYTHONPATH="../ml:." pytest ../ml/tests -v
  ```
* **Frontend TypeScript Build**:
  ```bash
  cd recoverai/frontend && npm run build
  ```

---

## 🎮 Simulation Engine Scenarios

The simulator allows testing state machine transitions and policy evaluations against synthetic transactions:

* **Scenario A (Normal Recovery)**: Transient decline (amount ≤ 1000, risk < 0.5) → Policy approved → SimulationAdapter succeeds → Case recovered and closed.
* **Scenario B (High-Risk Escalation)**: Risk score > 0.75 → Policy blocks automated retry → Case routed to `ManualReview` queue.
* **Scenario C (Gateway Timeout)**: Approved by policy → SimulationAdapter injects `UNKNOWN` outcome → `RecoveryAction` set to `OUTCOME_UNKNOWN` → Case routed to `ManualReview` queue.
* **Scenario D (Insufficient Funds)**: Triggers intent/delay recommendation → Policy evaluation.
* **Scenario E (Exceeded Attempts)**: Previous attempt count ≥ 3 → Policy strictly BLOCKS execution (`RETRY_LIMIT_EXCEEDED`).

---

## 📡 API Reference

All merchant-scoped endpoints require the `X-Merchant-ID: <UUID>` header.

| Method | Endpoint | Status | Description |
|---|---|:---:|---|
| `GET` | `/health` | Active | System health and database connectivity check |
| `GET` | `/api/dashboard` | Active | Aggregated merchant KPIs from live DB records |
| `GET` | `/api/analytics` | Active | Daily time-series metrics for failed vs. recovered volume |
| `GET` | `/api/recovery` | Active | Paginated list of recovery cases |
| `GET` | `/api/recovery/{id}` | Active | Recovery case details with transaction metadata |
| `POST`| `/api/recovery/{id}/analyze` | Stub (202) | Accepts analysis request (returns 202 deferred) |
| `POST`| `/api/recovery/{id}/recommend` | Stub (202) | Accepts recommendation request (returns 202 deferred) |
| `POST`| `/api/recovery/{id}/execute` | Stub (202) | Accepts execution request (returns 202 deferred) |
| `GET` | `/api/policies` | Active | List active merchant recovery policies |
| `POST`| `/api/policies/evaluate` | Active | Evaluate transaction against policy rules |
| `GET` | `/api/reviews` | Active | List pending manual review items |
| `POST`| `/api/reviews/{id}` | Active | Submit manual review decision (APPROVE / REJECT) |
| `POST`| `/api/simulations` | Active | Execute end-to-end sandbox recovery scenario |
| `GET` | `/api/audit` | Active | Append-only audit events filterable by case or correlation ID |
| `GET` | `/api/agents/status` | Active | Global telemetry and success rates for agent runs |
| `GET` | `/api/agents/activity` | Active | Recent agent runs from database |

---

## 📄 License

This project is open source under the [MIT License](LICENSE).
