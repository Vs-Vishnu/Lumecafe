/**
 * In-memory sliding window rate limiter middleware for sensitive auth operations.
 * Protects password recovery and reset endpoints from brute force and denial of service.
 */

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  max = 5,                    // 5 attempts default
  message = 'Too many requests. Please try again later.',
  keyPrefix = 'rl',
}) => {
  const store = new Map();

  // Periodically clean up expired entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval so it won't block server shutdown
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const rateLimiter = (req, res, next) => {
    // Determine client identifier
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };

  rateLimiter.reset = () => {
    store.clear();
  };

  return rateLimiter;
};

// 5 requests per 15 minutes for requesting password recovery
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests from this network. Please try again after 15 minutes.',
  keyPrefix: 'dp_forgot',
});

// 5 attempts per 15 minutes for verifying or submitting a password reset
const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many verification attempts from this network. Please try again after 15 minutes.',
  keyPrefix: 'dp_reset',
});

module.exports = {
  createRateLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
};
