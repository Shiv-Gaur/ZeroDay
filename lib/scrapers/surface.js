import { parseHtml } from '../utils/parser.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Surface web scraper — tries fetch first, then falls back to Puppeteer
 */
export async function scrapeSurface(url, extractionType) {
  const startTime = Date.now();
  let html = '';
  let method = 'fetch';

  // 1. Try node-fetch first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';

    if (response.status >= 400 || !contentType.includes('html')) {
      throw new Error(`Non-HTML or error response: ${response.status}`);
    }

    html = await response.text();
  } catch (fetchError) {
    // 2. Fallback to Puppeteer
    method = 'puppeteer';
    let browser;
    try {
      const puppeteer = await import('puppeteer');
      browser = await puppeteer.default.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(USER_AGENT);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      html = await page.content();
    } finally {
      if (browser) await browser.close();
    }
  }

  // 3. Parse HTML
  const data = parseHtml(html, extractionType, url);
  const duration = Date.now() - startTime;

  return {
    data,
    rawHtmlSize: Buffer.byteLength(html, 'utf8'),
    duration,
    method,
  };
}
