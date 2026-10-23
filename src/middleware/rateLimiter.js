// Lightweight Zero-Dependency In-Memory Rate Limiter Middleware
const { error } = require('../utils/response');

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 15, message = 'Too many requests, please try again later.' }) {
  const hits = new Map();

  const limiter = (req, res, next) => {
    // Allows disabling rate limiter explicitly if needed
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const ip = req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const now = Date.now();
    let record = hits.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(ip, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return error(res, message, 429);
    }

    next();
  };

  limiter.reset = () => {
    hits.clear();
  };

  limiter.hits = hits;

  return limiter;
}

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
});

const dispatchRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many emergency dispatch requests from this IP. Please try again after 15 minutes.'
});

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  dispatchRateLimiter
};
