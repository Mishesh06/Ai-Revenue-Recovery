"""
RecoverAI v3.2 — Simulation DTOs

Covers:
  POST /api/simulations       → SimulationCreateRequest / SimulationCreateResponse
  GET  /api/simulations/{id}  → SimulationRunOut (with results)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import ExecutionMode


class SimulationResultOut(BaseModel):
    """Wire representation of a SimulationResult record."""
    id: uuid.UUID
    simulation_run_id: uuid.UUID
    metric_name: str
    metric_value: float | None = None
    metric_data: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SimulationRunOut(BaseModel):
    """Wire representation of a SimulationRun record (with embedded results)."""
    id: uuid.UUID
    merchant_id: uuid.UUID
    scenario: str
    execution_mode: ExecutionMode
    started_at: datetime | None = None
    completed_at: datetime | None = None
    status: str
    configuration: dict[str, Any] | None = None
    results: list[SimulationResultOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SimulationCreateRequest(BaseModel):
    """
    Request body for POST /api/simulations.

    Phase 3 stub — actual simulation execution deferred to future phase.
    """
    scenario: str = Field(
        description="Named scenario to simulate (e.g. 'RETRY_PAYMENT_3X', 'SEND_LINK').",
        min_length=1,
        max_length=255,
    )
    execution_mode: ExecutionMode = Field(
        default=ExecutionMode.SIMULATION,
        description="Must be SIMULATION for dry-run simulations.",
    )
    configuration: dict[str, Any] | None = Field(
        default=None,
        description="Optional scenario-specific configuration parameters.",
    )


class SimulationCreateResponse(BaseModel):
    """201 Created response for POST /api/simulations."""
    simulation_id: uuid.UUID
    scenario: str
    execution_mode: ExecutionMode
    status: str = Field(examples=["PENDING"])
    message: str
    metrics: dict[str, Any] | None = None
    generated_cases: list[str] = Field(default_factory=list)
