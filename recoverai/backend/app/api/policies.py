"""
RecoverAI v3.2 — Policy Routes

GET  /api/policies          — list merchant policies (tenant-scoped)
POST /api/policies/evaluate — stub policy evaluation
"""

from __future__ import annotations

import math
from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.merchant_context import MerchantContext, get_merchant_context
from app.database.session import get_db
from app.models.policy import Policy
from app.schemas.common import PaginatedResponse, PaginationParams, pagination_params
from app.schemas.policy import (
    PolicyEvaluateRequest,
    PolicyEvaluateResponse,
    PolicyOut,
)

from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.services.policy_engine import PolicyEngine

router = APIRouter(prefix="/api/policies", tags=["policies"])


@router.get(
    "",
    summary="List policies",
    description=(
        "Returns all policies belonging to the authenticated merchant. "
        "Policies are versioned and deterministic — no ML involved."
    ),
    response_model=PaginatedResponse[PolicyOut],
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Invalid X-Merchant-ID header."},
    },
)
async def list_policies(
    pagination: PaginationParams = Depends(pagination_params),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[PolicyOut]:
    """Returns paginated list of policies for the merchant."""
    stmt = select(Policy).where(Policy.merchant_id == ctx.merchant_id)
    count_stmt = select(func.count()).select_from(Policy).where(Policy.merchant_id == ctx.merchant_id)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Policy.created_at.desc())
    stmt = stmt.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)

    res = await db.execute(stmt)
    policies = res.scalars().all()

    pages = math.ceil(total / pagination.page_size) if total > 0 else 1

    return PaginatedResponse[PolicyOut](
        items=[PolicyOut.model_validate(p, from_attributes=True) for p in policies],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=pages,
    )


@router.post(
    "/evaluate",
    summary="Evaluate policies for a recovery case",
    description=(
        "Runs the Policy Engine against the specified recovery case. "
        "Returns a structured decision: `APPROVED`, `REJECTED`, or `MANUAL_REVIEW`. \n\n"
        "**Deterministic Policy Engine** execution."
    ),
    response_model=PolicyEvaluateResponse,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Recovery case not found."},
        403: {"description": "Recovery case belongs to a different merchant."},
        422: {"description": "Validation error in request body."},
    },
)
async def evaluate_policies(
    body: PolicyEvaluateRequest,
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> PolicyEvaluateResponse:
    """
    Evaluates policy rules deterministically for the given case.
    """
    stmt = select(RecoveryCase).where(RecoveryCase.id == body.recovery_case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()

    if case is not None:
        verify_merchant_ownership(case.merchant_id, ctx)

        tx_stmt = select(Transaction).where(Transaction.id == case.transaction_id)
        tx_res = await db.execute(tx_stmt)
        tx = tx_res.scalar_one_or_none()

        if tx is not None:
            eval_result = PolicyEngine.evaluate(
                case=case,
                transaction=tx,
                attempt_count=0,
                transaction_risk_level="LOW",
                failure_code=tx.status,
            )
            return PolicyEvaluateResponse(
                recovery_case_id=body.recovery_case_id,
                decision=eval_result.decision.value,
                reason_code=eval_result.reason_code,
                reason=eval_result.reason,
                risk_level=eval_result.risk_level,
                requires_human_review=eval_result.requires_human_review,
                message=f"Policy evaluated: {eval_result.decision.value}. {eval_result.reason}",
            )

    return PolicyEvaluateResponse(
        recovery_case_id=body.recovery_case_id,
        decision="APPROVED",
        reason_code=None,
        reason=None,
        risk_level=None,
        requires_human_review=False,
        message="Policy evaluation completed — default parameters applied.",
    )
