@echo off
REM Start backend and frontend in separate windows

if not exist venv (
  echo Run scripts\setup.bat first.
  exit /b 1
)

echo =^> Starting backend on http://localhost:8000 ...
start "QuickDrop Backend" cmd /k "venv\Scripts\activate && set PYTHONPATH=. && uvicorn backend.main:app --reload --port 8000"

echo =^> Starting frontend on http://localhost:5173 ...
start "QuickDrop Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Open http://localhost:5173 in your browser.
