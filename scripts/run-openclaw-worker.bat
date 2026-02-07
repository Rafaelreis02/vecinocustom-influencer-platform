@echo off
REM OpenClaw Worker - VecinoCustom Influencer Auto-Import
REM Runs every 5 minutes via Windows Task Scheduler

cd /d C:\Users\ebril\.openclaw\workspace
set VERCEL_BASE_URL=https://vecinocustom-influencer-platform.vercel.app
set OPENCLAW_GATEWAY_URL=http://localhost:18789

node scripts\openclaw-worker.js >> scripts\worker.log 2>&1
