/**
 * Integration test for surface scraper against example.com.
 * Requires real internet access.
 */
import { scrapeSurface } from '../../lib/scrapers/surface.js';

describe('surface scraper', () => {
  jest.setTimeout(30000); // Puppeteer can be slow

  test('scrapes example.com and returns links', async () => {
    const result = await scrapeSurface('https://example.com', 'links');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('count');
    expect(result).toHaveProperty('duration');
    expect(result.status).toBe('success');
  });

  test('returns headings from example.com', async () => {
    const result = await scrapeSurface('https://example.com', 'headings');
    expect(result.data).toBeInstanceOf(Array);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toHaveProperty('text');
    expect(result.data[0]).toHaveProperty('level');
  });

  test('rejects .onion URLs', async () => {
    await expect(scrapeSurface('http://test.onion', 'links'))
      .rejects.toThrow();
  });
});
