@echo off
cd /d "%~dp0"
if not exist "build\web-mobile\index.html" (
  echo Please build the project first: npm run build
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4328"
node tools\serve.mjs
pause
