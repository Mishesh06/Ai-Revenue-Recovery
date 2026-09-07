"""
RecoverAI v3.2 — Common Schema Primitives

Shared building blocks reused across all domain schemas:
  - UUIDStr          : UUID serialised as a lowercase string
  - PaginationParams : query-string pagination with sane defaults
  - PaginatedResponse: generic paginated envelope
  - CorrelationID    : validated correlation_id type alias
"""

from __future__ import annotations

import math
import uuid
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

T = TypeVar("T")


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginationParams(BaseModel):
    """
    Standard query-string pagination parameters.

    Inject via ``Depends(pagination_params)`` helper below.
    """
    page: int = Field(default=1, ge=1, description="1-based page number.")
    page_size: int = Field(default=20, ge=1, le=200, description="Items per page (max 200).")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def pagination_params(
    page: int = Query(default=1, ge=1, description="1-based page number."),
    page_size: int = Query(default=20, ge=1, le=200, description="Items per page (max 200)."),
) -> PaginationParams:
    """FastAPI dependency that parses pagination query parameters."""
    return PaginationParams(page=page, page_size=page_size)


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response envelope.

    Example::

        {
          "items": [...],
          "total": 142,
          "page": 1,
          "page_size": 20,
          "pages": 8
        }
    """
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def build(
        cls,
        items: list[T],
        total: int,
        pagination: PaginationParams,
    ) -> "PaginatedResponse[T]":
        pages = max(1, math.ceil(total / pagination.page_size))
        return cls(
            items=items,
            total=total,
            page=pagination.page,
            page_size=pagination.page_size,
            pages=pages,
        )
