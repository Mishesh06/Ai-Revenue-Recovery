"""
RecoverAI v3.2 — Merchant Context Abstraction

Provides a clean, injectable merchant context for all tenant-scoped endpoints.

Phase 3 implementation:
  Reads the `X-Merchant-ID` header to identify the current merchant.
  This header-based approach is a deliberate placeholder — the abstraction is
  designed so that swapping in JWT / OAuth token parsing in a future phase
  only requires changing `get_merchant_context()`, not every route.

Usage in route handlers::

    from app.core.merchant_context import MerchantContext, get_merchant_context

    @router.get("/api/recovery")
    async def list_recovery(ctx: MerchantContext = Depends(get_merchant_context)):
        ...

Tenant isolation rule::

    from app.core.merchant_context import verify_merchant_ownership
    verify_merchant_ownership(resource.merchant_id, ctx)
    # Raises ForbiddenError if IDs do not match
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Depends, Header

from app.core.errors import ForbiddenError, UnprocessableError


@dataclass(frozen=True, slots=True)
class MerchantContext:
    """
    Immutable snapshot of the authenticated merchant's identity.

    Attributes:
        merchant_id: The UUID of the current merchant (tenant identifier).
    """
    merchant_id: uuid.UUID


def get_merchant_context(
    x_merchant_id: str = Header(
        ...,
        alias="X-Merchant-ID",
        description=(
            "The UUID of the requesting merchant. "
            "Phase 3 placeholder — will be replaced by JWT token parsing "
            "in a future authentication phase."
        ),
        examples={"default": {"value": "550e8400-e29b-41d4-a716-446655440000"}},
    ),
) -> MerchantContext:
    """
    FastAPI dependency that extracts the current merchant context.

    Raises:
        422 Unprocessable Entity — if `X-Merchant-ID` is missing or not a valid UUID.
    """
    try:
        merchant_uuid = uuid.UUID(x_merchant_id)
    except (ValueError, AttributeError):
        raise UnprocessableError(
            f"X-Merchant-ID header must be a valid UUID v4. Got: {x_merchant_id!r}"
        )
    return MerchantContext(merchant_id=merchant_uuid)


def verify_merchant_ownership(
    resource_merchant_id: uuid.UUID,
    ctx: MerchantContext,
) -> None:
    """
    Assert that the given resource belongs to the current merchant context.

    Args:
        resource_merchant_id: The `merchant_id` stored on the resource.
        ctx: The active `MerchantContext` from `get_merchant_context()`.

    Raises:
        ForbiddenError: If `resource_merchant_id != ctx.merchant_id`.
    """
    if resource_merchant_id != ctx.merchant_id:
        raise ForbiddenError(
            "You do not have access to this resource."
        )
