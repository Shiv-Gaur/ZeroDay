import { SocksProxyAgent } from 'socks-proxy-agent';
import { parseHtml } from '../utils/parser.js';
import { sanitizeHtml, sanitizeData } from '../utils/sanitize.js';
import { checkTorConnection } from '../utils/tor.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/**
 * Dark web scraper — uses SOCKS5 proxy via Tor daemon
 */
export async function scrapeDark(url, extractionType) {
  const startTime = Date.now();

  const torProxy = process.env.TOR_SOCKS_PROXY || 'socks5h://127.0.0.1:9050';

  // Check Tor connectivity first — give a clear error if Tor is down
  const torStatus = await checkTorConnection();
  if (!torStatus.connected) {
    throw new Error('Tor is not running or unreachable. Start the Tor daemon (port 9050) and try again.');
  }

  // Create SOCKS5 proxy agent
  const agent = new SocksProxyAgent(torProxy);

  let html;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for Tor

    const response = await fetch(url, {
      agent,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    html = await response.text();
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      throw new Error('Tor proxy unavailable. Ensure Tor daemon is running on port 9050.');
    }
    if (err.name === 'AbortError') {
      throw new Error('Request timed out (30s). Tor circuit may be slow. Try again.');
    }
    throw err;
  }

  // Sanitize HTML before parsing
  const sanitized = sanitizeHtml(html);

  // Parse sanitized HTML
  const rawData = parseHtml(sanitized, extractionType, url);

  // Sanitize extracted data
  const data = sanitizeData(rawData);

  const duration = Date.now() - startTime;

  return {
    data,
    rawHtmlSize: Buffer.byteLength(html, 'utf8'),
    duration,
    method: 'tor-socks5',
  };
}
