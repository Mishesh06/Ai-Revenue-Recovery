.PHONY: help setup dev dev-backend dev-frontend test test-backend test-ml test-frontend db-init db-seed docker-up docker-down clean

help:
	@echo "RecoverAI v3.2 — Developer Commands"
	@echo "======================================"
	@echo "  make setup          - Install all dependencies for backend & frontend"
	@echo "  make dev            - Run full-stack dev environment (backend + frontend)"
	@echo "  make dev-backend    - Run FastAPI backend server on :8000"
	@echo "  make dev-frontend   - Run Next.js frontend dev server on :3000"
	@echo "  make test           - Run full test suite (backend, ML, frontend build)"
	@echo "  make test-backend   - Run pytest for backend (560+ tests)"
	@echo "  make test-ml        - Run pytest for ML pipeline"
	@echo "  make test-frontend  - Run frontend build & typecheck"
	@echo "  make db-init        - Create all PostgreSQL tables"
	@echo "  make db-seed        - Seed realistic multi-tenant demo data"
	@echo "  make docker-up      - Start full application stack via Docker Compose"
	@echo "  make docker-down    - Stop Docker Compose services"
	@echo "  make clean          - Remove temporary build artifacts and pycache"

setup:
	@echo "--> Setting up backend..."
	cd recoverai/backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	@if [ ! -f recoverai/backend/.env ]; then cp recoverai/backend/.env.example recoverai/backend/.env; fi
	@echo "--> Setting up frontend..."
	cd recoverai/frontend && npm install
	@if [ ! -f recoverai/frontend/.env.local ]; then cp recoverai/frontend/.env.example recoverai/frontend/.env.local; fi
	@echo "--> Setup complete!"

dev-backend:
	cd recoverai/backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd recoverai/frontend && npm run dev

dev:
	@echo "Starting RecoverAI full stack (backend + frontend)..."
	@npx concurrently -n "backend,frontend" -c "blue,cyan" \
		"cd recoverai/backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000" \
		"cd recoverai/frontend && npm run dev"

test-backend:
	cd recoverai/backend && . .venv/bin/activate && pytest -v

test-ml:
	cd recoverai/backend && . .venv/bin/activate && PYTHONPATH="../ml:." pytest ../ml/tests -v

test-frontend:
	cd recoverai/frontend && npm run build

test: test-backend test-ml test-frontend
	@echo "✅ All backend, ML, and frontend test suites passed successfully!"

db-init:
	cd recoverai/backend && . .venv/bin/activate && python scripts/init_db.py

db-seed:
	cd recoverai/backend && . .venv/bin/activate && python scripts/seed_demo.py

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.py[cod]" -delete 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".DS_Store" -delete 2>/dev/null || true
