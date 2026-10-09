// Centralized Express Request Validation Middleware
const { error } = require('../utils/response');
const schemas = require('../models/schemas');

function validateQuery(req, res, next) {
  const { isValid, errors } = schemas.validateSearchQuery(req.query);
  if (!isValid) {
    return error(res, `Invalid query parameters: ${errors.join('; ')}`, 400, errors);
  }
  next();
}

function validateBody(validatorFn, isUpdate = false) {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req.body, isUpdate);
    if (!isValid) {
      return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
    }
    next();
  };
}

module.exports = {
  validateQuery,
  validateBody
};
