const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Ambulance = require('../models/Ambulance');
const EmergencyContact = require('../models/EmergencyContact');
const { escapeRegex, parsePagination } = require('../utils/sanitize');

/**
 * @desc    Get aggregate dashboard metrics
 * @route   GET /api/v1/admin/dashboard-stats
 * @access  Private (Super Admin)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalHospitals,
      verifiedHospitals,
      unverifiedHospitals,
      hospitalsWithIcu,
      totalDoctors,
      emergencyDoctors,
      totalAmbulances,
      availableAmbulances,
      totalUsers,
      totalHelplines,
    ] = await Promise.all([
      Hospital.countDocuments({ isActive: true }),
      Hospital.countDocuments({ isActive: true, isVerified: true }),
      Hospital.countDocuments({ isActive: true, isVerified: false }),
      Hospital.countDocuments({ isActive: true, 'availability.availableIcuBeds': { $gt: 0 } }),
      Doctor.countDocuments(),
      Doctor.countDocuments({ isEmergencyAvailable: true }),
      Ambulance.countDocuments(),
      Ambulance.countDocuments({ status: 'available' }),
      User.countDocuments(),
      EmergencyContact.countDocuments({ isActive: true }),
    ]);

    // Aggregate bed metrics
    const bedStats = await Hospital.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalBeds: { $sum: '$availability.totalBeds' },
          availableBeds: { $sum: '$availability.availableBeds' },
          totalIcuBeds: { $sum: '$availability.icuBeds' },
          availableIcuBeds: { $sum: '$availability.availableIcuBeds' },
          totalOxygenBeds: { $sum: '$availability.oxygenBeds' },
          availableOxygenBeds: { $sum: '$availability.availableOxygenBeds' },
        },
      },
    ]);

    const bedSummary = bedStats[0] || {
      totalBeds: 0,
      availableBeds: 0,
      totalIcuBeds: 0,
      availableIcuBeds: 0,
      totalOxygenBeds: 0,
      availableOxygenBeds: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        hospitals: {
          total: totalHospitals,
          verified: verifiedHospitals,
          pendingVerification: unverifiedHospitals,
          withAvailableIcu: hospitalsWithIcu,
        },
        beds: bedSummary,
        doctors: {
          total: totalDoctors,
          onEmergencyDuty: emergencyDoctors,
        },
        ambulances: {
          total: totalAmbulances,
          available: availableAmbulances,
        },
        users: {
          total: totalUsers,
        },
        helplines: {
          total: totalHelplines,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all users (with search and pagination)
 * @route   GET /api/v1/admin/users
 * @access  Private (Super Admin)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: new RegExp(safeSearch, 'i') },
        { email: new RegExp(safeSearch, 'i') },
        { phone: new RegExp(safeSearch, 'i') },
      ];
    }

    const { pageNum, limitNum, skip } = parsePagination(page, limit, 10);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('hospitalAssigned', 'name address city')
        .skip(skip)
        .limit(limitNum)
        .sort('-createdAt'),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user role and assigned hospital
 * @route   PATCH /api/v1/admin/users/:id/role
 * @access  Private (Super Admin)
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role, hospitalAssigned } = req.body;

    if (!['user', 'hospital_admin', 'super_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be user, hospital_admin, or super_admin.',
      });
    }

    const updateFields = { role };
    if (role === 'hospital_admin') {
      updateFields.hospitalAssigned = hospitalAssigned || null;
    } else {
      updateFields.hospitalAssigned = null;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle user active status
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Private (Super Admin)
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(isActive) },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
