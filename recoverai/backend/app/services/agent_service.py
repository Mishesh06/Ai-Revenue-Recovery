"""
RecoverAI v3.2 — Agent Service

Orchestrates the AI Diagnosis and Recovery Planner reasoning agents.
Integrates with configurable LLM providers (Mock, OpenAI, Gemini) with
strict Pydantic validation, PII-scrubbed prompts, and deterministic rule-based fallbacks.
"""

from __future__ import annotations

import json
import time
from typing import Any, Callable, Type, TypeVar
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.agents import DiagnosisOutput, RecoveryPlanOutput
from app.services.llm.base import LLMError, LLMTimeoutError, LLMUnavailableError, LLMValidationError
from app.services.llm.factory import get_llm_client
from app.services.llm.prompt_builder import build_diagnosis_prompt, build_planner_prompt

T = TypeVar("T", bound=BaseModel)


class AgentService:

    @classmethod
    def _execute_agent_with_fallback(
        cls,
        db: Session,
        agent_name: str,
        input_reference: str,
        prompt: str,
        agent_type: str,
        schema_model: Type[T],
        fallback_func: Callable[[], T],
    ) -> T:
        """
        Executes an LLM call via the configured provider, validates output,
        and gracefully falls back on any failure. Records execution telemetry in the database.
        """
        start_time = time.time()
        llm_client = get_llm_client()
        agent_version = "LLM" if llm_client.provider_name == "mock" else f"LLM:{llm_client.model_name}"
        status = "SUCCESS"
        output_data: dict[str, Any] | None = None

        try:
            # 1. Call LLM with schema guidance
            raw_response = llm_client.generate_json(prompt, agent_type, schema_model=schema_model)

            # 2. Parse JSON
            try:
                parsed_json = json.loads(raw_response)
            except (json.JSONDecodeError, TypeError) as e:
                raise LLMValidationError(f"LLM returned malformed JSON: {e}") from e

            # 3. Validate with Pydantic
            validated_output = schema_model.model_validate(parsed_json)
            output_data = validated_output.model_dump()

        except (LLMTimeoutError, LLMUnavailableError, LLMValidationError, LLMError, ValueError, ValidationError) as e:
            # 4. Activate deterministic rule-based fallback on ANY failure
            agent_version = "RULE_BASED_FALLBACK"
            status = f"FALLBACK_ACTIVATED ({type(e).__name__})"

            validated_output = fallback_func()
            output_data = validated_output.model_dump()

        latency_ms = (time.time() - start_time) * 1000

        # 5. Record execution in DB
        agent_run = AgentRun(
            agent_name=agent_name,
            agent_version=agent_version,
            input_reference=input_reference,
            output=output_data,
            status=status,
            latency=latency_ms,
        )
        db.add(agent_run)
        db.commit()
        db.refresh(agent_run)

        return validated_output

    @classmethod
    def diagnose_failure(
        cls, db: Session, case: RecoveryCase, transaction: Transaction
    ) -> DiagnosisOutput:
        """Agent 1: Diagnosis Agent"""
        prompt = build_diagnosis_prompt(case, transaction)

        def fallback() -> DiagnosisOutput:
            # Rule-based fallback for diagnosis
            t_status = (transaction.status or "").lower()
            if t_status in ["stolen_card", "fraud_suspected", "lost_card"]:
                cat = "FRAUD_RISK"
            elif t_status == "account_closed":
                cat = "ACCOUNT_CLOSED"
            elif t_status == "temporary_failure":
                cat = "TEMPORARY_FAILURE"
            elif t_status == "network_error":
                cat = "NETWORK_ERROR"
            elif t_status == "insufficient_funds":
                cat = "INSUFFICIENT_FUNDS"
            elif t_status == "expired_card":
                cat = "EXPIRED_CARD"
            elif t_status == "card_declined":
                cat = "CARD_DECLINED"
            else:
                cat = "UNKNOWN_FAILURE"

            return DiagnosisOutput(
                failure_category=cat,
                confidence=1.0,
                evidence=["Rule-based fallback activated", f"Transaction status: {transaction.status}"],
            )

        return cls._execute_agent_with_fallback(
            db=db,
            agent_name="DiagnosisAgent",
            input_reference=f"case:{case.id}",
            prompt=prompt,
            agent_type="diagnosis",
            schema_model=DiagnosisOutput,
            fallback_func=fallback,
        )

    @classmethod
    def plan_recovery(
        cls,
        db: Session,
        diagnosis: DiagnosisOutput,
        case: RecoveryCase,
        transaction: Transaction | None = None,
    ) -> RecoveryPlanOutput:
        """Agent 2: Recovery Planner Agent"""
        prompt = build_planner_prompt(diagnosis, case, transaction)

        def fallback() -> RecoveryPlanOutput:
            # Rule-based fallback for planning
            cat = diagnosis.failure_category
            if cat in ["FRAUD_RISK", "ACCOUNT_CLOSED", "UNKNOWN_FAILURE"]:
                action = "MANUAL_REVIEW"
                priority = "HIGH"
            elif cat in ["TEMPORARY_FAILURE", "NETWORK_ERROR"]:
                action = "RETRY_PAYMENT"
                priority = "HIGH"
            elif cat == "INSUFFICIENT_FUNDS":
                action = "SEND_PAYMENT_LINK"
                priority = "MEDIUM"
            elif cat in ["EXPIRED_CARD", "CARD_DECLINED"]:
                action = "REQUEST_CUSTOMER_ACTION"
                priority = "MEDIUM"
            else:
                action = "MANUAL_REVIEW"
                priority = "HIGH"

            return RecoveryPlanOutput(
                recommended_action=action,
                priority=priority,
                reason_code=f"FALLBACK_{action}",
                confidence=1.0,
            )

        return cls._execute_agent_with_fallback(
            db=db,
            agent_name="RecoveryPlannerAgent",
            input_reference=f"case:{case.id}",
            prompt=prompt,
            agent_type="planner",
            schema_model=RecoveryPlanOutput,
            fallback_func=fallback,
        )
