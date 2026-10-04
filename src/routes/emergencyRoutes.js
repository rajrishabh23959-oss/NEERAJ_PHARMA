const express = require('express');
const emergencyController = require('../controllers/emergencyController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Emergency Contacts CRUD
router.get('/contacts', optionalAuthenticate, asyncHandler(emergencyController.getEmergencyContacts));
router.post('/contacts', authenticate, authorizeRoles('admin'), asyncHandler(emergencyController.createEmergencyContact));
router.put('/contacts/:id', authenticate, authorizeRoles('admin'), asyncHandler(emergencyController.updateEmergencyContact));
router.delete('/contacts/:id', authenticate, authorizeRoles('admin'), asyncHandler(emergencyController.deleteEmergencyContact));

// Ambulances CRUD & Search
router.get('/ambulances', optionalAuthenticate, asyncHandler(emergencyController.listAmbulances));
router.post('/ambulances', authenticate, authorizeRoles('admin'), asyncHandler(emergencyController.createAmbulance));
router.put('/ambulances/:id', authenticate, authorizeRoles('admin'), asyncHandler(emergencyController.updateAmbulance));
router.delete('/ambulances/:id', authenticate, authorizeRoles('admin'), asyncHandler(emergencyController.deleteAmbulance));

// Ambulance Dispatch & Live Tracking
router.post('/dispatch', asyncHandler(emergencyController.requestAmbulance));
router.get('/dispatch/:trackingId', asyncHandler(emergencyController.getDispatchStatus));

module.exports = router;
