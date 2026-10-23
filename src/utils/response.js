// Standardized API response formatters
function success(res, data = null, message = 'Operation successful', statusCode = 200, meta = null) {
  const response = {
    success: true,
    message,
    data
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

function error(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
}

module.exports = {
  success,
  error
};
