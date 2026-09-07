"""
RecoverAI v3.2 — Manual Review Routes

GET  /api/reviews       — list pending/completed reviews (tenant-scoped)
POST /api/reviews/{id}  — submit a human decision on a review (tenant ownership enforced)
"""

from __future__ import annotations

import uuid

import math
from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.merchant_context import MerchantContext, get_merchant_context, verify_merchant_ownership
from app.database.session import get_db
from app.models.manual_review import ManualReview
from app.schemas.common import PaginatedResponse, PaginationParams, pagination_params
from app.schemas.review import (
    ManualReviewDecisionRequest,
    ManualReviewDecisionResponse,
    ManualReviewOut,
)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get(
    "",
    summary="List manual reviews",
    description=(
        "Returns a paginated list of manual review records for the authenticated merchant. "
        "Optionally filter by `decision` to find pending (undecided) reviews."
    ),
    response_model=PaginatedResponse[ManualReviewOut],
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Invalid X-Merchant-ID header."},
    },
)
async def list_reviews(
    pagination: PaginationParams = Depends(pagination_params),
    decision: str | None = Query(
        default=None,
        description="Filter by decision value: APPROVED | REJECTED | ESCALATED | null (pending).",
    ),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ManualReviewOut]:
    """Returns paginated list of manual reviews."""
    stmt = select(ManualReview).where(ManualReview.merchant_id == ctx.merchant_id)
    count_stmt = select(func.count()).select_from(ManualReview).where(ManualReview.merchant_id == ctx.merchant_id)

    if decision is not None:
        if decision.lower() in ("null", "pending"):
            stmt = stmt.where(ManualReview.decision.is_(None))
            count_stmt = count_stmt.where(ManualReview.decision.is_(None))
        else:
            stmt = stmt.where(ManualReview.decision == decision)
            count_stmt = count_stmt.where(ManualReview.decision == decision)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(ManualReview.created_at.desc())
    stmt = stmt.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)

    res = await db.execute(stmt)
    reviews = res.scalars().all()

    pages = math.ceil(total / pagination.page_size) if total > 0 else 1

    return PaginatedResponse[ManualReviewOut](
        items=[ManualReviewOut.model_validate(r, from_attributes=True) for r in reviews],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=pages,
    )


@router.post(
    "/{review_id}",
    summary="Submit a review decision",
    description=(
        "Submits a human decision (APPROVED / REJECTED / ESCALATED) on a manual review record. "
        "Returns 403 if the review belongs to a different merchant. \n\n"
        "**Required fields**: `decision`, `reviewer`. `comment` is optional."
    ),
    response_model=ManualReviewDecisionResponse,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Review not found."},
        403: {"description": "Review belongs to a different merchant."},
        422: {"description": "Validation error in request body."},
    },
)
async def submit_review_decision(
    review_id: uuid.UUID = Path(description="ManualReview UUID."),
    body: ManualReviewDecisionRequest = ...,
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> ManualReviewDecisionResponse:
    """Submits a human review decision and records reviewer details."""
    stmt = select(ManualReview).where(ManualReview.id == review_id)
    res = await db.execute(stmt)
    review = res.scalar_one_or_none()

    if review is None:
        raise NotFoundError(f"Manual review {review_id} not found.")

    verify_merchant_ownership(review.merchant_id, ctx)

    review.decision = body.decision
    review.reviewer = body.reviewer
    if body.comment:
        review.comment = body.comment

    await db.commit()
    await db.refresh(review)

    return ManualReviewDecisionResponse(
        review_id=review.id,
        recovery_case_id=review.recovery_case_id,
        decision=review.decision or body.decision,
        reviewer=review.reviewer or body.reviewer,
        status="accepted",
        message=f"Review decision '{body.decision}' recorded successfully.",
    )
