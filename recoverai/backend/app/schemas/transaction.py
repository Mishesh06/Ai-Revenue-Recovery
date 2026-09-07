"""
RecoverAI v3.2 — Transaction DTOs

Never expose SQLAlchemy ORM models directly.
All API responses use these Pydantic schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class TransactionOut(BaseModel):
    """
    Wire representation of a Transaction record.

    Tenant-scoped: always scoped to the authenticated merchant.
    """
    id: uuid.UUID = Field(description="Transaction UUID primary key.")
    merchant_id: uuid.UUID = Field(description="Owning merchant UUID.")
    customer_id: uuid.UUID | None = Field(default=None, description="Associated customer UUID (nullable).")
    external_transaction_id: str | None = Field(
        default=None,
        description="Payment gateway transaction identifier.",
    )
    amount: float = Field(description="Transaction amount.")
    currency: str = Field(description="ISO 4217 currency code (e.g. INR).", examples=["INR"])
    status: str | None = Field(default=None, description="Raw gateway status string.")
    payment_method: str | None = Field(default=None, description="Payment method used (e.g. UPI, CARD).")
    failed_at: datetime | None = Field(default=None, description="Timestamp of payment failure (UTC).")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Record last-updated timestamp (UTC).")

    model_config = {"from_attributes": True}
