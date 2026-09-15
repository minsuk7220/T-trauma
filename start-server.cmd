@echo off
cd /d "%~dp0"
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
  echo Please install Node.js 24 or newer.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
node scripts/build.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
echo Open http://localhost:3000 in your browser.
echo Keep this window open while using reservations.
node --env-file-if-exists=.env scripts/local-server.mjs
pause
