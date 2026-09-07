"""
RecoverAI v3.2 — Agent DTOs

Covers:
  GET /api/agents          → AgentRunOut (list)
  GET /api/agents/status   → AgentStatusResponse
  GET /api/agents/activity → AgentActivityResponse

Note: agent_runs is a global table (NOT tenant-scoped).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AgentRunOut(BaseModel):
    """Wire representation of an AgentRun record."""
    id: uuid.UUID
    agent_name: str
    agent_version: str
    input_reference: str | None = None
    output: dict[str, Any] | None = None
    status: str
    latency: float | None = Field(default=None, description="Execution latency in milliseconds.")
    timestamp: datetime

    model_config = {"from_attributes": True}


class AgentHealthItem(BaseModel):
    """Status summary for a single named agent."""
    agent_name: str
    last_run_status: str | None = None
    last_run_at: datetime | None = None
    total_runs: int = 0
    success_rate: float | None = Field(
        default=None, description="Success rate 0–1 over recent runs."
    )


class AgentStatusResponse(BaseModel):
    """Response for GET /api/agents/status."""
    agents: list[AgentHealthItem] = Field(
        default_factory=list,
        description="Per-agent health summary.",
    )
    message: str = Field(
        default="Agent status — stub response for Phase 3.",
    )


class AgentActivityResponse(BaseModel):
    """Response for GET /api/agents/activity — recent agent run log."""
    recent_runs: list[AgentRunOut] = Field(default_factory=list)
    total: int = 0
    message: str = Field(
        default="Agent activity — stub response for Phase 3.",
    )
