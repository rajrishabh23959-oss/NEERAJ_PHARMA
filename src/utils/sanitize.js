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

module.exports = {
  escapeRegex,
  MAX_PAGE_LIMIT,
  parsePagination,
};
