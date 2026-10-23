// Cryptographic Utilities: bcryptjs / PBKDF2 Password Hashing & jsonwebtoken
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');

function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

function verifyPassword(password, storedPassword) {
  return bcrypt.compareSync(String(password), storedPassword);
}

function generateJWT(payload, expiresInSeconds = config.JWT_EXPIRES_IN) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: expiresInSeconds });
}

function verifyJWT(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is missing or invalid');
  }
  return jwt.verify(token, config.JWT_SECRET);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT
};
