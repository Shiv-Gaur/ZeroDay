#!/bin/bash
set -e

echo "[*] Building Next.js..."
npm run build

echo "[*] Starting Next.js server..."
NODE_ENV=production node .next/standalone/server.js &
SERVER_PID=$!

echo "[*] Starting cron worker..."
node scripts/cron-worker.js &
CRON_PID=$!

echo "[*] WEBSCOPE running on http://127.0.0.1:3000"
echo "[*] Tor hidden service should be active if setup-tor.sh was run"
echo "[*] Server PID: $SERVER_PID | Cron PID: $CRON_PID"

trap "echo '[*] Shutting down...'; kill $SERVER_PID $CRON_PID 2>/dev/null" EXIT INT TERM
wait
