const express = require('express');
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', asyncHandler(locationController.getLocations));
router.get('/:id', asyncHandler(locationController.getLocationById));
router.post('/', authenticate, authorizeRoles('admin'), asyncHandler(locationController.createLocation));
router.put('/:id', authenticate, authorizeRoles('admin'), asyncHandler(locationController.updateLocation));
router.delete('/:id', authenticate, authorizeRoles('admin'), asyncHandler(locationController.deleteLocation));

module.exports = router;
