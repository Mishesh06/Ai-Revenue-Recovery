"""
RecoverAI v3.2 — Analytics & Dashboard DTOs

Covers:
  GET /api/dashboard   → DashboardResponse
  GET /api/analytics   → AnalyticsResponse

Phase 3 stubs — all aggregation logic deferred to future phases.
Schemas define the intended contract so consumers can code against them today.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RecoverySummary(BaseModel):
    """High-level recovery funnel metrics."""
    total_cases: int = 0
    cases_recovered: int = 0
    cases_pending: int = 0
    cases_expired: int = 0
    recovery_rate: float = Field(default=0.0, description="Fraction of cases recovered (0–1).")
    intervention_success_rate: float = Field(default=0.0, description="Fraction of approved actions that succeeded (0-1).")

class FinancialSummary(BaseModel):
    """Financial recovery metrics."""
    total_failed_amount: float = Field(default=0.0, description="Sum of all failed transaction amounts.")
    total_recovered_amount: float = Field(default=0.0, description="Sum of successfully recovered amounts.")
    recoverable_revenue: float = Field(default=0.0, description="Revenue eligible for recovery.")
    revenue_at_risk: float = Field(default=0.0, description="Failed amount minus recovered amount.")
    recovery_cost: float = Field(default=0.0, description="Cost of recovery attempts.")
    avoided_loss: float = Field(default=0.0, description="Loss avoided due to recovery.")
    net_revenue_impact: float = Field(default=0.0, description="Net Revenue Impact = Recovered Revenue + Avoided Loss - Recovery Cost.")
    currency: str = Field(default="USD", description="ISO 4217 currency code.")

class AgentSummary(BaseModel):
    """Agent performance summary for the dashboard."""
    total_runs: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    avg_latency_ms: float | None = None

class RevenueLeakMap(BaseModel):
    """Cascade of revenue loss and recovery."""
    total_revenue: float = 0.0
    successful: float = 0.0
    failed: float = 0.0
    temporary_failure: float = 0.0
    expired_card: float = 0.0
    other_failure: float = 0.0
    recoverable: float = 0.0
    recovered: float = 0.0

class DashboardResponse(BaseModel):
    """
    Response for GET /api/dashboard.

    Aggregated summary for the authenticated merchant's dashboard.
    """
    merchant_id: str = Field(description="Merchant UUID as string.")
    recovery: RecoverySummary = Field(default_factory=RecoverySummary)
    financial: FinancialSummary = Field(default_factory=FinancialSummary)
    leak_map: RevenueLeakMap = Field(default_factory=RevenueLeakMap)
    agents: AgentSummary = Field(default_factory=AgentSummary)
    message: str = Field(
        default="Dashboard loaded successfully.",
    )


class AnalyticsTimeSeriesPoint(BaseModel):
    """One data point in a time-series chart."""
    date: str = Field(description="ISO 8601 date string (YYYY-MM-DD).")
    value: float


class AnalyticsResponse(BaseModel):
    """
    Response for GET /api/analytics.

    Provides time-series breakdowns for the authenticated merchant.
    """
    merchant_id: str
    recovery_rate_series: list[AnalyticsTimeSeriesPoint] = Field(
        default_factory=list,
        description="Daily recovery rate time-series.",
    )
    failed_amount_series: list[AnalyticsTimeSeriesPoint] = Field(
        default_factory=list,
        description="Daily failed transaction amount time-series.",
    )
    recovered_amount_series: list[AnalyticsTimeSeriesPoint] = Field(
        default_factory=list,
        description="Daily recovered amount time-series.",
    )
    message: str = Field(
        default="Analytics — stub response for Phase 3. Aggregation deferred.",
    )
