@echo off
REM Lian Le Ma unified launcher
REM Detect LAN IP -> write app/backend env -> start Flask pose service + FastAPI + Expo
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
pause
