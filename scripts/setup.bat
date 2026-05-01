@echo off
REM Install all project dependencies: Python venv + pip + npm

echo =^> Creating Python virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

echo =^> Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo =^> Installing frontend dependencies...
cd frontend
npm install
cd ..

echo.
echo Setup complete.
echo   Activate venv : venv\Scripts\activate
echo   Start app     : scripts\start.bat
