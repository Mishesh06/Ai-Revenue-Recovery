#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================="
echo "  Running RecoverAI Test Suite"
echo "=========================================="

echo "1. Running Backend Tests (pytest)..."
cd "$ROOT_DIR/recoverai/backend"
source .venv/bin/activate
pytest -v

echo "2. Running ML Pipeline Tests..."
PYTHONPATH="../ml:." pytest ../ml/tests -v

echo "3. Running Frontend Production Build & Typecheck..."
cd "$ROOT_DIR/recoverai/frontend"
npm run build

echo ""
echo "=========================================="
echo "✅ All RecoverAI Test Suites Passed! (100%)"
echo "=========================================="
