import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Check if Tor SOCKS5 proxy is reachable and working.
 * Fetches https://check.torproject.org/api/ip through the proxy.
 * Returns { connected: boolean, ip: string|null, latency: number }
 * NEVER logs IP addresses in audit trail — the returned IP is only shown to the admin in TorStatusBadge.
 */
export async function checkTorConnection() {
  const proxyUrl = process.env.TOR_SOCKS_PROXY || 'socks5h://127.0.0.1:9050';
  const start = Date.now();

  try {
    const agent = new SocksProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://check.torproject.org/api/ip', {
      agent,
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    if (!res.ok) return { connected: false, ip: null, latency };

    const data = await res.json();
    return {
      connected: data.IsTor === true,
      ip: data.IP || null,
      latency,
    };
  } catch {
    return { connected: false, ip: null, latency: Date.now() - start };
  }
}
