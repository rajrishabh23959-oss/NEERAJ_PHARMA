const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserStatus,
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

// All admin routes strictly require super_admin role
router.use(protect);
router.use(authorize('super_admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', toggleUserStatus);

module.exports = router;
