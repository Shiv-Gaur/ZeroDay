import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'https';

/**
 * Check if Tor SOCKS5 proxy is reachable and working.
 * Fetches https://check.torproject.org/api/ip through the proxy.
 * Returns { connected: boolean, ip: string|null, latency: number }
 * NEVER logs IP addresses in audit trail — the returned IP is only shown to the admin in TorStatusBadge.
 */
export async function checkTorConnection() {
  const proxyUrl = process.env.TOR_SOCKS_PROXY || 'socks5h://127.0.0.1:9050';
  const start = Date.now();

  return new Promise((resolve) => {
    try {
      const agent = new SocksProxyAgent(proxyUrl);
      
      const req = https.get('https://check.torproject.org/api/ip', {
        agent,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              connected: json.IsTor === true,
              ip: json.IP || null,
              latency: Date.now() - start
            });
          } catch {
            resolve({ connected: false, ip: null, latency: Date.now() - start });
          }
        });
      });

      req.on('error', () => {
        resolve({ connected: false, ip: null, latency: Date.now() - start });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({ connected: false, ip: null, latency: Date.now() - start });
      });
    } catch {
      resolve({ connected: false, ip: null, latency: Date.now() - start });
    }
  });
}
