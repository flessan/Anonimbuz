// functions/api/middleware/rateLimiter.js

const rateLimitMap = new Map();

// Clear old entries periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const maxRequests = options.maxRequests || 60; // default 60 req/min
  
  return async (c, next) => {
    // Attempt to get client IP from Cloudflare headers
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown-ip';
    const key = `${ip}-${c.req.path}`;
    
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      const data = rateLimitMap.get(key);
      if (now > data.resetTime) {
        // Reset window
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      } else {
        // Increment
        data.count++;
        if (data.count > maxRequests) {
          c.header('Retry-After', Math.ceil((data.resetTime - now) / 1000).toString());
          return c.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, 429);
        }
      }
    }
    
    await next();
  };
}
