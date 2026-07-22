@echo off
REM PT Dashboard — Site Agent Runner
REM Double-click to start, or use Task Scheduler to run on startup.

cd /d "%~dp0"
python agent.py %*
pause
