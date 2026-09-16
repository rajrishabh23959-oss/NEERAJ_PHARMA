const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  saveHospital,
  removeSavedHospital,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const registerValidation = [
  check('name', 'Name is required').notEmpty().trim(),
  check('email', 'Please include a valid email address').isEmail().normalizeEmail(),
  check('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
  validate,
];

const loginValidation = [
  check('email', 'Please include a valid email address').isEmail().normalizeEmail(),
  check('password', 'Password is required').notEmpty(),
  validate,
];

const updateDetailsValidation = [
  check('name', 'Name cannot be empty if provided').optional().notEmpty().trim(),
  check('phone', 'Phone must be a valid string').optional().isString(),
  validate,
];

const updatePasswordValidation = [
  check('currentPassword', 'Current password is required').notEmpty(),
  check('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 }),
  validate,
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetailsValidation, updateDetails);
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);
router.post('/saved-hospitals/:hospitalId', protect, saveHospital);
router.delete('/saved-hospitals/:hospitalId', protect, removeSavedHospital);

module.exports = router;
