@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 24 LTS, then try again.
  pause
  exit /b 1
)
node tools\build-state.mjs
if errorlevel 2 goto :failed
if errorlevel 1 (
  where npm >nul 2>nul
  if errorlevel 1 goto :missing_npm
  if not exist "node_modules\esbuild\package.json" (
    echo Installing dependencies...
    call npm ci
    if errorlevel 1 goto :failed
  )
  echo Building the browser version with Cocos Creator...
  call npm run build
  if errorlevel 1 goto :failed
)
echo Keep this window open while playing. Press Ctrl+C to stop.
node tools\serve.mjs --open
if errorlevel 1 goto :failed
exit /b 0

:missing_npm
echo npm is required for the first build. Reinstall Node.js with npm included.
goto :failed

:failed
echo Startup failed. See the error above and the setup instructions in README.md.
pause
exit /b 1
