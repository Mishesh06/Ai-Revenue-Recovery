"""
RecoverAI v3.2 — Agent Routes

GET /api/agents          — list all recent agent runs (global, not tenant-scoped)
GET /api/agents/status   — per-agent health summary
GET /api/agents/activity — recent activity log

Note: agent_runs is a GLOBAL table — no merchant ownership check.
"""

from __future__ import annotations

import math
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.agent_run import AgentRun
from app.schemas.agent import AgentActivityResponse, AgentHealthItem, AgentRunOut, AgentStatusResponse
from app.schemas.common import PaginatedResponse, PaginationParams, pagination_params

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get(
    "",
    summary="List agent runs",
    description=(
        "Returns a paginated list of all AI agent runs across the system. "
        "This endpoint is **not tenant-scoped** — agent_runs is a global table. "
        "Future authentication phases may add role-based access control here."
    ),
    response_model=PaginatedResponse[AgentRunOut],
    status_code=status.HTTP_200_OK,
)
async def list_agent_runs(
    pagination: PaginationParams = Depends(pagination_params),
    agent_name: str | None = Query(
        default=None,
        description="Filter runs by agent name.",
    ),
    run_status: str | None = Query(
        default=None,
        alias="status",
        description="Filter by run status (e.g. 'SUCCEEDED', 'FAILED').",
    ),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[AgentRunOut]:
    """Returns a paginated list of agent runs."""
    stmt = select(AgentRun)
    count_stmt = select(func.count()).select_from(AgentRun)

    if agent_name:
        stmt = stmt.where(AgentRun.agent_name == agent_name)
        count_stmt = count_stmt.where(AgentRun.agent_name == agent_name)
    if run_status:
        stmt = stmt.where(AgentRun.status == run_status)
        count_stmt = count_stmt.where(AgentRun.status == run_status)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(AgentRun.timestamp.desc())
    stmt = stmt.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)

    res = await db.execute(stmt)
    runs = res.scalars().all()

    pages = math.ceil(total / pagination.page_size) if total > 0 else 1

    return PaginatedResponse[AgentRunOut](
        items=[AgentRunOut.model_validate(r, from_attributes=True) for r in runs],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        pages=pages,
    )


@router.get(
    "/status",
    summary="Agent health status",
    description=(
        "Returns a health summary per named agent, including last run status, "
        "last run timestamp, and recent success rate."
    ),
    response_model=AgentStatusResponse,
    status_code=status.HTTP_200_OK,
)
async def get_agent_status(
    db: AsyncSession = Depends(get_db),
) -> AgentStatusResponse:
    """Returns health summary per agent."""
    stmt = select(
        AgentRun.agent_name,
        func.count().label("total_runs"),
        func.count().filter(AgentRun.status.in_(["SUCCESS", "SUCCEEDED"])).label("success_runs"),
        func.max(AgentRun.timestamp).label("last_run_at"),
    ).group_by(AgentRun.agent_name)

    res = await db.execute(stmt)
    rows = res.all()

    agents: list[AgentHealthItem] = []
    for r in rows:
        latest_res = await db.execute(
            select(AgentRun.status)
            .where(AgentRun.agent_name == r.agent_name)
            .order_by(AgentRun.timestamp.desc())
            .limit(1)
        )
        latest_status = latest_res.scalar_one_or_none()
        rate = round(r.success_runs / r.total_runs, 2) if r.total_runs > 0 else None

        agents.append(
            AgentHealthItem(
                agent_name=r.agent_name,
                last_run_status=latest_status,
                last_run_at=r.last_run_at,
                total_runs=r.total_runs,
                success_rate=rate,
            )
        )

    return AgentStatusResponse(
        agents=agents,
        message="Active multi-agent execution telemetry.",
    )


@router.get(
    "/activity",
    summary="Recent agent activity",
    description=(
        "Returns the most recent agent runs in reverse-chronological order."
    ),
    response_model=AgentActivityResponse,
    status_code=status.HTTP_200_OK,
)
async def get_agent_activity(
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of recent runs to return."),
    db: AsyncSession = Depends(get_db),
) -> AgentActivityResponse:
    """Returns recent agent runs in reverse-chronological order."""
    count_res = await db.execute(select(func.count()).select_from(AgentRun))
    total = count_res.scalar() or 0

    res = await db.execute(select(AgentRun).order_by(AgentRun.timestamp.desc()).limit(limit))
    runs = res.scalars().all()

    return AgentActivityResponse(
        recent_runs=[AgentRunOut.model_validate(r, from_attributes=True) for r in runs],
        total=total,
        message="Recent multi-agent system activity.",
    )
