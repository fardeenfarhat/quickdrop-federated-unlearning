#!/usr/bin/env bash
# Install all project dependencies: Python venv + pip + npm
set -e

echo "==> Creating Python virtual environment..."
python -m venv venv
source venv/bin/activate

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "Setup complete."
echo "  Activate venv : source venv/bin/activate"
echo "  Start app     : ./scripts/start.sh"
