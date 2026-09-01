@echo off
title AssetFlow - Live Server
echo Starting AssetFlow Live Server...
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
