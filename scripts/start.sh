#!/usr/bin/env bash
# Start the FastAPI backend and the React frontend in parallel.
# Ctrl+C stops both.
set -e

if [ ! -d "venv" ]; then
  echo "Run ./scripts/setup.sh first."
  exit 1
fi

source venv/bin/activate

echo "==> Starting backend on http://localhost:8000 ..."
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

echo "==> Starting frontend on http://localhost:5173 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend PID : $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
