#!/bin/bash
set -e

echo "[*] Installing Tor..."
sudo apt update && sudo apt install -y tor

echo "[*] Configuring hidden service..."
sudo mkdir -p /etc/tor/torrc.d
sudo cp tor/torrc.template /etc/tor/torrc.d/webscope.conf

# Append include directive if not already present
if ! grep -q "torrc.d" /etc/tor/torrc 2>/dev/null; then
  echo "%include /etc/tor/torrc.d/*.conf" | sudo tee -a /etc/tor/torrc
fi

echo "[*] Restarting Tor..."
sudo systemctl restart tor
sleep 5

ONION=$(sudo cat /var/lib/tor/webscope/hostname)
echo "[*] Your .onion address: $ONION"
echo "[*] Update NEXTAUTH_URL in .env.local to: http://$ONION"
echo "[*] Update TOR_SOCKS_PROXY to: socks5h://127.0.0.1:9050"
