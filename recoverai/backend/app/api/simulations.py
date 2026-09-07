"""
RecoverAI v3.2 — Simulation Routes

POST /api/simulations       — create a simulation run (tenant-scoped)
GET  /api/simulations/{id}  — get simulation result (tenant ownership enforced)
"""

from __future__ import annotations

import uuid

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Path, status

from app.core.errors import NotFoundError
from app.core.merchant_context import MerchantContext, get_merchant_context, verify_merchant_ownership
from app.database.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.simulator import SimulatorService
from app.schemas.simulation import (
    SimulationCreateRequest,
    SimulationCreateResponse,
    SimulationRunOut,
)

router = APIRouter(prefix="/api/simulations", tags=["simulations"])

@router.post(
    "",
    summary="Create a simulation run",
    description=(
        "Creates a new simulation run for the authenticated merchant. \n\n"
        "`execution_mode` must be `SIMULATION` for dry-run tests. \n\n"
        "Phase 3 stub — simulation execution is deferred. "
        "Returns a synthetic simulation_id with status `PENDING`."
    ),
    response_model=SimulationCreateResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        422: {"description": "Validation error in request body."},
    },
)
async def create_simulation(
    body: SimulationCreateRequest,
    ctx: MerchantContext = Depends(get_merchant_context),
    db: AsyncSession = Depends(get_db)
) -> SimulationCreateResponse:
    """
    Creates a simulation run synchronously using the active merchant.
    """
    # Run the simulation inside greenlet context via db.run_sync
    result = await db.run_sync(
        SimulatorService.run_scenario,
        merchant_id=ctx.merchant_id,
        scenario=body.scenario,
        sample_size=1,
        configuration=body.configuration,
    )
    
    return SimulationCreateResponse(
        simulation_id=result["simulation_id"],
        scenario=result["scenario"],
        execution_mode=body.execution_mode,
        status="COMPLETED",
        message=f"Simulation complete. Generated case {result['generated_cases'][0]}",
        metrics=result["metrics"],
        generated_cases=result["generated_cases"]
    )


@router.get(
    "/{simulation_id}",
    summary="Get simulation run by ID",
    description=(
        "Returns the simulation run and its results. "
        "Returns 403 if the simulation belongs to a different merchant."
    ),
    response_model=SimulationRunOut,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Simulation run not found."},
        403: {"description": "Simulation belongs to a different merchant."},
    },
)
async def get_simulation(
    simulation_id: uuid.UUID = Path(description="SimulationRun UUID."),
    ctx: MerchantContext = Depends(get_merchant_context),
) -> SimulationRunOut:
    """Phase 3 stub — raises 404."""
    raise NotFoundError(f"Simulation run {simulation_id} not found.")
