import * as cheerio from 'cheerio';

/**
 * Parse HTML and extract data based on extraction type
 * @param {string} html - Raw HTML string
 * @param {string} extractionType - Type: links, images, headings, paragraphs, tables, meta
 * @param {string} baseUrl - Base URL for resolving relative URLs
 * @returns {Array} Extracted data objects
 */
export function parseHtml(html, extractionType, baseUrl = '') {
  const $ = cheerio.load(html);

  const selectors = {
    links: 'a[href]',
    images: 'img',
    headings: 'h1,h2,h3,h4,h5,h6',
    paragraphs: 'p',
    tables: 'table',
    meta: 'meta',
  };

  const selector = selectors[extractionType];
  if (!selector) {
    throw new Error(`Invalid extraction type: ${extractionType}`);
  }

  const elements = $(selector);
  const results = [];

  elements.each((i, el) => {
    if (results.length >= 100) return false; // limit to 100 items

    const $el = $(el);
    let item = null;

    switch (extractionType) {
      case 'links': {
        const href = $el.attr('href') || '';
        const text = $el.text().trim().slice(0, 200);
        if (text || href) {
          let resolvedHref = href;
          try {
            if (href && baseUrl && !href.startsWith('http') && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:')) {
              resolvedHref = new URL(href, baseUrl).href;
            }
          } catch {}
          item = { n: results.length + 1, text: text || '—', href: resolvedHref };
        }
        break;
      }
      case 'images': {
        const src = $el.attr('src') || $el.attr('data-src') || '';
        if (src) {
          let resolvedSrc = src;
          try {
            if (baseUrl && !src.startsWith('http') && !src.startsWith('data:')) {
              resolvedSrc = new URL(src, baseUrl).href;
            }
          } catch {}
          item = { n: results.length + 1, alt: ($el.attr('alt') || '').slice(0, 100), src: resolvedSrc.slice(0, 300) };
        }
        break;
      }
      case 'headings': {
        const text = $el.text().trim().slice(0, 300);
        if (text) {
          item = { n: results.length + 1, level: el.tagName.toUpperCase(), text };
        }
        break;
      }
      case 'paragraphs': {
        const text = $el.text().trim().slice(0, 500);
        if (text) {
          item = { n: results.length + 1, text };
        }
        break;
      }
      case 'tables': {
        const rows = $el.find('tr').length;
        const firstRow = $el.find('tr').first();
        const cols = firstRow.find('td, th').length;
        const preview = $el.text().trim().slice(0, 300);
        item = { n: results.length + 1, rows, cols, preview };
        break;
      }
      case 'meta': {
        const name = $el.attr('name') || $el.attr('property') || '';
        const content = $el.attr('content') || '';
        if (name || content) {
          item = { n: results.length + 1, name, content: content.slice(0, 300) };
        }
        break;
      }
    }

    if (item) {
      results.push(item);
    }
  });

  return results;
}
