"""
RecoverAI v3.2 — Audit Service

Append-only audit event writer.

Rules:
  - Every state transition MUST call write().
  - audit_events is immutable — no UPDATE or DELETE ever.
  - event_type MUST be in AUDIT_EVENT_TYPES (from models.audit_event).
  - timestamp is set by the DB server (server_default=func.now()).
  - correlation_id is always propagated from the RecoveryCase.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AUDIT_EVENT_TYPES, AuditEvent


class AuditService:
    """
    Writes immutable audit events.

    Usage::

        svc = AuditService(session)
        await svc.write(
            merchant_id=case.merchant_id,
            correlation_id=case.correlation_id,
            event_type="RecoveryPlanned",
            recovery_case_id=case.id,
        )

    The caller is responsible for committing the session.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def write(
        self,
        *,
        merchant_id: uuid.UUID,
        correlation_id: str,
        event_type: str,
        recovery_case_id: uuid.UUID | None = None,
        transaction_id: uuid.UUID | None = None,
        event_data: dict[str, Any] | None = None,
    ) -> AuditEvent:
        """
        Persist a single audit event.

        Args:
            merchant_id:       Tenant identifier.
            correlation_id:    Trace ID propagated from the RecoveryCase.
            event_type:        One of the canonical AUDIT_EVENT_TYPES.
            recovery_case_id:  Optional — link to the originating RecoveryCase.
            transaction_id:    Optional — link to the originating Transaction.
            event_data:        Optional — structured JSONB payload.

        Returns:
            The persisted AuditEvent ORM instance.

        Raises:
            ValueError: If event_type is not a canonical type.
        """
        if event_type not in AUDIT_EVENT_TYPES:
            raise ValueError(
                f"Unknown audit event type: {event_type!r}. "
                f"Must be one of: {sorted(AUDIT_EVENT_TYPES)}"
            )

        event = AuditEvent(
            merchant_id=merchant_id,
            correlation_id=correlation_id,
            recovery_case_id=recovery_case_id,
            transaction_id=transaction_id,
            event_type=event_type,
            event_data=event_data,
        )
        self._session.add(event)
        await self._session.flush()  # Assigns id + server-side timestamp
        return event

    async def list_events(
        self,
        merchant_id: uuid.UUID,
        event_type: str | None = None,
        correlation_id: str | None = None,
        recovery_case_id: uuid.UUID | None = None,
        transaction_id: uuid.UUID | None = None,
        timestamp_from: datetime | None = None,
        timestamp_to: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AuditEvent], int]:
        from sqlalchemy import select, func
        
        stmt = select(AuditEvent).where(AuditEvent.merchant_id == merchant_id)
        
        if event_type:
            stmt = stmt.where(AuditEvent.event_type == event_type)
        if correlation_id:
            stmt = stmt.where(AuditEvent.correlation_id == correlation_id)
        if recovery_case_id:
            stmt = stmt.where(AuditEvent.recovery_case_id == recovery_case_id)
        if transaction_id:
            stmt = stmt.where(AuditEvent.transaction_id == transaction_id)
        if timestamp_from:
            stmt = stmt.where(AuditEvent.timestamp >= timestamp_from)
        if timestamp_to:
            stmt = stmt.where(AuditEvent.timestamp <= timestamp_to)
            
        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = await self._session.scalar(count_stmt) or 0
        
        # Paginate
        stmt = stmt.order_by(AuditEvent.timestamp.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        
        res = await self._session.execute(stmt)
        return list(res.scalars().all()), total

    async def get_event(
        self,
        event_id: uuid.UUID,
        merchant_id: uuid.UUID
    ) -> AuditEvent | None:
        from sqlalchemy import select
        res = await self._session.execute(
            select(AuditEvent).where(
                AuditEvent.id == event_id,
                AuditEvent.merchant_id == merchant_id
            )
        )
        return res.scalar_one_or_none()
