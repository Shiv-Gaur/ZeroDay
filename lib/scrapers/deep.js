import { parseHtml } from '../utils/parser.js';
import { sanitizeHtml, sanitizeData } from '../utils/sanitize.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Deep web scraper.
 * Strategy:
 *   1. If NO auth config → plain HTTP fetch (fast, no Chrome needed)
 *   2. If auth config provided → Puppeteer with login flow
 *      Puppeteer requires Chrome. Install it once with:
 *        npx puppeteer browsers install chrome
 *      Or set PUPPETEER_EXECUTABLE_PATH env var to an existing Chrome binary.
 */
export async function scrapeDeep(url, extractionType, authConfig = null) {
  const startTime = Date.now();

  // ── Path A: No auth — use plain fetch (works on every server) ──────────────
  if (!authConfig?.loginUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const html = await res.text();
      const data = sanitizeData(parseHtml(sanitizeHtml(html), extractionType, url));
      const duration = Date.now() - startTime;

      return { data, rawHtmlSize: Buffer.byteLength(html, 'utf8'), duration, method: 'fetch' };
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out (20s). The server may be slow or unreachable.');
      throw err;
    }
  }

  // ── Path B: Auth config provided — Puppeteer with login flow ───────────────
  let browser;
  try {
    const puppeteer = (await import('puppeteer')).default;

    // Allow overriding Chrome path via env (useful on servers without auto-install)
    const launchOpts = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(USER_AGENT);

    // Login flow
    await page.goto(authConfig.loginUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    if (authConfig.usernameSelector && authConfig.username) {
      await page.type(authConfig.usernameSelector, authConfig.username, { delay: 50 });
    }
    if (authConfig.passwordSelector && authConfig.password) {
      await page.type(authConfig.passwordSelector, authConfig.password, { delay: 50 });
    }
    if (authConfig.submitSelector) {
      await page.click(authConfig.submitSelector);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    }

    // Navigate to target
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    const html = await page.content();

    const data = sanitizeData(parseHtml(sanitizeHtml(html), extractionType, url));
    const duration = Date.now() - startTime;

    return { data, rawHtmlSize: Buffer.byteLength(html, 'utf8'), duration, method: 'puppeteer-auth' };
  } catch (err) {
    if (err.message?.includes('Could not find Chrome') || err.message?.includes('executable')) {
      throw new Error(
        'Chrome not found. Run: npx puppeteer browsers install chrome\n' +
        'Or set PUPPETEER_EXECUTABLE_PATH in .env.local to an existing Chrome/Chromium binary.'
      );
    }
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}
