#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  RecoverAI v3.2 — Full Setup"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "1. Setting up Backend..."
cd "$ROOT_DIR/recoverai/backend"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created recoverai/backend/.env from .env.example"
fi

echo "2. Setting up Frontend..."
cd "$ROOT_DIR/recoverai/frontend"
npm install

if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "Created recoverai/frontend/.env.local from .env.example"
fi

echo ""
echo "✅ Setup successfully completed!"
echo "To start developing:"
echo "  - Start backend: cd recoverai/backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "  - Start frontend: cd recoverai/frontend && npm run dev"
echo "  - Or run Docker: docker compose up --build"
