"""
RecoverAI v3.2 — Phase 7: AI Agent Schemas

Pydantic models for strict validation of LLM outputs.
Invalid output must never reach the Policy Engine.
"""

from typing import List
from pydantic import BaseModel, Field

class DiagnosisOutput(BaseModel):
    """Schema for Agent 1 - Diagnosis."""
    failure_category: str = Field(
        ...,
        description="The categorized type of failure, e.g. TEMPORARY_FAILURE, HARD_DECLINE."
    )
    confidence: float = Field(
        ...,
        description="Confidence score between 0.0 and 1.0."
    )
    evidence: List[str] = Field(
        ...,
        description="List of contextual evidence points used to make the diagnosis."
    )


class RecoveryPlanOutput(BaseModel):
    """Schema for Agent 2 - Recovery Planner."""
    recommended_action: str = Field(
        ...,
        description="The proposed recovery action, e.g. RETRY_PAYMENT, MANUAL_REVIEW."
    )
    priority: str = Field(
        ...,
        description="Priority of the action, e.g. HIGH, MEDIUM, LOW."
    )
    reason_code: str = Field(
        ...,
        description="Short machine-readable reason code."
    )
    confidence: float = Field(
        ...,
        description="Confidence score between 0.0 and 1.0."
    )
