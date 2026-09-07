"""
RecoverAI v3.2 — Demo Data Seed Script

Seeds realistic demo data for the frontend to display.
"""
import asyncio
import uuid
import json
from datetime import datetime, timedelta, timezone
import random

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

import app.models  # noqa: F401
from app.core.config import settings

MERCHANT_ID = uuid.UUID("aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa")
MERCHANT_NAME = "Acme Payments Pvt Ltd"

FAILURE_TYPES = [
    "temporary_failure", "temporary_failure", "temporary_failure",
    "insufficient_funds", "insufficient_funds",
    "network_error", "network_error",
    "card_declined", "expired_card", "fraud_suspected",
]

CASE_STATES = [
    "CLOSED", "CLOSED", "CLOSED", "CLOSED",
    "RECOVERING", "RECOVERING",
    "DETECTED", "ANALYZING",
    "RECOVERY_WINDOW_EXPIRED",
]


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    rng = random.Random(42)

    async with Session() as db:
        # Merchant
        await db.execute(text(
            "INSERT INTO merchants (id, name, is_active, created_at, updated_at)"
            " VALUES (:id, :name, true, now(), now()) ON CONFLICT (id) DO NOTHING"
        ), {"id": str(MERCHANT_ID), "name": MERCHANT_NAME})
        await db.commit()

        print("Seeding 40 transactions…")
        for i in range(40):
            tx_id = uuid.uuid4()
            case_id = uuid.uuid4()
            action_id = uuid.uuid4()
            cust_id = uuid.uuid4()
            amount = round(rng.uniform(200, 15000), 2)
            status = rng.choice(FAILURE_TYPES)
            case_state = rng.choice(CASE_STATES)
            corr_id = f"corr-{uuid.uuid4().hex[:12]}"
            confidence = round(rng.uniform(0.55, 0.97), 2)
            created_at = datetime.now(timezone.utc) - timedelta(days=rng.randint(1, 30))
            window_end = created_at + timedelta(days=7)
            recovered_at = (
                created_at + timedelta(hours=rng.randint(1, 48))
                if case_state == "CLOSED" else None
            )

            # Customer
            await db.execute(text(
                "INSERT INTO customers (id, merchant_id, email, created_at, updated_at)"
                " VALUES (:id, :mid, :email, :cat, :cat) ON CONFLICT DO NOTHING"
            ), {"id": str(cust_id), "mid": str(MERCHANT_ID),
                "email": f"user{i}@example.com", "cat": created_at})

            # Transaction
            await db.execute(text(
                "INSERT INTO transactions"
                " (id, merchant_id, customer_id, amount, currency, status, created_at, updated_at)"
                " VALUES (:id, :mid, :cid, :amt, 'INR', :status, :cat, :cat)"
                " ON CONFLICT DO NOTHING"
            ), {"id": str(tx_id), "mid": str(MERCHANT_ID), "cid": str(cust_id),
                "amt": amount, "status": status, "cat": created_at})

            # Recovery Case
            await db.execute(text(
                "INSERT INTO recovery_cases"
                " (id, merchant_id, transaction_id, state, correlation_id, confidence,"
                "  recovery_window_started_at, recovery_window_ends_at, recovered_at,"
                "  created_at, updated_at)"
                " VALUES (:id, :mid, :tid, :state, :corr, :conf,"
                "  :wstart, :wend, :rat, :cat, :cat)"
                " ON CONFLICT DO NOTHING"
            ), {"id": str(case_id), "mid": str(MERCHANT_ID), "tid": str(tx_id),
                "state": case_state, "corr": corr_id, "conf": confidence,
                "wstart": created_at, "wend": window_end, "rat": recovered_at,
                "cat": created_at})

            # Recovery Action
            action_state = (
                "SUCCEEDED" if case_state == "CLOSED" else
                "FAILED" if case_state == "RECOVERY_WINDOW_EXPIRED" else
                "PROPOSED"
            )
            await db.execute(text(
                "INSERT INTO recovery_actions"
                " (id, merchant_id, recovery_case_id, action_id, state,"
                "  execution_mode, idempotency_key, created_at, updated_at)"
                " VALUES (:id, :mid, :cid, 'RETRY_PAYMENT', :state,"
                "  'SIMULATION', :ikey, :cat, :cat)"
                " ON CONFLICT DO NOTHING"
            ), {"id": str(action_id), "mid": str(MERCHANT_ID), "cid": str(case_id),
                "state": action_state,
                "ikey": f"{MERCHANT_ID}:{case_id}:RETRY_PAYMENT",
                "cat": created_at})

            # Audit Events
            for event_type, offset in [("OpportunityDetected", 1), ("RecoveryPlanned", 5), ("PolicyEvaluated", 10)]:
                await db.execute(text(
                    "INSERT INTO audit_events"
                    " (id, merchant_id, recovery_case_id, transaction_id, correlation_id,"
                    "  event_type, event_data, timestamp)"
                    " VALUES (:id, :mid, :cid, :tid, :corr, :etype, CAST(:edata AS jsonb), :ts)"
                    " ON CONFLICT DO NOTHING"
                ), {"id": str(uuid.uuid4()), "mid": str(MERCHANT_ID),
                    "cid": str(case_id), "tid": str(tx_id), "corr": corr_id,
                    "etype": event_type,
                    "edata": json.dumps({"source": "seed", "i": i}),
                    "ts": created_at + timedelta(minutes=offset)})

            if case_state == "CLOSED" and recovered_at:
                await db.execute(text(
                    "INSERT INTO audit_events"
                    " (id, merchant_id, recovery_case_id, transaction_id, correlation_id,"
                    "  event_type, event_data, timestamp)"
                    " VALUES (:id, :mid, :cid, :tid, :corr, 'RecoverySucceeded', CAST(:edata AS jsonb), :ts)"
                    " ON CONFLICT DO NOTHING"
                ), {"id": str(uuid.uuid4()), "mid": str(MERCHANT_ID),
                    "cid": str(case_id), "tid": str(tx_id), "corr": corr_id,
                    "edata": json.dumps({"outcome": "SUCCESS"}),
                    "ts": recovered_at})

        await db.commit()
        print(f"✅ Done! 40 records seeded.")
        print(f"\n🔑 Merchant ID: {MERCHANT_ID}")
        print(f"   Use this as the X-Merchant-ID header in all API calls.\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
