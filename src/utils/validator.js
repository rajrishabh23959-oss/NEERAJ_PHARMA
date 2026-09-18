// Comprehensive Input Validation & Coercion Helpers
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function isStrictNumber(val) {
  if (val === null || val === undefined || val === '' || typeof val === 'boolean') return false;
  const n = Number(val);
  return Number.isFinite(n);
}

function isNonNegativeInteger(val) {
  if (!isStrictNumber(val)) return false;
  const n = Number(val);
  return Number.isInteger(n) && n >= 0;
}

function isValidCoordinates(lat, lng) {
  if (!isStrictNumber(lat) || !isStrictNumber(lng)) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
}

function safeTrim(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}

function isValidPhone(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (s.length < 3 || s.length > 25) return false;
  return /^[+\d\s\-()]+$/.test(s);
}

module.exports = {
  isValidEmail,
  isStrictNumber,
  isNonNegativeInteger,
  isValidCoordinates,
  safeTrim,
  isValidPhone
};
