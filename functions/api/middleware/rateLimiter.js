// functions/api/middleware/rateLimiter.js

// In-memory store (per-isolate, resets on cold start)
const rateLimitStore = new Map();

// Cleanup function - dipanggil di dalam handler, bukan global scope
function cleanupExpired() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Rate limiter middleware factory
export function rateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 100,
    keyGenerator = (c) => {
      // Use IP address as key
      return c.req.header('CF-Connecting-IP') ||
        c.req.header('X-Forwarded-For') ||
        'unknown';
    }
  } = options;

  return async (c, next) => {
    // ✅ Cleanup dilakukan di dalam handler, bukan global scope
    cleanupExpired();

    const key = keyGenerator(c);
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Create new record
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, record);
    } else {
      // Increment existing record
      record.count++;
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    // Check if limit exceeded
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      c.header('Retry-After', retryAfter.toString());
      return c.json(
        {
          error: 'Too many requests',
          retryAfter
        },
        429
      );
    }

    await next();
  };
}

// Pre-configured rate limiters
export const globalRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100
});

export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15
});

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60
});