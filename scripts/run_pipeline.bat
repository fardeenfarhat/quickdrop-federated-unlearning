@echo off
REM Run the full QuickDrop pipeline end-to-end (Windows)
REM Usage: scripts\run_pipeline.bat

call venv\Scripts\activate

set DATASET=%1
if "%DATASET%"=="" set DATASET=cifar10

set ROUNDS=%2
if "%ROUNDS%"=="" set ROUNDS=20

set CLIENTS=%3
if "%CLIENTS%"=="" set CLIENTS=10

set FORGET=%4
if "%FORGET%"=="" set FORGET=0

echo Dataset : %DATASET%
echo Rounds  : %ROUNDS%
echo Clients : %CLIENTS%
echo Forget  : %FORGET%

python scripts\run_pipeline.py --dataset %DATASET% --rounds %ROUNDS% --clients %CLIENTS% --forget %FORGET%
