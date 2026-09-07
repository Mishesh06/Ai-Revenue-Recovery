"""
RecoverAI v3.2 — Analytics Service

Dynamically calculates revenue and recovery metrics for the measurement layer.
"""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.agent_run import AgentRun
from app.models.ai_decision import AIDecision
from app.models.enums import CaseState, ActionState, AttemptState
from app.schemas.analytics import DashboardResponse, RecoverySummary, FinancialSummary, RevenueLeakMap, AgentSummary


class AnalyticsService:

    @classmethod
    async def get_dashboard_metrics(
        cls, db: AsyncSession, merchant_id: uuid.UUID
    ) -> DashboardResponse:
        """
        Dynamically calculates the dashboard metrics for a merchant.
        """
        
        # ── 1. Transaction level metrics (Total Revenue, Successful, Failed, Leak Map) ──
        
        transactions_res = await db.execute(
            select(
                Transaction.status,
                func.count(Transaction.id),
                func.sum(Transaction.amount)
            )
            .where(Transaction.merchant_id == merchant_id)
            .group_by(Transaction.status)
        )
        
        tx_stats = transactions_res.all()
        
        leak_map = RevenueLeakMap()
        for status, count, amount in tx_stats:
            amt = float(amount or 0.0)
            leak_map.total_revenue += amt
            if status == "success":
                leak_map.successful += amt
            else:
                leak_map.failed += amt
                if status == "temporary_failure":
                    leak_map.temporary_failure += amt
                elif status == "expired_card":
                    leak_map.expired_card += amt
                else:
                    leak_map.other_failure += amt

        # ── 2. Recovery Case level metrics ──
        
        cases_res = await db.execute(
            select(
                RecoveryCase.state,
                func.count(RecoveryCase.id),
                func.sum(Transaction.amount)
            )
            .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
            .where(RecoveryCase.merchant_id == merchant_id)
            .group_by(RecoveryCase.state)
        )
        
        case_stats = cases_res.all()
        
        recovery_summary = RecoverySummary()
        recoverable_revenue = 0.0
        recovered_revenue = 0.0
        
        for state, count, amount in case_stats:
            amt = float(amount or 0.0)
            recovery_summary.total_cases += count
            recoverable_revenue += amt
            
            if state in (CaseState.CLOSED, CaseState.RECOVERED):
                recovery_summary.cases_recovered += count
                recovered_revenue += amt
            elif state == CaseState.RECOVERY_WINDOW_EXPIRED:
                recovery_summary.cases_expired += count
            elif state == CaseState.RECOVERING:
                recovery_summary.cases_pending += count
                
        leak_map.recoverable = recoverable_revenue
        leak_map.recovered = recovered_revenue
        
        if recovery_summary.total_cases > 0:
            recovery_summary.recovery_rate = recovery_summary.cases_recovered / recovery_summary.total_cases
            
        # ── 3. Recovery Action & Attempt metrics ──
        
        actions_res = await db.execute(
            select(
                RecoveryAction.state,
                func.count(RecoveryAction.id)
            )
            .where(RecoveryAction.merchant_id == merchant_id)
            .group_by(RecoveryAction.state)
        )
        action_stats = actions_res.all()
        
        total_actions = 0
        successful_actions = 0
        for state, count in action_stats:
            total_actions += count
            if state == ActionState.SUCCEEDED:
                successful_actions += count
                
        if total_actions > 0:
            recovery_summary.intervention_success_rate = successful_actions / total_actions

        # ── 4. Financial Calculations ──
        
        # We assume 0 recovery cost as per plan unless attempts have costs.
        # Avoided loss is modeled as equivalent to recovered revenue for this demo.
        recovery_cost = 0.0
        avoided_loss = recovered_revenue
        
        revenue_at_risk = leak_map.failed - recovered_revenue
        net_revenue_impact = recovered_revenue + avoided_loss - recovery_cost
        
        financial = FinancialSummary(
            total_failed_amount=leak_map.failed,
            total_recovered_amount=recovered_revenue,
            recoverable_revenue=recoverable_revenue,
            revenue_at_risk=revenue_at_risk,
            recovery_cost=recovery_cost,
            avoided_loss=avoided_loss,
            net_revenue_impact=net_revenue_impact,
            currency="USD"
        )
        
        # ── 5. Agent Metrics ──
        
        agents_res = await db.execute(
            select(
                AgentRun.status,
                func.count(func.distinct(AgentRun.id)),
                func.avg(AgentRun.latency)
            )
            .join(AIDecision, AIDecision.agent_run_id == AgentRun.id)
            .join(RecoveryCase, RecoveryCase.id == AIDecision.recovery_case_id)
            .where(RecoveryCase.merchant_id == merchant_id)
            .group_by(AgentRun.status)
        )
        
        agent_stats = agents_res.all()
        agent_summary = AgentSummary()
        total_latency = 0.0
        latency_count = 0
        
        for status, count, avg_latency in agent_stats:
            agent_summary.total_runs += count
            if status == "SUCCESS":
                agent_summary.successful_runs += count
            else:
                agent_summary.failed_runs += count
                
            if avg_latency:
                total_latency += avg_latency * count
                latency_count += count
                
        if latency_count > 0:
            agent_summary.avg_latency_ms = total_latency / latency_count
            
        return DashboardResponse(
            merchant_id=str(merchant_id),
            recovery=recovery_summary,
            financial=financial,
            leak_map=leak_map,
            agents=agent_summary,
            message="Dashboard loaded successfully."
        )
