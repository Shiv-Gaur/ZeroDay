@echo off
echo [*] Starting Tor hidden service for WEBSCOPE...
echo [*] Make sure C:\tor\torrc contains:
echo     HiddenServiceDir C:\tor\webscope_service\
echo     HiddenServicePort 80 127.0.0.1:3000
echo.

start /B C:\tor\tor.exe -f C:\tor\torrc

echo [*] Waiting 30 seconds for Tor to bootstrap...
timeout /t 30 /nobreak

echo [*] Your .onion address:
type "C:\tor\webscope_service\hostname"

echo.
echo [*] Update NEXTAUTH_URL in .env.local to the address above
echo [*] Then run: npm run build ^&^& node .next/standalone/server.js
pause
