# RecoverAI Source Directory

This directory contains the primary application services, pipelines, and frontend code for **RecoverAI v3.2**.

For the complete project overview, architecture diagrams, and quickstart guide, please see the [Main Project README](../README.md).

---

## Subdirectories

- **[`backend/`](backend/)**: FastAPI asynchronous backend application, SQLAlchemy 2.0 ORM models (21 tables), dual LLM agents (Diagnosis & Planning), deterministic policy engine, Razorpay/simulation adapters, and 560+ pytest integration tests.
- **[`frontend/`](frontend/)**: Next.js 15 App Router frontend with dark glassmorphic command center, interactive simulation scrubber, real-time decision stream, and human-in-the-loop review queues.
- **[`ml/`](ml/)**: Machine learning recovery scoring engine, dataset generators, model registry, and evaluation metrics.
