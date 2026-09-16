const EmergencyContact = require('../models/EmergencyContact');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const { calculateHaversineDistance, isValidCoordinates } = require('../utils/geoUtils');

/**
 * @desc    Get emergency contacts / helplines
 * @route   GET /api/v1/emergency/contacts
 * @access  Public
 */
exports.getEmergencyContacts = async (req, res, next) => {
  try {
    const { category, city, level } = req.query;

    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (level) {
      query.level = level;
    }

    if (city) {
      query.$or = [
        { city: new RegExp(city, 'i') },
        { city: 'All Cities' },
        { level: 'National' },
      ];
    }

    const contacts = await EmergencyContact.find(query).sort({ priority: 1, category: 1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create emergency contact / helpline
 * @route   POST /api/v1/emergency/contacts
 * @access  Private (Admin only)
 */
exports.createEmergencyContact = async (req, res, next) => {
  try {
    const contact = await EmergencyContact.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Emergency contact created successfully',
      data: contact,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update emergency contact
 * @route   PUT /api/v1/emergency/contacts/:id
 * @access  Private (Admin only)
 */
exports.updateEmergencyContact = async (req, res, next) => {
  try {
    const contact = await EmergencyContact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: `Emergency contact not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: contact,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete emergency contact
 * @route   DELETE /api/v1/emergency/contacts/:id
 * @access  Private (Admin only)
 */
exports.deleteEmergencyContact = async (req, res, next) => {
  try {
    const contact = await EmergencyContact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: `Emergency contact not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Emergency contact deleted successfully',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get ambulances (nearby or list by city/status)
 * @route   GET /api/v1/emergency/ambulances
 * @access  Public
 */
exports.getAmbulances = async (req, res, next) => {
  try {
    const { lat, lng, radius = 25, city, status, type } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    } else {
      // By default show available and on_call
      query.status = { $in: ['available', 'on_call'] };
    }

    if (type) {
      query.type = type;
    }

    // Geospatial search if lat & lng are provided
    if (lat && lng && isValidCoordinates(lat, lng)) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const maxMeters = parseFloat(radius) * 1000;

      query.currentLocation = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxMeters,
        },
      };

      const ambulances = await Ambulance.find(query).populate('baseHospital', 'name contactPhone emergencyHotline address');

      const results = ambulances.map((amb) => {
        const ambObj = amb.toObject();
        const [aLng, aLat] = amb.currentLocation.coordinates;
        ambObj.distanceKm = calculateHaversineDistance(latitude, longitude, aLat, aLng);
        return ambObj;
      });

      return res.status(200).json({
        success: true,
        count: results.length,
        searchOrigin: { latitude, longitude, radiusKm: parseFloat(radius) },
        data: results,
      });
    }

    if (city) {
      query.city = new RegExp(city, 'i');
    }

    const ambulances = await Ambulance.find(query).populate('baseHospital', 'name contactPhone emergencyHotline address');

    res.status(200).json({
      success: true,
      count: ambulances.length,
      data: ambulances,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Register a new ambulance
 * @route   POST /api/v1/emergency/ambulances
 * @access  Private (Admin / Hospital Admin)
 */
exports.createAmbulance = async (req, res, next) => {
  try {
    const {
      vehicleNumber,
      type,
      providerName,
      baseHospital,
      driverName,
      contactNumber,
      alternateContact,
      city,
      latitude,
      longitude,
      equipment,
      chargesPerKm,
      baseFare,
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Ambulance GPS coordinates [latitude, longitude] are required.',
      });
    }

    const ambulance = await Ambulance.create({
      vehicleNumber,
      type,
      providerName,
      baseHospital: baseHospital || null,
      driverName,
      contactNumber,
      alternateContact,
      city,
      currentLocation: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      equipment: equipment || ['First Aid Kit', 'Oxygen Cylinder'],
      chargesPerKm: chargesPerKm || 25,
      baseFare: baseFare || 500,
    });

    res.status(201).json({
      success: true,
      message: 'Ambulance registered successfully',
      data: ambulance,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update ambulance status & location
 * @route   PATCH /api/v1/emergency/ambulances/:id/status
 * @access  Private (Admin / Hospital Admin)
 */
exports.updateAmbulanceStatus = async (req, res, next) => {
  try {
    const { status, latitude, longitude } = req.body;

    const ambulance = await Ambulance.findById(req.params.id);

    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message: `Ambulance not found with id of ${req.params.id}`,
      });
    }

    if (status) {
      ambulance.status = status;
    }

    if (latitude !== undefined && longitude !== undefined) {
      if (isValidCoordinates(latitude, longitude)) {
        ambulance.currentLocation = {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };
      }
    }

    await ambulance.save();

    res.status(200).json({
      success: true,
      message: 'Ambulance status updated successfully',
      data: ambulance,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    1-Tap Quick SOS Emergency Aggregator
 * @route   GET /api/v1/emergency/quick-sos
 * @access  Public
 */
exports.getQuickSos = async (req, res, next) => {
  try {
    const { lat, lng, city = 'Delhi' } = req.query;

    let nearestHospitals = [];
    let nearestAmbulances = [];

    // If coordinates provided, find immediate nearest with ICU & emergency acceptance
    if (lat && lng && isValidCoordinates(lat, lng)) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      // Closest emergency hospitals within 30km
      const hospitals = await Hospital.find({
        isActive: true,
        'availability.isEmergencyAccepting': true,
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: 30000,
          },
        },
      })
        .limit(3)
        .select('name contactPhone emergencyHotline address availability location type');

      nearestHospitals = hospitals.map((h) => {
        const obj = h.toObject();
        const [hLng, hLat] = h.location.coordinates;
        obj.distanceKm = calculateHaversineDistance(latitude, longitude, hLat, hLng);
        return obj;
      });

      // Closest available ambulances within 25km
      const ambulances = await Ambulance.find({
        status: 'available',
        currentLocation: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: 25000,
          },
        },
      })
        .limit(3)
        .select('vehicleNumber driverName contactNumber providerName type currentLocation');

      nearestAmbulances = ambulances.map((amb) => {
        const obj = amb.toObject();
        const [aLng, aLat] = amb.currentLocation.coordinates;
        obj.distanceKm = calculateHaversineDistance(latitude, longitude, aLat, aLng);
        return obj;
      });
    } else {
      // Fallback to city matching
      nearestHospitals = await Hospital.find({
        isActive: true,
        'availability.isEmergencyAccepting': true,
        'address.city': new RegExp(city, 'i'),
      })
        .limit(3)
        .select('name contactPhone emergencyHotline address availability location type');

      nearestAmbulances = await Ambulance.find({
        status: 'available',
        city: new RegExp(city, 'i'),
      })
        .limit(3)
        .select('vehicleNumber driverName contactNumber providerName type currentLocation');
    }

    // High-priority emergency helplines
    const nationalHelplines = await EmergencyContact.find({
      isActive: true,
      priority: { $lte: 2 },
    })
      .sort({ priority: 1 })
      .limit(6);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      sosSummary: {
        nearestHospitals,
        nearestAmbulances,
        urgentHelplines: nationalHelplines,
        instructions: [
          'Stay calm. Provide your exact location to dispatchers.',
          'Call 112 or 108 for national emergency ambulance response.',
          'If moving patient personally, select the nearest hospital with available ICU beds above.',
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};
