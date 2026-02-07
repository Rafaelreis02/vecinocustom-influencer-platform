@echo off
REM Auto-Import Influencers - 100% Automatico + Dados Reais
REM Runs every 5 minutes via Windows Task Scheduler

cd /d C:\Users\ebril\.openclaw\workspace

REM Set environment
set VERCEL_BASE_URL=https://vecinocustom-influencer-platform.vercel.app

REM Run script
node scripts\auto-import-influencers.js

REM Exit
exit /b %ERRORLEVEL%
