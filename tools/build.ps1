param([string]$Editor = 'C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (!(Test-Path -LiteralPath $Editor)) { throw 'Cocos Creator executable not found. Pass -Editor with the installed path.' }
Push-Location $projectRoot
try {
  & node tools/build-core.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Core bundling failed.' }
  $argsList = @('--project', ('"' + $projectRoot + '"'), '--build', ('"configPath=' + (Join-Path $projectRoot 'build-config.json') + '"'))
  $buildStarted = Get-Date
  $proc = Start-Process -FilePath $Editor -ArgumentList $argsList -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot 'build-editor.log') -RedirectStandardError (Join-Path $projectRoot 'build-editor-error.log')
  $proc.WaitForExit()
  if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'build/web-mobile/index.html'))) { throw 'Build output missing. See build-editor.log and build-editor-error.log.' }
  $builtPage = Get-Item -LiteralPath (Join-Path $projectRoot 'build/web-mobile/index.html')
  $buildLog = Get-Content -LiteralPath (Join-Path $projectRoot 'build-editor.log') -Raw
  if ($builtPage.LastWriteTime -lt $buildStarted -or $buildLog -match 'run build task[^\r\n]*failed!') { throw 'The current build failed; older output is not a successful build. See build-editor.log.' }
  & node tools/export-art-packs.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Art pack export failed.' }
  & node tools/build-state.mjs --write
  if ($LASTEXITCODE -ne 0) { throw 'Recording build state failed.' }
  Write-Host 'Cocos Web Mobile output generated successfully.'
  Write-Host 'Browser demo: npm start'
} finally { Pop-Location }
