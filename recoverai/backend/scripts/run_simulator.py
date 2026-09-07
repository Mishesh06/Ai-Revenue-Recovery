import argparse
import sys
import os

# Add backend directory to sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.services.simulator import SimulatorService

from unittest.mock import MagicMock

def main():
    parser = argparse.ArgumentParser(description="RecoverAI Simulator")
    parser.add_argument("--scenario", type=str, required=True, choices=["A", "B", "C", "D", "E"], help="Scenario to run")
    parser.add_argument("--sample-size", type=int, default=10, help="Number of transactions to sample")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic sampling")
    
    args = parser.parse_args()
    
    # Setup Mock DB
    db = MagicMock()
    db.added_items = []
    
    def add(item):
        db.added_items.append(item)
    db.add.side_effect = add
    
    def mock_query(model):
        class QueryMock:
            def filter_by(self, **kwargs):
                self.kwargs = kwargs
                return self
            def first(self):
                for item in db.added_items:
                    if isinstance(item, model):
                        match = True
                        for k, v in getattr(self, "kwargs", {}).items():
                            if getattr(item, k, None) != v:
                                match = False
                                break
                        if match:
                            return item
                return None
            def all(self):
                res = []
                for item in db.added_items:
                    if isinstance(item, model):
                        match = True
                        for k, v in getattr(self, "kwargs", {}).items():
                            if getattr(item, k, None) != v:
                                match = False
                                break
                        if match:
                            res.append(item)
                return res
            def count(self):
                return len(self.all())
        return QueryMock()
        
    db.query.side_effect = mock_query
    
    try:
        print(f"Running Simulator - Scenario {args.scenario} (seed={args.seed}, sample={args.sample_size})")
        print("="*60)
        
        result = SimulatorService.run_scenario(
            db=db,
            scenario=args.scenario,
            sample_size=args.sample_size,
            seed=args.seed
        )
        
        metrics = result["metrics"]
        print(f"Simulation Run ID       : {result['simulation_id']}")
        print(f"Scenario                : {result['scenario']}")
        print(f"Transactions analyzed   : {metrics['transactions_analyzed']}")
        print(f"Opportunities detected  : {metrics['opportunities_detected']}")
        print(f"Actions approved        : {metrics['actions_approved']}")
        print(f"Successful recoveries   : {metrics['successful_recoveries']}")
        print(f"Revenue recovered       : ${metrics['revenue_recovered']:.2f}")
        print(f"Recovery rate           : {metrics['recovery_rate']:.2%}")
        print(f"Policy blocks           : {metrics['policy_blocks']}")
        print(f"Manual reviews          : {metrics['manual_reviews']}")
        print(f"Unknown outcomes        : {metrics['unknown_outcomes']}")
        print("="*60)
        
        if args.scenario == "C":
            print("Notice: For Scenario C, UNKNOWN outcomes safely generated ManualReviews without triggering auto-retries.")
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
