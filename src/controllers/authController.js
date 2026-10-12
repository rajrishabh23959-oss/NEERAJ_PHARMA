const User = require('../models/User');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, emergencyContacts } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Block self-registration as hospital_admin
    if (role === 'hospital_admin') {
      return res.status(403).json({
        success: false,
        message: 'Self-registration as hospital_admin is not allowed. Hospital administrators must be provisioned by a super administrator.',
      });
    }

    // Protect super_admin role escalation
    let assignedRole = 'user';
    if (role === 'super_admin') {
      if (!process.env.ADMIN_SECRET) {
        throw new Error('ADMIN_SECRET environment variable is missing.');
      }
      // Require admin key or verification for creating super admin
      if (req.body.adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({
          success: false,
          message: 'Invalid admin secret to register as super_admin.',
        });
      }
      assignedRole = 'super_admin';
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: assignedRole,
      emergencyContacts: emergencyContacts || [],
    });

    sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user & return JWT token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('savedHospitals', 'name type address contactPhone emergencyHotline availability')
      .populate('hospitalAssigned', 'name address type registrationNumber');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user profile details
 * @route   PUT /api/v1/auth/updatedetails
 * @access  Private
 */
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name || req.user.name,
      phone: req.body.phone !== undefined ? req.body.phone : req.user.phone,
      emergencyContacts: req.body.emergencyContacts || req.user.emergencyContacts,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password does not match',
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Save/Bookmark a hospital
 * @route   POST /api/v1/auth/saved-hospitals/:hospitalId
 * @access  Private
 */
exports.saveHospital = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user.savedHospitals.includes(hospitalId)) {
      user.savedHospitals.push(hospitalId);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Hospital saved to favorites',
      data: user.savedHospitals,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove saved hospital
 * @route   DELETE /api/v1/auth/saved-hospitals/:hospitalId
 * @access  Private
 */
exports.removeSavedHospital = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const user = await User.findById(req.user.id);

    user.savedHospitals = user.savedHospitals.filter(
      (id) => id.toString() !== hospitalId
    );
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Hospital removed from favorites',
      data: user.savedHospitals,
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedJwtToken();

  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: userObj,
  });
};
