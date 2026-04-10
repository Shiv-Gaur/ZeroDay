/**
 * Sanitize HTML content — strips dangerous tags and attributes.
 * Used for ALL scraped content, especially dark web.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  // Strip dangerous tags
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'applet', 'form'];
  let sanitized = html;
  for (const tag of dangerousTags) {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing versions
    const selfClose = new RegExp(`<${tag}[^>]*/?>`, 'gi');
    sanitized = sanitized.replace(selfClose, '');
  }

  // Remove on* event handler attributes
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: URLs from href/src/action attributes
  sanitized = sanitized.replace(/(href|src|action)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '$1=""');

  // Strip null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitize extracted data objects — truncate strings
 */
export function sanitizeData(data) {
  if (!Array.isArray(data)) return [];
  return data.map(item => {
    const cleaned = {};
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'string') {
        // Truncate to 500 chars, strip null bytes
        cleaned[key] = value.slice(0, 500).replace(/[\x00]/g, '');
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });
}
