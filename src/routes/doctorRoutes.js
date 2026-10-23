const express = require('express');
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', asyncHandler(doctorController.getDoctors));
router.get('/:id', asyncHandler(doctorController.getDoctorById));
router.post('/', authenticate, authorizeRoles('admin'), asyncHandler(doctorController.createDoctor));
router.put('/:id', authenticate, authorizeRoles('admin'), asyncHandler(doctorController.updateDoctor));
router.delete('/:id', authenticate, authorizeRoles('admin'), asyncHandler(doctorController.deleteDoctor));

module.exports = router;
