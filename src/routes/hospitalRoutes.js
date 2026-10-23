const express = require('express');
const hospitalController = require('../controllers/hospitalController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', optionalAuthenticate, asyncHandler(hospitalController.getAllHospitals));
router.get('/:id', asyncHandler(hospitalController.getHospitalById));
router.get('/:id/availability', asyncHandler(hospitalController.getHospitalAvailability));
router.patch('/:id/availability', authenticate, authorizeRoles('admin'), asyncHandler(hospitalController.updateHospitalAvailability));
router.patch('/:id/contacts', authenticate, authorizeRoles('admin'), asyncHandler(hospitalController.updateHospitalContacts));
router.post('/', authenticate, asyncHandler(hospitalController.createHospital));
router.put('/:id', authenticate, authorizeRoles('admin'), asyncHandler(hospitalController.updateHospital));
router.delete('/:id', authenticate, authorizeRoles('admin'), asyncHandler(hospitalController.deleteHospital));

module.exports = router;
