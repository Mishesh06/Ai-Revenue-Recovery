# Contributing to RecoverAI

Thank you for your interest in contributing to **RecoverAI**! RecoverAI is an open-source, enterprise-grade AI Revenue Recovery Operating System designed to intelligently diagnose and recover failed payments with deterministic policy safety.

This document provides guidelines and workflows for submitting issues, proposing features, and contributing code to the project.

---

## 🧭 Code of Conduct

All contributors and participants agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all members with respect and kindness.

---

## 🛠️ Development Workflow

### 1. Fork and Clone the Repository
```bash
git clone https://github.com/<your-username>/recoverai.git
cd recoverai
```

### 2. Environment Setup

#### Backend Setup
```bash
cd recoverai/backend
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Configure your PostgreSQL connection strings in .env

# Initialize database tables and seed demo data
python scripts/init_db.py
python scripts/seed_demo.py
```

#### Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env.local
```

### 3. Running Locally
- **Backend**: `uvicorn app.main:app --reload --port 8000` (from `recoverai/backend`)
- **Frontend**: `npm run dev` (from `recoverai/frontend`, opens at `http://localhost:3000`)
- **Or via Docker**: `docker compose up --build`

---

## 🧪 Testing Guidelines

We enforce high test coverage across all layers of RecoverAI:

- **Backend Test Suite (560+ tests)**:
  ```bash
  cd recoverai/backend
  source .venv/bin/activate
  pytest
  ```
- **ML Pipeline Tests**:
  ```bash
  cd recoverai/backend
  source .venv/bin/activate
  PYTHONPATH="../ml:." pytest ../ml/tests
  ```
- **Frontend Typecheck & Build**:
  ```bash
  cd recoverai/frontend
  npm run build
  ```

All pull requests must pass backend tests, ML tests, and frontend TypeScript build checks before merging.

---

## 📐 Architecture Conventions

1. **Deterministic Safety Guardrails**:
   - AI Agent suggestions (Diagnosis, Planning) must always be routed through the deterministic `PolicyEngine`.
   - Never dispatch actions directly to adapters from agent prompts without policy evaluation.

2. **Multi-Tenant Scoping**:
   - All tenant-scoped database entities must include `merchant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("merchants.id", ondelete="RESTRICT"))`.
   - All API endpoints operating on tenant data must validate and filter by the active merchant context (`X-Merchant-ID`).

3. **Strict Non-Colliding State Machines**:
   - `CaseState`, `ActionState`, and `AttemptState` are distinct state machines. Do not blend or reuse state enum values across different lifecycle stages.

4. **Deterministic Idempotency**:
   - All external execution calls must generate an `idempotency_key` stored with `UNIQUE` constraint in PostgreSQL to prevent duplicate gateway operations.

---

## 🌿 Branching & Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new features or capabilities
- `fix:` for bug fixes
- `docs:` for documentation updates
- `test:` for adding or fixing tests
- `refactor:` for code refactoring without behavior changes
- `chore:` for maintenance, dependencies, and tooling updates

Example:
```bash
git checkout -b feat/support-stripe-adapter
git commit -m "feat(adapter): add initial Stripe payment recovery adapter"
```

---

## 📬 Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against the `main` branch.
3. Complete the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
4. Ensure all CI checks pass.
5. Address any review feedback promptly.

---

Thank you for helping make revenue recovery smarter, safer, and automated!
