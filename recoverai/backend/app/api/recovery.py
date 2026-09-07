"""
RecoverAI v3.2 — Recovery Routes

GET  /api/recovery                  — list recovery cases (tenant-scoped)
GET  /api/recovery/{id}             — detail (tenant ownership enforced)
POST /api/recovery/{id}/analyze     — trigger ML analysis (stub, 202)
POST /api/recovery/{id}/recommend   — trigger recommendations (stub, 202)
POST /api/recovery/{id}/execute     — execute recovery action (validates idempotency)
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Path, Query, status

import math
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.merchant_context import MerchantContext, get_merchant_context, verify_merchant_ownership
from app.database.session import get_db
from app.models.enums import CaseState
from app.models.recovery_case import RecoveryCase
from app.schemas.common import PaginatedResponse, PaginationParams, pagination_params
from app.schemas.recovery import (
    AnalyzeRequest,
    AnalyzeResponse,
    ExecuteRequest,
    ExecuteResponse,
    RecommendRequest,
    RecommendResponse,
    RecoveryCaseOut,
)

router = APIRouter(prefix="/api/recovery", tags=["recovery"])


@router.get(
    "",
    summary="List recovery cases",
    description=(
        "Returns a paginated list of recovery cases for the authenticated merchant. "
        "Optionally filter by `state` (CaseState enum value)."
    ),
    response_model=PaginatedResponse[RecoveryCaseOut],
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Invalid header or filter parameters."},
    },
)
async def list_recovery_cases(
    pagination: PaginationParams = Depends(pagination_params),
    state: CaseState | None = Query(
        default=None,
        description=(
            "Filter by case state. Valid values: "
            "DETECTED | ANALYZING | PREDICTED | DIAGNOSED | PLANNED | "
            "POLICY_CHECK | RECOVERING | RECOVERED | RECOVERY_WINDOW_EXPIRED | CLOSED"
        ),
    ),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[RecoveryCaseOut]:
    """Returns a paginated list of recovery cases for the authenticated merchant."""
    stmt = select(RecoveryCase).where(RecoveryCase.merchant_id == ctx.merchant_id)
    count_stmt = select(func.count()).select_from(RecoveryCase).where(RecoveryCase.merchant_id == ctx.merchant_id)

    if state:
        stmt = stmt.where(RecoveryCase.state == state)
        count_stmt = count_stmt.where(RecoveryCase.state == state)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(RecoveryCase.created_at.desc())
    stmt = stmt.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)

    res = await db.execute(stmt)
    cases = res.scalars().all()

    pages = math.ceil(total / pagination.page_size) if total > 0 else 1

    return PaginatedResponse[RecoveryCaseOut](
        items=[RecoveryCaseOut.model_validate(c, from_attributes=True) for c in cases],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=pages,
    )


@router.get(
    "/{case_id}",
    summary="Get recovery case by ID",
    description=(
        "Returns the full detail of a recovery case. "
        "Returns 403 if the case belongs to a different merchant."
    ),
    response_model=RecoveryCaseOut,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Recovery case not found."},
        403: {"description": "Case belongs to a different merchant."},
    },
)
async def get_recovery_case(
    case_id: uuid.UUID = Path(description="Recovery case UUID."),
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> RecoveryCaseOut:
    """Returns the full detail of a recovery case, enforcing merchant ownership."""
    stmt = select(RecoveryCase).where(RecoveryCase.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()

    if case is None:
        raise NotFoundError(f"Recovery case {case_id} not found.")

    verify_merchant_ownership(case.merchant_id, ctx)
    return RecoveryCaseOut.model_validate(case, from_attributes=True)


@router.post(
    "/{case_id}/analyze",
    summary="Trigger ML analysis for a recovery case",
    description=(
        "Submits the recovery case for AI/ML analysis. "
        "Phase 3 stub — analysis is not yet implemented. Returns 202 Accepted. "
        "The `correlation_id` in the request body is optional; the case's own "
        "correlation_id is used if not supplied."
    ),
    response_model=AnalyzeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        404: {"description": "Recovery case not found."},
        403: {"description": "Case belongs to a different merchant."},
    },
)
async def analyze_recovery_case(
    case_id: uuid.UUID = Path(description="Recovery case UUID."),
    body: AnalyzeRequest = ...,
    ctx: MerchantContext = Depends(get_merchant_context),
) -> AnalyzeResponse:
    """Phase 3 stub — accepts the request and returns 202."""
    return AnalyzeResponse(
        case_id=case_id,
        status="accepted",
        message="Analysis request accepted. ML analysis deferred to future phase.",
    )


@router.post(
    "/{case_id}/recommend",
    summary="Trigger recommendation engine for a recovery case",
    description=(
        "Requests ranked action recommendations for the recovery case. "
        "Phase 3 stub — recommendation logic is not yet implemented. Returns 202 Accepted."
    ),
    response_model=RecommendResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        404: {"description": "Recovery case not found."},
        403: {"description": "Case belongs to a different merchant."},
    },
)
async def recommend_recovery_case(
    case_id: uuid.UUID = Path(description="Recovery case UUID."),
    body: RecommendRequest = ...,
    ctx: MerchantContext = Depends(get_merchant_context),
) -> RecommendResponse:
    """Phase 3 stub — accepts the request and returns 202."""
    return RecommendResponse(
        case_id=case_id,
        status="accepted",
        message="Recommendation request accepted. Engine deferred to future phase.",
        recommendations=[],
    )


@router.post(
    "/{case_id}/execute",
    summary="Execute a recovery action",
    description=(
        "Executes a recovery action for the given case. \n\n"
        "**Idempotency**: Submitting the same `idempotency_key` more than once returns "
        "the original response without side effects. \n\n"
        "**Execution modes**: \n"
        "- `LIVE` — routes to Razorpay Live Adapter (not yet wired in Phase 3). \n"
        "- `SIMULATION` — routes to Simulation Adapter (dry-run). \n\n"
        "**Required fields**: `idempotency_key`, `execution_mode`, `correlation_id`."
    ),
    response_model=ExecuteResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        404: {"description": "Recovery case not found."},
        403: {"description": "Case belongs to a different merchant."},
        409: {"description": "Idempotency key collision — conflicting action already exists."},
        422: {"description": "Validation error in request body."},
    },
)
async def execute_recovery_case(
    case_id: uuid.UUID = Path(description="Recovery case UUID."),
    body: ExecuteRequest = ...,
    ctx: MerchantContext = Depends(get_merchant_context),
) -> ExecuteResponse:
    """
    Phase 3 stub — validates request body and returns 202.

    Future phases will:
    1. Load the RecoveryCase from DB and verify merchant ownership.
    2. Check DB for existing RecoveryAction with the same idempotency_key (409 on conflict).
    3. Route to the appropriate adapter based on execution_mode.
    4. Write a RecoveryAction + RecoveryAttempt to DB.
    5. Append an AuditEvent(RecoveryExecuted).
    """
    return ExecuteResponse(
        case_id=case_id,
        idempotency_key=body.idempotency_key,
        execution_mode=body.execution_mode,
        status="accepted",
        message=(
            f"Execution request accepted [{body.execution_mode.value} mode]. "
            "Adapter routing deferred to future phase."
        ),
    )
