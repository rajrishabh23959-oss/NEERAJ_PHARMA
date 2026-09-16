const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');

/**
 * @desc    Get all doctors with filters
 * @route   GET /api/v1/doctors
 * @access  Public
 */
exports.getDoctors = async (req, res, next) => {
  try {
    const { hospitalId, specialization, isEmergencyAvailable, city, page = 1, limit = 10 } = req.query;

    const query = {};

    if (hospitalId) {
      query.hospital = hospitalId;
    }

    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    if (isEmergencyAvailable !== undefined) {
      query.isEmergencyAvailable = isEmergencyAvailable === 'true';
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let findQuery = Doctor.find(query)
      .populate('hospital', 'name address contactPhone emergencyHotline')
      .skip(skip)
      .limit(parseInt(limit, 10))
      .sort('name');

    const [doctors, total] = await Promise.all([
      findQuery,
      Doctor.countDocuments(query),
    ]);

    // Optional city filter on populated hospital
    let filteredDoctors = doctors;
    if (city) {
      filteredDoctors = doctors.filter(
        (doc) =>
          doc.hospital &&
          doc.hospital.address &&
          doc.hospital.address.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      count: filteredDoctors.length,
      data: filteredDoctors,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single doctor by ID
 * @route   GET /api/v1/doctors/:id
 * @access  Public
 */
exports.getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      'hospital',
      'name address contactPhone emergencyHotline operatingHours facilities specialties'
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: `Doctor not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new doctor
 * @route   POST /api/v1/doctors
 * @access  Private (Admin / Hospital Admin)
 */
exports.createDoctor = async (req, res, next) => {
  try {
    const { hospital } = req.body;

    // Verify hospital exists
    const hospitalDoc = await Hospital.findById(hospital);
    if (!hospitalDoc) {
      return res.status(404).json({
        success: false,
        message: `Hospital not found with id of ${hospital}`,
      });
    }

    // If hospital_admin, ensure they manage this hospital
    if (
      req.user.role === 'hospital_admin' &&
      req.user.hospitalAssigned &&
      req.user.hospitalAssigned.toString() !== hospital.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to add doctors to this hospital.',
      });
    }

    const doctor = await Doctor.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update doctor
 * @route   PUT /api/v1/doctors/:id
 * @access  Private (Admin / Hospital Admin)
 */
exports.updateDoctor = async (req, res, next) => {
  try {
    let doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: `Doctor not found with id of ${req.params.id}`,
      });
    }

    // Role check for hospital_admin
    if (
      req.user.role === 'hospital_admin' &&
      req.user.hospitalAssigned &&
      req.user.hospitalAssigned.toString() !== doctor.hospital.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit doctors for this hospital.',
      });
    }

    doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Doctor details updated successfully',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete doctor
 * @route   DELETE /api/v1/doctors/:id
 * @access  Private (Admin / Hospital Admin)
 */
exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: `Doctor not found with id of ${req.params.id}`,
      });
    }

    // Role check for hospital_admin
    if (
      req.user.role === 'hospital_admin' &&
      req.user.hospitalAssigned &&
      req.user.hospitalAssigned.toString() !== doctor.hospital.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to remove doctors from this hospital.',
      });
    }

    await doctor.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Doctor removed successfully',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
