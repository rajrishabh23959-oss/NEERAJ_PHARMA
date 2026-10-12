/**
 * Utility functions for input sanitization and regex escaping
 */

/**
 * Escapes special characters from a string for safe use in RegExp.
 * Prevents ReDoS attacks and regex syntax errors from user input.
 * @param {string} str - User-supplied string
 * @returns {string} - Escaped string safe for new RegExp()
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Maximum items allowed per page across all pagination endpoints
 */
const MAX_PAGE_LIMIT = 100;

/**
 * Normalizes page and limit query parameters safely
 * @param {any} page - Page number from req.query
 * @param {any} limit - Limit from req.query
 * @param {number} defaultLimit - Default limit if not specified
 * @returns {{ pageNum: number, limitNum: number, skip: number }}
 */
function parsePagination(page, limit, defaultLimit = 10) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const rawLimit = parseInt(limit, 10) || defaultLimit;
  const limitNum = Math.min(MAX_PAGE_LIMIT, Math.max(1, rawLimit));
  const skip = (pageNum - 1) * limitNum;

  return { pageNum, limitNum, skip };
}

/**
 * Validates that an environment secret is present, meets minimum length,
 * and does not contain trivial or placeholder values.
 * @param {string} secretName - Name of the environment variable
 * @param {string} value - Secret value
 * @param {number} minLength - Minimum required length (default 32)
 */
function validateSecretStrength(secretName, value, minLength = 32) {
  if (!value || typeof value !== 'string') {
    throw new Error(`CRITICAL CONFIGURATION ERROR: Missing required environment variable '${secretName}'.`);
  }
  if (value.trim().length < minLength) {
    throw new Error(
      `CRITICAL CONFIGURATION ERROR: '${secretName}' is too weak (${value.trim().length} chars). It must be at least ${minLength} characters long.`
    );
  }
  const lower = value.toLowerCase();
  const forbiddenPatterns = [
    'placeholder',
    'your_',
    'changeme',
    'change_me',
    'password123',
    'admin123',
    '12345678',
    'secret_key_here',
  ];
  for (const pattern of forbiddenPatterns) {
    if (lower.includes(pattern)) {
      throw new Error(
        `CRITICAL CONFIGURATION ERROR: '${secretName}' contains an insecure/placeholder pattern ('${pattern}'). Please set a real, cryptographically secure secret.`
      );
    }
  }
  const uniqueChars = new Set(value.trim()).size;
  if (uniqueChars < 6) {
    throw new Error(
      `CRITICAL CONFIGURATION ERROR: '${secretName}' lacks character diversity. Please use a high-entropy secret.`
    );
  }
}

/**
 * Validates CORS configuration, strictly requiring an explicit CLIENT_URL in production.
 * @param {string} nodeEnv - Current NODE_ENV
 * @param {string} clientUrl - CLIENT_URL environment variable
 * @returns {string|string[]} - Allowed CORS origins
 */
function getCorsOriginConfig(nodeEnv, clientUrl) {
  if (nodeEnv === 'production') {
    if (!clientUrl || clientUrl.trim() === '' || clientUrl.trim() === '*') {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: Explicit CLIENT_URL is required in production environment (wildcard \'*\' is disallowed for security).'
      );
    }
    if (clientUrl.includes(',')) {
      return clientUrl.split(',').map((u) => u.trim());
    }
    return clientUrl.trim();
  }
  return clientUrl || '*';
}

module.exports = {
  escapeRegex,
  MAX_PAGE_LIMIT,
  parsePagination,
  validateSecretStrength,
  getCorsOriginConfig,
};
