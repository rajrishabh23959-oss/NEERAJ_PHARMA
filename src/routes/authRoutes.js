const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { loginRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', loginRateLimiter, asyncHandler(authController.login));
router.get('/me', authenticate, asyncHandler(authController.getMe));
router.put('/me', authenticate, asyncHandler(authController.updateProfile));

module.exports = router;
