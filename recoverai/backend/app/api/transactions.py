"""
RecoverAI v3.2 — Transaction Routes

GET  /api/transactions       — list (paginated, tenant-scoped)
GET  /api/transactions/{id}  — detail (tenant ownership enforced)
"""

from __future__ import annotations

import math
import uuid

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.merchant_context import MerchantContext, get_merchant_context, verify_merchant_ownership
from app.database.session import get_db
from app.models.transaction import Transaction
from app.schemas.common import PaginatedResponse, PaginationParams, pagination_params
from app.schemas.transaction import TransactionOut

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get(
    "",
    summary="List transactions",
    description=(
        "Returns a paginated list of transactions scoped to the authenticated merchant. "
        "Only transactions whose `merchant_id` matches the `X-Merchant-ID` header are returned."
    ),
    response_model=PaginatedResponse[TransactionOut],
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Invalid X-Merchant-ID header or pagination parameters."},
    },
)
async def list_transactions(
    pagination: PaginationParams = Depends(pagination_params),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter by gateway status string (e.g. 'failed', 'captured').",
    ),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[TransactionOut]:
    """Returns a paginated list of transactions for the authenticated merchant."""
    stmt = select(Transaction).where(Transaction.merchant_id == ctx.merchant_id)
    count_stmt = select(func.count()).select_from(Transaction).where(Transaction.merchant_id == ctx.merchant_id)

    if status_filter:
        stmt = stmt.where(Transaction.status == status_filter)
        count_stmt = count_stmt.where(Transaction.status == status_filter)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Transaction.created_at.desc())
    stmt = stmt.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)

    res = await db.execute(stmt)
    txs = res.scalars().all()

    pages = math.ceil(total / pagination.page_size) if total > 0 else 1

    return PaginatedResponse[TransactionOut](
        items=[TransactionOut.model_validate(tx, from_attributes=True) for tx in txs],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=pages,
    )


@router.get(
    "/{transaction_id}",
    summary="Get transaction by ID",
    description=(
        "Returns the full detail of a single transaction. "
        "Returns 403 if the transaction does not belong to the authenticated merchant."
    ),
    response_model=TransactionOut,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Transaction not found."},
        403: {"description": "Transaction belongs to a different merchant."},
    },
)
async def get_transaction(
    transaction_id: uuid.UUID = Path(description="Transaction UUID."),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> TransactionOut:
    """Returns the full detail of a transaction, enforcing merchant ownership."""
    stmt = select(Transaction).where(Transaction.id == transaction_id)
    res = await db.execute(stmt)
    tx = res.scalar_one_or_none()

    if tx is None:
        raise NotFoundError(f"Transaction {transaction_id} not found.")

    verify_merchant_ownership(tx.merchant_id, ctx)
    return TransactionOut.model_validate(tx, from_attributes=True)
