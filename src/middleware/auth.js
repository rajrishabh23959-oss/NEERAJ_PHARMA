// JWT Authentication & User Status Verification Middleware
const { verifyJWT } = require('../utils/crypto');
const { error } = require('../utils/response');
const { db } = require('../config/db');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authorization token required. Format: Bearer <token>', 401);
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = verifyJWT(token);
    const user = db.findById('users', decoded.id);

    if (!user) {
      return error(res, 'User associated with this token no longer exists', 401);
    }

    if (user.status && user.status !== 'active') {
      return error(res, `Account access denied: your account is currently ${user.status}`, 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status || 'active'
    };

    next();
  } catch (err) {
    return error(res, `Authentication failed: ${err.message}`, 401);
  }
}

function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const decoded = verifyJWT(token);
      const user = db.findById('users', decoded.id);
      if (user && (!user.status || user.status === 'active')) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status || 'active'
        };
      }
    } catch (_) {
      // Ignore invalid optional token
    }
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate
};
