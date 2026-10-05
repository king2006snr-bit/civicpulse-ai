@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo      CivicPulse AI - Windows Runner
echo ==========================================

echo.
if not exist package.json (
  echo ERROR: package.json not found.
  echo Make sure this CMD file is inside the CivicPulse project folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js LTS, reopen CMD, and run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not installed or not in PATH.
  pause
  exit /b 1
)

where py >nul 2>nul
if errorlevel 1 (
  echo WARNING: Python launcher ^(py^) was not found.
  echo The website can still start, but AI predictions will need Python 3 manually configured.
) else (
  echo Installing/checking Python ML dependencies...
  py -3 -m pip install -r ml\requirements.txt
  if errorlevel 1 (
    echo WARNING: Python ML dependencies could not be installed.
    echo The website may start, but /api/predictions can return 503.
  )
)

echo.
if not exist node_modules (
  echo Installing Node dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting CivicPulse AI...
echo Open http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.
call npm run dev
