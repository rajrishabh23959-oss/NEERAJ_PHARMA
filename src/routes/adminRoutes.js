const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Dashboard & System Metrics
router.get('/stats', authenticate, authorizeRoles('admin'), asyncHandler(adminController.getDashboardStats));

// Hospital Verification Workflow
router.get('/hospitals/pending', authenticate, authorizeRoles('admin'), asyncHandler(adminController.getPendingHospitals));
router.patch('/hospitals/:id/verify', authenticate, authorizeRoles('admin'), asyncHandler(adminController.verifyHospital));

// Emergency Services & Ambulance Verification Workflow
router.get('/emergency/pending', authenticate, authorizeRoles('admin'), asyncHandler(adminController.getPendingEmergencyServices));
router.patch('/emergency-contacts/:id/verify', authenticate, authorizeRoles('admin'), asyncHandler(adminController.verifyEmergencyContact));
router.patch('/ambulances/:id/verify', authenticate, authorizeRoles('admin'), asyncHandler(adminController.verifyAmbulance));

// Complete User Management
router.get('/users', authenticate, authorizeRoles('admin'), asyncHandler(adminController.getUsers));
router.get('/users/:id', authenticate, authorizeRoles('admin'), asyncHandler(adminController.getUserById));
router.put('/users/:id', authenticate, authorizeRoles('admin'), asyncHandler(adminController.updateUser));
router.patch('/users/:id/role', authenticate, authorizeRoles('admin'), asyncHandler(adminController.updateUserRole));
router.patch('/users/:id/status', authenticate, authorizeRoles('admin'), asyncHandler(adminController.updateUserStatus));
router.delete('/users/:id', authenticate, authorizeRoles('admin'), asyncHandler(adminController.deleteUser));

// Seed Reset
router.post('/reseed', authenticate, authorizeRoles('admin'), asyncHandler(adminController.reseed));

module.exports = router;
