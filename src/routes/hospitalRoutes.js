const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

const {
  getNearbyHospitals,
  searchHospitals,
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital,
  updateAvailability,
  verifyHospital,
} = require('../controllers/hospitalController');

const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const hospitalValidation = [
  check('name', 'Hospital name is required').notEmpty().trim(),
  check('address.street', 'Street address is required').notEmpty(),
  check('address.city', 'City is required').notEmpty(),
  check('address.state', 'State is required').notEmpty(),
  check('address.postalCode', 'Postal code is required').notEmpty(),
  check('latitude', 'Valid latitude is required (-90 to 90)').isFloat({ min: -90, max: 90 }),
  check('longitude', 'Valid longitude is required (-180 to 180)').isFloat({ min: -180, max: 180 }),
  check('contactPhone', 'Contact phone number is required').notEmpty(),
  check('emergencyHotline', 'Emergency hotline number is required').notEmpty(),
  validate,
];

// Public search and geolocation endpoints
router.get('/nearby', getNearbyHospitals);
router.get('/search', searchHospitals);
router.get('/', getHospitals);
router.get('/:id', getHospitalById);

// Admin & Hospital Admin management endpoints
router.post(
  '/',
  protect,
  authorize('hospital_admin', 'super_admin'),
  hospitalValidation,
  createHospital
);

router.put(
  '/:id',
  protect,
  authorize('hospital_admin', 'super_admin'),
  updateHospital
);

router.delete(
  '/:id',
  protect,
  authorize('super_admin'),
  deleteHospital
);

router.patch(
  '/:id/availability',
  protect,
  authorize('hospital_admin', 'super_admin'),
  updateAvailability
);

router.patch(
  '/:id/verify',
  protect,
  authorize('super_admin'),
  verifyHospital
);

module.exports = router;
