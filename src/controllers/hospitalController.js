const Hospital = require('../models/Hospital');
const { calculateHaversineDistance, isValidCoordinates } = require('../utils/geoUtils');
const { escapeRegex, parsePagination, MAX_PAGE_LIMIT } = require('../utils/sanitize');

/**
 * @desc    Find nearby hospitals using latitude, longitude, and radius
 * @route   GET /api/v1/hospitals/nearby
 * @access  Public
 */
exports.getNearbyHospitals = async (req, res, next) => {
  try {
    const { lat, lng, radius = 15, specialty, facility, hasIcu, hasOxygen, is24x7, type, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both latitude (lat) and longitude (lng) query parameters.',
      });
    }

    if (!isValidCoordinates(lat, lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values. Latitude must be -90 to 90, Longitude -180 to 180.',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistanceInMeters = parseFloat(radius) * 1000; // km to meters

    // Build query filter
    const query = {
      isActive: true,
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceInMeters,
        },
      },
    };

    if (specialty) {
      query.specialties = { $regex: new RegExp(escapeRegex(specialty), 'i') };
    }

    if (facility) {
      query.facilities = { $regex: new RegExp(escapeRegex(facility), 'i') };
    }

    if (hasIcu === 'true') {
      query['availability.availableIcuBeds'] = { $gt: 0 };
    }

    if (hasOxygen === 'true') {
      query['availability.availableOxygenBeds'] = { $gt: 0 };
    }

    if (is24x7 === 'true') {
      query.is24x7 = true;
    }

    if (type) {
      query.type = type;
    }

    const safeLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(limit, 10) || 20));

    const hospitals = await Hospital.find(query)
      .limit(safeLimit)
      .populate('doctors')
      .populate('ambulances');

    // Add exact calculated distance in km to each hospital object
    const results = hospitals.map((h) => {
      const hObj = h.toObject();
      const [hLng, hLat] = h.location.coordinates;
      hObj.distanceKm = calculateHaversineDistance(latitude, longitude, hLat, hLng);
      return hObj;
    });

    res.status(200).json({
      success: true,
      count: results.length,
      searchOrigin: { latitude, longitude, radiusKm: parseFloat(radius) },
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Search and filter hospitals
 * @route   GET /api/v1/hospitals/search
 * @access  Public
 */
exports.searchHospitals = async (req, res, next) => {
  try {
    const {
      q,
      city,
      state,
      type,
      specialty,
      facility,
      minBeds,
      isVerified,
      is24x7,
      page = 1,
      limit = 10,
      sortBy = 'rating',
      sortOrder = 'desc',
    } = req.query;

    const query = { isActive: true };

    // Keyword search across multiple fields
    if (q) {
      const safeQ = escapeRegex(q);
      const regex = new RegExp(safeQ, 'i');
      query.$or = [
        { name: regex },
        { 'address.city': regex },
        { 'address.state': regex },
        { 'address.street': regex },
        { specialties: regex },
        { facilities: regex },
      ];
    }

    if (city) {
      query['address.city'] = new RegExp(escapeRegex(city), 'i');
    }

    if (state) {
      query['address.state'] = new RegExp(escapeRegex(state), 'i');
    }

    if (type) {
      query.type = type;
    }

    if (specialty) {
      query.specialties = { $regex: new RegExp(escapeRegex(specialty), 'i') };
    }

    if (facility) {
      query.facilities = { $regex: new RegExp(escapeRegex(facility), 'i') };
    }

    if (minBeds) {
      query['availability.availableBeds'] = { $gte: parseInt(minBeds, 10) };
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    if (is24x7 !== undefined) {
      query.is24x7 = is24x7 === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const { pageNum, limitNum, skip } = parsePagination(page, limit, 10);

    const [hospitals, total] = await Promise.all([
      Hospital.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Hospital.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: hospitals.length,
      data: hospitals,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all hospitals
 * @route   GET /api/v1/hospitals
 * @access  Public
 */
exports.getHospitals = async (req, res, next) => {
  try {
    const { pageNum, limitNum, skip } = parsePagination(req.query.page, req.query.limit, 10);

    const [hospitals, total] = await Promise.all([
      Hospital.find({ isActive: true })
        .skip(skip)
        .limit(limitNum)
        .sort('-createdAt'),
      Hospital.countDocuments({ isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: hospitals.length,
      data: hospitals,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single hospital by ID
 * @route   GET /api/v1/hospitals/:id
 * @access  Public
 */
exports.getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('doctors')
      .populate('ambulances');

    if (!hospital || !hospital.isActive) {
      return res.status(404).json({
        success: false,
        message: `Hospital not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new hospital
 * @route   POST /api/v1/hospitals
 * @access  Private (Admin / Hospital Admin)
 */
exports.createHospital = async (req, res, next) => {
  try {
    const {
      name,
      registrationNumber,
      type,
      address,
      latitude,
      longitude,
      contactPhone,
      emergencyHotline,
      email,
      website,
      operatingHours,
      is24x7,
      facilities,
      specialties,
      availability,
    } = req.body;

    // Validate location coordinates
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both latitude and longitude for the hospital location.',
      });
    }

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values.',
      });
    }

    const hospitalData = {
      name,
      registrationNumber,
      type: type || 'Multi-Specialty',
      address,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      contactPhone,
      emergencyHotline,
      email,
      website,
      operatingHours: operatingHours || '24 Hours / 7 Days',
      is24x7: is24x7 !== undefined ? is24x7 : true,
      facilities: facilities || [],
      specialties: specialties || [],
      availability: availability || {},
    };

    const hospital = await Hospital.create(hospitalData);

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully',
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital
 * @route   PUT /api/v1/hospitals/:id
 * @access  Private (Admin / Assigned Hospital Admin)
 */
exports.updateHospital = async (req, res, next) => {
  try {
    let hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: `Hospital not found with id of ${req.params.id}`,
      });
    }

    // Role check: If user is hospital_admin, ensure they manage this hospital
    if (req.user.role === 'hospital_admin') {
      if (!req.user.hospitalAssigned || req.user.hospitalAssigned.toString() !== hospital._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this hospital.',
        });
      }
    }

    // Whitelist permitted update fields (prevent tampering with isVerified, verifiedBy, rating, etc.)
    const allowedFields = [
      'name',
      'registrationNumber',
      'type',
      'address',
      'contactPhone',
      'emergencyHotline',
      'email',
      'website',
      'operatingHours',
      'is24x7',
      'facilities',
      'specialties',
      'image',
      'isActive',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Handle coordinate updates if provided
    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      if (!isValidCoordinates(req.body.latitude, req.body.longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude or longitude values.',
        });
      }
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
      };
    }

    hospital = await Hospital.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Hospital updated successfully',
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete hospital (soft delete)
 * @route   DELETE /api/v1/hospitals/:id
 * @access  Private (Admin only)
 */
exports.deleteHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: `Hospital not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hospital removed successfully',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update emergency availability (beds, ICU, oxygen)
 * @route   PATCH /api/v1/hospitals/:id/availability
 * @access  Private (Admin / Hospital Admin)
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const { availableBeds, availableIcuBeds, availableOxygenBeds, isEmergencyAccepting, ambulanceCount } = req.body;

    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: `Hospital not found with id of ${req.params.id}`,
      });
    }

    // Role check: If user is hospital_admin, ensure they manage this hospital
    if (req.user.role === 'hospital_admin') {
      if (!req.user.hospitalAssigned || req.user.hospitalAssigned.toString() !== hospital._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update emergency availability for this hospital.',
        });
      }
    }

    if (availableBeds !== undefined) hospital.availability.availableBeds = availableBeds;
    if (availableIcuBeds !== undefined) hospital.availability.availableIcuBeds = availableIcuBeds;
    if (availableOxygenBeds !== undefined) hospital.availability.availableOxygenBeds = availableOxygenBeds;
    if (isEmergencyAccepting !== undefined) hospital.availability.isEmergencyAccepting = isEmergencyAccepting;
    if (ambulanceCount !== undefined) hospital.availability.ambulanceCount = ambulanceCount;
    hospital.availability.lastUpdated = Date.now();

    await hospital.save();

    res.status(200).json({
      success: true,
      message: 'Hospital emergency availability updated in real-time',
      data: hospital.availability,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Verify hospital credentials
 * @route   PATCH /api/v1/hospitals/:id/verify
 * @access  Private (Super Admin)
 */
exports.verifyHospital = async (req, res, next) => {
  try {
    const { isVerified = true } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      {
        isVerified,
        verifiedBy: isVerified ? req.user.id : null,
      },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: `Hospital not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Hospital verification status set to ${isVerified}`,
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};
