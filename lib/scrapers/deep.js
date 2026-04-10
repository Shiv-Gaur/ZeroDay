import { parseHtml } from '../utils/parser.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Deep web scraper — always uses Puppeteer, supports authentication
 */
export async function scrapeDeep(url, extractionType, authConfig = null) {
  const startTime = Date.now();
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

    // If auth config provided, perform login flow
    if (authConfig && authConfig.loginUrl) {
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
    }

    // Navigate to target URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    const html = await page.content();

    // Parse HTML
    const data = parseHtml(html, extractionType, url);
    const duration = Date.now() - startTime;

    return {
      data,
      rawHtmlSize: Buffer.byteLength(html, 'utf8'),
      duration,
      method: 'puppeteer',
    };
  } finally {
    // ALWAYS close the browser to prevent memory leaks
    if (browser) await browser.close();
  }
}
