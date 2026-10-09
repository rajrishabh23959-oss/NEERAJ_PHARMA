// Authentication Controller: Registration, Login, Profile Management
const { db } = require('../config/db');
const { hashPassword, verifyPassword, generateJWT } = require('../utils/crypto');
const { validateUserRegister, validateUserLogin } = require('../models/schemas');
const { safeTrim, isValidEmail, isValidPhone } = require('../utils/validator');
const { success, error } = require('../utils/response');

function register(req, res) {
  const body = req.body || {};

  // Security Fix: Strictly prohibit self-assignment of privileged roles at registration
  if (body.role !== undefined && String(body.role).trim().toLowerCase() !== 'user') {
    return error(
      res,
      'Role self-assignment is not permitted during registration. Only administrators can grant elevated roles.',
      403
    );
  }

  const { isValid, errors } = validateUserRegister(body);
  if (!isValid) {
    return error(res, 'Validation failed', 400, errors);
  }

  const name = safeTrim(body.name);
  const normalizedEmail = safeTrim(body.email).toLowerCase();
  const phoneStr = body.phoneNumber !== undefined && body.phoneNumber !== null ? safeTrim(body.phoneNumber) : '';
  const departmentStr = body.department ? safeTrim(body.department) : 'Public User';

  const existingUser = db.findOne('users', u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return error(res, 'An account with this email address already exists', 409);
  }

  const newUser = db.create('users', {
    name,
    email: normalizedEmail,
    passwordHash: hashPassword(body.password),
    role: 'user',
    phoneNumber: phoneStr,
    department: departmentStr,
    status: 'active'
  });

  const token = generateJWT({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role
  });

  return success(
    res,
    {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        department: newUser.department,
        status: newUser.status,
        createdAt: newUser.createdAt
      },
      token
    },
    'User registered successfully',
    201
  );
}

function login(req, res) {
  const body = req.body || {};
  const { isValid, errors } = validateUserLogin(body);
  if (!isValid) {
    return error(res, 'Validation failed', 400, errors);
  }

  const normalizedEmail = safeTrim(body.email).toLowerCase();
  const user = db.findOne('users', u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return error(res, 'Invalid email or password credentials', 401);
  }

  if (user.status && user.status !== 'active') {
    return error(res, `Account access denied: your account is currently ${user.status}`, 403);
  }

  const isMatch = verifyPassword(body.password, user.passwordHash);
  if (!isMatch) {
    return error(res, 'Invalid email or password credentials', 401);
  }

  const token = generateJWT({
    id: user.id,
    email: user.email,
    role: user.role
  });

  return success(
    res,
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        department: user.department,
        status: user.status || 'active',
        createdAt: user.createdAt
      },
      token
    },
    'Login successful'
  );
}

function getMe(req, res) {
  const user = db.findById('users', req.user.id);
  if (!user) {
    return error(res, 'User not found', 404);
  }

  return success(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    department: user.department,
    status: user.status || 'active',
    createdAt: user.createdAt
  }, 'Profile retrieved successfully');
}

function updateProfile(req, res) {
  const body = req.body || {};
  const updates = {};

  if (body.name !== undefined) {
    const n = safeTrim(body.name);
    if (n.length < 2) return error(res, 'Name must be at least 2 characters long', 400);
    updates.name = n;
  }

  if (body.phoneNumber !== undefined) {
    if (body.phoneNumber !== '' && !isValidPhone(body.phoneNumber)) {
      return error(res, 'Invalid phoneNumber format', 400);
    }
    updates.phoneNumber = safeTrim(body.phoneNumber);
  }

  if (body.department !== undefined) {
    updates.department = safeTrim(body.department);
  }

  if (body.password !== undefined) {
    if (typeof body.password !== 'string' || body.password.length < 6) {
      return error(res, 'New password must be at least 6 characters long', 400);
    }
    updates.passwordHash = hashPassword(body.password);
  }

  const updatedUser = db.updateById('users', req.user.id, updates);
  if (!updatedUser) {
    return error(res, 'User not found', 404);
  }

  return success(res, {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    phoneNumber: updatedUser.phoneNumber,
    department: updatedUser.department,
    status: updatedUser.status || 'active'
  }, 'Profile updated successfully');
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
