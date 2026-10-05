@echo off
rem ============================================================================
rem  INICIAR ANDUMA EN TU COMPU  (doble clic)
rem  Descarga la ultima version, instala lo que falte, levanta el servidor y abre el navegador.
rem  Para cerrar el servidor: Ctrl+C en esta ventana.
rem ============================================================================
cd /d "%~dp0"
title Anduma - servidor local

rem Todo va dentro de un bloque: asi cmd lo lee completo antes de ejecutar y no se rompe
rem aunque este mismo archivo cambie al actualizarse.
(
  where git >nul 2>nul
  if errorlevel 1 (
    echo No encontre Git. Instalalo desde https://git-scm.com y volve a abrir este archivo.
    pause
    exit /b 1
  )
  where npm >nul 2>nul
  if errorlevel 1 (
    echo No encontre Node.js. Instalalo desde https://nodejs.org ^(version LTS^) y volve a abrir este archivo.
    pause
    exit /b 1
  )

  echo.
  echo [1/3] Descargando la ultima version...
  git fetch origin claude/gifted-dirac-txlmgb
  if errorlevel 1 (
    echo No pude descargar. Revisa tu conexion a internet y volve a intentar.
    pause
    exit /b 1
  )
  rem Deja la carpeta EXACTAMENTE igual que la ultima version (descarta cambios locales y cambia de rama).
  git checkout -f -B claude/gifted-dirac-txlmgb origin/claude/gifted-dirac-txlmgb
  git reset --hard origin/claude/gifted-dirac-txlmgb

  echo.
  echo [2/3] Instalando lo que falte ^(la primera vez tarda un poco^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Fallo la instalacion. Copia el mensaje de arriba y pasaselo a Claude.
    pause
    exit /b 1
  )

  echo.
  echo [3/3] Abriendo Anduma... ^(si no se abre solo, usa la direccion que dice "Local:" mas abajo^)
  if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
  call npm run dev -- --open
  pause
  exit /b 0
)
