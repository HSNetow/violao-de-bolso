@echo off
chcp 65001 >nul
title Violão de Bolso
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale em https://nodejs.org e rode de novo.
  pause
  exit /b 1
)
start "" "http://localhost:8080"
node servidor.js
pause
