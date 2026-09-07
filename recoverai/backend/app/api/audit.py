"""
RecoverAI v3.2 — Audit Routes

GET /api/audit       — list audit events (tenant-scoped, filterable)
GET /api/audit/{id}  — single audit event (tenant ownership enforced)

Audit events are immutable — no write endpoints exist.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Path, Query, status

from app.core.errors import NotFoundError
from app.core.merchant_context import MerchantContext, get_merchant_context, verify_merchant_ownership
from app.models.audit_event import AUDIT_EVENT_TYPES
from app.schemas.audit import AuditEventOut
from app.schemas.common import PaginatedResponse, PaginationParams, pagination_params

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/audit", tags=["audit"])

_VALID_EVENT_TYPES = ", ".join(sorted(AUDIT_EVENT_TYPES))


@router.get(
    "",
    summary="List audit events",
    description=(
        "Returns a paginated, append-only audit log for the authenticated merchant. \n\n"
        f"**Valid `event_type` values**: {_VALID_EVENT_TYPES}. \n\n"
        "Events are ordered by `timestamp` descending (newest first)."
    ),
    response_model=PaginatedResponse[AuditEventOut],
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Invalid X-Merchant-ID header or filter parameters."},
    },
)
async def list_audit_events(
    pagination: PaginationParams = Depends(pagination_params),
    event_type: str | None = Query(
        default=None,
        description=f"Filter by event type. Valid values: {_VALID_EVENT_TYPES}",
    ),
    correlation_id: str | None = Query(
        default=None,
        description="Filter by correlation_id to see all events for a single recovery case.",
    ),
    recovery_case_id: uuid.UUID | None = Query(
        default=None,
        description="Filter events linked to a specific recovery case.",
    ),
    transaction_id: uuid.UUID | None = Query(
        default=None,
        description="Filter events linked to a specific transaction.",
    ),
    timestamp_from: datetime | None = Query(
        default=None,
        description="Filter events after this timestamp.",
    ),
    timestamp_to: datetime | None = Query(
        default=None,
        description="Filter events before this timestamp.",
    ),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse[AuditEventOut]:
    """Returns a paginated list of audit events."""
    svc = AuditService(db)
    
    events, total = await svc.list_events(
        merchant_id=ctx.merchant_id,
        event_type=event_type,
        correlation_id=correlation_id,
        recovery_case_id=recovery_case_id,
        transaction_id=transaction_id,
        timestamp_from=timestamp_from,
        timestamp_to=timestamp_to,
        page=pagination.page,
        page_size=pagination.page_size
    )
    
    import math
    pages = math.ceil(total / pagination.page_size) if total > 0 else 1
    
    return PaginatedResponse[AuditEventOut](
        items=[AuditEventOut.model_validate(e, from_attributes=True) for e in events],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=pages,
    )


@router.get(
    "/{event_id}",
    summary="Get audit event by ID",
    description=(
        "Returns a single audit event record. "
        "Returns 403 if the event belongs to a different merchant."
    ),
    response_model=AuditEventOut,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Audit event not found."},
        403: {"description": "Event belongs to a different merchant."},
    },
)
async def get_audit_event(
    event_id: uuid.UUID = Path(description="AuditEvent UUID."),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db)
) -> AuditEventOut:
    """Returns a single audit event."""
    svc = AuditService(db)
    event = await svc.get_event(event_id, ctx.merchant_id)
    if not event:
        raise NotFoundError(f"Audit event {event_id} not found.")
    return AuditEventOut.model_validate(event, from_attributes=True)
