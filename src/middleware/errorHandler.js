// Centralized Express Error Handling & Async Wrapper Middleware
const { error } = require('../utils/response');

class AppError extends Error {
  constructor(message, statusCode = 400, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

function notFoundHandler(req, res, next) {
  return error(
    res,
    `Endpoint ${req.method} ${req.originalUrl || req.path} not found on this server`,
    404,
    {
      availableEndpoints: {
        health: '/api/health',
        auth: '/api/auth',
        hospitals: '/api/hospitals',
        doctors: '/api/doctors',
        locations: '/api/locations',
        emergency: '/api/emergency',
        admin: '/api/admin'
      }
    }
  );
}

function errorHandler(err, req, res, next) {
  if (res.writableEnded) return;

  // Handle Express JSON body parser SyntaxError
  if (err instanceof SyntaxError || err.type === 'entity.parse.failed') {
    return error(res, 'Malformed JSON payload in request body', 400);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const details = err.errors || null;

  return error(res, message, statusCode, details);
}

module.exports = {
  AppError,
  asyncHandler,
  notFoundHandler,
  errorHandler
};
