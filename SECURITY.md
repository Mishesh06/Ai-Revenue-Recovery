# Security Policy

RecoverAI handles critical financial transactions, payment recovery workflows, and multi-tenant billing data. We treat the security of our platform and user data with the highest priority.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.2.x   | :white_check_mark: |
| < 3.2   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability in RecoverAI, please do **NOT** create a public GitHub issue. Instead, please follow responsible disclosure guidelines:

1. **Email us**: Send a detailed report to the maintainers or create a private GitHub Security Advisory under the repository's **Security** tab.
2. **Details to include**:
   - Description of the vulnerability and its potential impact.
   - Exact steps or proof-of-concept (PoC) code to reproduce the issue.
   - Component affected (Backend FastAPI, Frontend, Adapter, Database, or ML pipeline).
   - Any suggested mitigations or patches.

### Response Timeline
- **Initial Response**: Within 48 hours of report submission.
- **Triage & Reproduction**: Within 5 business days.
- **Fix & Disclosure**: Coordinated release with patch release notes.

---

## Core Security Architecture

RecoverAI is built with defense-in-depth principles:

- **Strict Multi-Tenant Isolation**: Row-level merchant scoping prevents cross-tenant data leakage.
- **Deterministic Policy Safety**: AI outputs never execute directly without deterministic rule evaluation.
- **Idempotency Locks**: Cryptographic UUID keys on all write actions prevent duplicate financial charges.
- **Immutable Audit Trail**: Append-only audit logs track every state transition, agent run, and API execution.
- **Zero Raw Credential Storage**: Gateway secrets are injected via runtime environment variables and never logged or serialized to database models.
