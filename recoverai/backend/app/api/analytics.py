"""
RecoverAI v3.2 — Analytics & Dashboard Routes

GET /api/dashboard  — merchant dashboard summary (tenant-scoped)
GET /api/analytics  — time-series analytics (tenant-scoped)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.merchant_context import MerchantContext, get_merchant_context
from sqlalchemy import Date, cast, func, select
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.enums import CaseState
from app.schemas.analytics import AnalyticsResponse, AnalyticsTimeSeriesPoint, DashboardResponse
from app.services.analytics_service import AnalyticsService
from app.database.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get(
    "/dashboard",
    summary="Merchant dashboard summary",
    description=(
        "Returns aggregated KPI summary for the authenticated merchant: "
        "recovery funnel metrics, financial summary, and agent performance."
    ),
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Invalid X-Merchant-ID header."},
    },
)
async def get_dashboard(
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db)
) -> DashboardResponse:
    """Returns dynamically aggregated dashboard metrics."""
    return await AnalyticsService.get_dashboard_metrics(db, ctx.merchant_id)


@router.get(
    "/analytics",
    summary="Merchant analytics time-series",
    description=(
        "Returns time-series data for recovery rate, failed amounts, and recovered amounts "
        "for the authenticated merchant."
    ),
    response_model=AnalyticsResponse,
    status_code=status.HTTP_200_OK,
    responses={
        422: {"description": "Invalid X-Merchant-ID header."},
    },
)
async def get_analytics(
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsResponse:
    """Aggregates real daily time-series from transactions and recovery cases."""
    failed_res = await db.execute(
        select(
            cast(Transaction.created_at, Date).label("d"),
            func.sum(Transaction.amount).label("failed_amt"),
            func.count(Transaction.id).label("failed_count"),
        )
        .where(Transaction.merchant_id == ctx.merchant_id)
        .group_by("d")
        .order_by("d")
    )
    failed_data = {str(r.d): (float(r.failed_amt or 0), r.failed_count) for r in failed_res.all()}

    recovered_res = await db.execute(
        select(
            cast(RecoveryCase.created_at, Date).label("d"),
            func.sum(Transaction.amount).label("recovered_amt"),
            func.count(RecoveryCase.id).label("recovered_count"),
        )
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .where(
            RecoveryCase.merchant_id == ctx.merchant_id,
            RecoveryCase.state.in_([CaseState.CLOSED, CaseState.RECOVERED]),
        )
        .group_by("d")
        .order_by("d")
    )
    recovered_data = {str(r.d): (float(r.recovered_amt or 0), r.recovered_count) for r in recovered_res.all()}

    all_dates = sorted(set(failed_data.keys()) | set(recovered_data.keys()))
    failed_series: list[AnalyticsTimeSeriesPoint] = []
    recovered_series: list[AnalyticsTimeSeriesPoint] = []
    rate_series: list[AnalyticsTimeSeriesPoint] = []

    for d in all_dates:
        f_amt, f_cnt = failed_data.get(d, (0.0, 0))
        r_amt, r_cnt = recovered_data.get(d, (0.0, 0))
        failed_series.append(AnalyticsTimeSeriesPoint(date=d, value=round(f_amt, 2)))
        recovered_series.append(AnalyticsTimeSeriesPoint(date=d, value=round(r_amt, 2)))
        rate = round((r_cnt / f_cnt) * 100, 1) if f_cnt > 0 else 0.0
        rate_series.append(AnalyticsTimeSeriesPoint(date=d, value=rate))

    return AnalyticsResponse(
        merchant_id=str(ctx.merchant_id),
        recovery_rate_series=rate_series,
        failed_amount_series=failed_series,
        recovered_amount_series=recovered_series,
        message="Merchant time-series analytics loaded.",
    )
