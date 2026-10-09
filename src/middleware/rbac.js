// Role-Based Access Control (RBAC) Middleware
const { error } = require('../utils/response');

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required before authorization check', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(
        res,
        `Access denied. Requires [${allowedRoles.join(', ')}] role. Current role: '${req.user.role}'`,
        403
      );
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
