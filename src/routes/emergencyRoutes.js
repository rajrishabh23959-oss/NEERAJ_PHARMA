const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

const {
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getAmbulances,
  createAmbulance,
  updateAmbulanceStatus,
  getQuickSos,
} = require('../controllers/emergencyController');

const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const emergencyContactValidation = [
  check('category', 'Category is required').notEmpty(),
  check('title', 'Title is required').notEmpty().trim(),
  check('number', 'Emergency phone number is required').notEmpty(),
  validate,
];

const ambulanceValidation = [
  check('vehicleNumber', 'Vehicle registration number is required').notEmpty(),
  check('providerName', 'Provider name is required').notEmpty(),
  check('driverName', 'Driver name is required').notEmpty(),
  check('contactNumber', 'Contact phone number is required').notEmpty(),
  check('city', 'Base city is required').notEmpty(),
  check('latitude', 'Valid latitude is required (-90 to 90)').isFloat({ min: -90, max: 90 }),
  check('longitude', 'Valid longitude is required (-180 to 180)').isFloat({ min: -180, max: 180 }),
  validate,
];

// 1-Tap Quick SOS endpoint
router.get('/quick-sos', getQuickSos);

// Emergency Contacts / Helplines
router.get('/contacts', getEmergencyContacts);
router.post(
  '/contacts',
  protect,
  authorize('super_admin'),
  emergencyContactValidation,
  createEmergencyContact
);
router.put(
  '/contacts/:id',
  protect,
  authorize('super_admin'),
  updateEmergencyContact
);
router.delete(
  '/contacts/:id',
  protect,
  authorize('super_admin'),
  deleteEmergencyContact
);

// Ambulance Fleet Endpoints
router.get('/ambulances', getAmbulances);
router.post(
  '/ambulances',
  protect,
  authorize('hospital_admin', 'super_admin'),
  ambulanceValidation,
  createAmbulance
);
router.patch(
  '/ambulances/:id/status',
  protect,
  authorize('hospital_admin', 'super_admin'),
  updateAmbulanceStatus
);

module.exports = router;
