const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} = require('../controllers/doctorController');

const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const doctorValidation = [
  check('name', 'Doctor name is required').notEmpty().trim(),
  check('hospital', 'Associated hospital ID is required').isMongoId(),
  check('specialization', 'Specialization is required').notEmpty(),
  check('qualification', 'Qualification is required').notEmpty(),
  validate,
];

router.get('/', getDoctors);
router.get('/:id', getDoctorById);

router.post(
  '/',
  protect,
  authorize('hospital_admin', 'super_admin'),
  doctorValidation,
  createDoctor
);

router.put(
  '/:id',
  protect,
  authorize('hospital_admin', 'super_admin'),
  updateDoctor
);

router.delete(
  '/:id',
  protect,
  authorize('hospital_admin', 'super_admin'),
  deleteDoctor
);

module.exports = router;
