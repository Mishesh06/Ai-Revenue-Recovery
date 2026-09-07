"""
RecoverAI v3.2 — Agent Service

Orchestrates the AI Diagnosis and Recovery Planner agents.
Validates LLM output with Pydantic and activates rule-based fallbacks on failure.
"""
import time
import json
from typing import Type, TypeVar, Callable, Any
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.agents import DiagnosisOutput, RecoveryPlanOutput
from app.services.llm_client import llm_client, LLMTimeoutError, LLMUnavailableError

T = TypeVar('T', bound=BaseModel)

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
        fallback_func: Callable[[], T]
    ) -> T:
        """
        Executes an LLM call, validates output, and gracefully falls back on any failure.
        Records the run to the database.
        """
        start_time = time.time()
        agent_version = "LLM"
        status = "SUCCESS"
        output_data = None
        
        try:
            # 1. Call LLM
            raw_response = llm_client.generate_json(prompt, agent_type)
            
            # 2. Parse JSON
            try:
                parsed_json = json.loads(raw_response)
            except json.JSONDecodeError:
                raise ValueError("LLM returned malformed JSON")
                
            # 3. Validate with Pydantic
            validated_output = schema_model.model_validate(parsed_json)
            output_data = validated_output.model_dump()
            
        except (LLMTimeoutError, LLMUnavailableError, ValueError, ValidationError) as e:
            # Activate fallback on any failure
            agent_version = "RULE_BASED_FALLBACK"
            status = f"FALLBACK_ACTIVATED ({type(e).__name__})"
            
            # 4. Execute deterministic fallback
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
            latency=latency_ms
        )
        db.add(agent_run)
        db.commit()
        db.refresh(agent_run)
        
        return validated_output

    @classmethod
    def diagnose_failure(
        cls, db: Session, case: RecoveryCase, transaction: Transaction
    ) -> DiagnosisOutput:
        """Agent 1: Diagnosis"""
        prompt = f"Diagnose failure for case {case.id} and transaction {transaction.id}"
        
        def fallback() -> DiagnosisOutput:
            # Rule-based fallback for diagnosis
            t_status = transaction.status.lower()
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
                evidence=["Rule-based fallback activated", f"Transaction status: {transaction.status}"]
            )
            
        return cls._execute_agent_with_fallback(
            db=db,
            agent_name="DiagnosisAgent",
            input_reference=f"case:{case.id}",
            prompt=prompt,
            agent_type="diagnosis",
            schema_model=DiagnosisOutput,
            fallback_func=fallback
        )

    @classmethod
    def plan_recovery(
        cls, db: Session, diagnosis: DiagnosisOutput, case: RecoveryCase
    ) -> RecoveryPlanOutput:
        """Agent 2: Recovery Planner"""
        prompt = f"Plan recovery for case {case.id} given diagnosis {diagnosis.failure_category}"
        
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
                confidence=1.0
            )
                
        return cls._execute_agent_with_fallback(
            db=db,
            agent_name="RecoveryPlannerAgent",
            input_reference=f"case:{case.id}",
            prompt=prompt,
            agent_type="planner",
            schema_model=RecoveryPlanOutput,
            fallback_func=fallback
        )
