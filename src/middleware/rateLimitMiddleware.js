// Simple in-memory rate limiter
const requestCounts = new Map();

const cleanup = () => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.resetTime > 0) {
      requestCounts.delete(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanup, 60000);

const createRateLimiter = (maxRequests, windowMs, message) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const data = requestCounts.get(key);
    
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
      return next();
    }
    
    if (data.count >= maxRequests) {
      return res.status(429).json({ 
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }
    
    data.count++;
    next();
  };
};

// General rate limiter (200 requests per 15 minutes)
export const generalLimiter = createRateLimiter(
  200, 
  15 * 60 * 1000, 
  'Too many requests from this IP, please try again later.'
);

// Less strict rate limiter for auth routes (20 requests per 15 minutes)
export const authLimiter = createRateLimiter(
  20, 
  15 * 60 * 1000, 
  'Too many authentication attempts, please try again later.'
);

// Password reset rate limiter (3 requests per hour)
export const passwordResetLimiter = createRateLimiter(
  3, 
  60 * 60 * 1000, 
  'Too many password reset attempts, please try again later.'
);
