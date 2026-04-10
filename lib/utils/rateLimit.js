/**
 * Simple in-memory rate limiter.
 * Allows `maxRequests` per `windowMs` per user.
 */
const rateLimitMap = new Map();

// Periodically clean up old entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > 300000) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

/**
 * Check rate limit for a user
 * @param {string} userId - User identifier
 * @param {number} maxRequests - Max requests allowed (default 10)
 * @param {number} windowMs - Time window in ms (default 60000 = 1 minute)
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(userId, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = `rate:${userId}`;

  let entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, maxRequests - entry.count);
  const resetIn = Math.max(0, windowMs - (now - entry.windowStart));

  return {
    allowed: entry.count <= maxRequests,
    remaining,
    resetIn,
  };
}
