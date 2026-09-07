import uuid
import pytest
from datetime import datetime, timezone

from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.recovery_attempt import RecoveryAttempt
from app.models.enums import CaseState, ActionState, AttemptState
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import DashboardResponse

from unittest.mock import MagicMock, AsyncMock

@pytest.fixture
def db():
    db_mock = MagicMock()
    db_mock.added_items = []
    
    def add(item):
        db_mock.added_items.append(item)
    db_mock.add.side_effect = add

    # Mock execute for specific select queries used in AnalyticsService
    async def mock_execute(stmt):
        class ResultMock:
            def __init__(self, items):
                self.items = items
            def all(self):
                return self.items
            def scalar_one_or_none(self):
                return self.items[0] if self.items else None
        
        # Determine which query this is based on string representation
        stmt_str = str(stmt).lower()
        
        if "transaction" in stmt_str and "recovery_cases" not in stmt_str and "recovery_actions" not in stmt_str:
            # tx stats
            stats = {}
            for t in [x for x in db_mock.added_items if isinstance(x, Transaction)]:
                if t.status not in stats:
                    stats[t.status] = [0, 0.0]
                stats[t.status][0] += 1
                stats[t.status][1] += float(t.amount)
            items = [(k, v[0], v[1]) for k, v in stats.items()]
            return ResultMock(items)
            
        elif "recovery_cases" in stmt_str and "transaction" in stmt_str:
            # case stats
            stats = {}
            for c in [x for x in db_mock.added_items if isinstance(x, RecoveryCase)]:
                if c.state not in stats:
                    stats[c.state] = [0, 0.0]
                # Find matching transaction
                t = next((tx for tx in db_mock.added_items if isinstance(tx, Transaction) and tx.id == c.transaction_id), None)
                stats[c.state][0] += 1
                if t:
                    stats[c.state][1] += float(t.amount)
            items = [(k, v[0], v[1]) for k, v in stats.items()]
            return ResultMock(items)
            
        elif "recovery_actions" in stmt_str:
            # action stats
            stats = {}
            for a in [x for x in db_mock.added_items if isinstance(x, RecoveryAction)]:
                if a.state not in stats:
                    stats[a.state] = 0
                stats[a.state] += 1
            items = [(k, v) for k, v in stats.items()]
            return ResultMock(items)
            
        elif "agent_runs" in stmt_str:
            return ResultMock([]) # No agent runs for now
            
        return ResultMock([])

    db_mock.execute.side_effect = mock_execute
    return db_mock

@pytest.mark.asyncio
async def test_analytics_dashboard_metrics(db):
    merchant_id = uuid.uuid4()
    
    # Setup data
    t1 = Transaction(id=uuid.uuid4(), merchant_id=merchant_id, amount=100.0, status="success")
    t2 = Transaction(id=uuid.uuid4(), merchant_id=merchant_id, amount=200.0, status="temporary_failure")
    t3 = Transaction(id=uuid.uuid4(), merchant_id=merchant_id, amount=300.0, status="insufficient_funds")
    
    c2 = RecoveryCase(id=uuid.uuid4(), merchant_id=merchant_id, transaction_id=t2.id, state=CaseState.CLOSED)
    c3 = RecoveryCase(id=uuid.uuid4(), merchant_id=merchant_id, transaction_id=t3.id, state=CaseState.RECOVERING)
    
    a2 = RecoveryAction(id=uuid.uuid4(), merchant_id=merchant_id, recovery_case_id=c2.id, state=ActionState.SUCCEEDED)
    a3 = RecoveryAction(id=uuid.uuid4(), merchant_id=merchant_id, recovery_case_id=c3.id, state=ActionState.FAILED)
    
    db.add(t1)
    db.add(t2)
    db.add(t3)
    db.add(c2)
    db.add(c3)
    db.add(a2)
    db.add(a3)
    
    res = await AnalyticsService.get_dashboard_metrics(db, merchant_id)
    
    # Financials
    assert res.financial.total_failed_amount == 500.0
    assert res.financial.total_recovered_amount == 200.0
    assert res.financial.revenue_at_risk == 300.0
    assert res.financial.recoverable_revenue == 500.0
    assert res.financial.avoided_loss == 200.0
    assert res.financial.net_revenue_impact == 400.0 # 200 + 200 - 0
    
    # Recovery
    assert res.recovery.total_cases == 2
    assert res.recovery.cases_recovered == 1
    assert res.recovery.cases_pending == 1
    assert res.recovery.recovery_rate == 0.5
    assert res.recovery.intervention_success_rate == 0.5
    
    # Leak map
    assert res.leak_map.total_revenue == 600.0
    assert res.leak_map.successful == 100.0
    assert res.leak_map.failed == 500.0
    assert res.leak_map.temporary_failure == 200.0
    assert res.leak_map.other_failure == 300.0
    assert res.leak_map.recoverable == 500.0
    assert res.leak_map.recovered == 200.0
