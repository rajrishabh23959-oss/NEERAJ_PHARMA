// Administrator Dashboard, Verification Workflows & Full User Management Controller
const { db, seedDatabase } = require('../config/db');
const { hashPassword } = require('../utils/crypto');
const { safeTrim, isValidEmail, isValidPhone } = require('../utils/validator');
const { success, error } = require('../utils/response');

function getDashboardStats(req, res) {
  const totalHospitals = db.count('hospitals');
  const verifiedHospitals = db.count('hospitals', h => h.verified === true);
  const pendingHospitals = db.count('hospitals', h => h.verified === false);
  const totalDoctors = db.count('doctors');
  const totalLocations = db.count('locations');
  const totalEmergencyContacts = db.count('emergency_contacts');
  const pendingEmergencyContacts = db.count('emergency_contacts', c => c.verified === false);
  const totalAmbulances = db.count('ambulances');
  const availableAmbulances = db.count('ambulances', a => a.status === 'Available' && a.verified !== false);
  const pendingAmbulances = db.count('ambulances', a => a.verified === false);
  const totalUsers = db.count('users');
  const activeUsers = db.count('users', u => !u.status || u.status === 'active');
  const emergencyDispatches = db.count('emergency_dispatches');

  return success(res, {
    metrics: {
      totalHospitals,
      verifiedHospitals,
      pendingHospitals,
      totalDoctors,
      totalLocations,
      totalEmergencyContacts,
      pendingEmergencyContacts,
      totalAmbulances,
      availableAmbulances,
      pendingAmbulances,
      totalUsers,
      activeUsers,
      emergencyDispatches
    },
    systemHealth: {
      status: 'healthy',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    }
  }, 'Admin statistics retrieved successfully');
}

// --- Hospital Verification Workflow ---
function getPendingHospitals(req, res) {
  const pending = db.find('hospitals', h => h.verified === false);
  return success(res, pending, `Found ${pending.length} pending hospital verifications`);
}

function verifyHospital(req, res) {
  const { id } = req.params;
  const { verified = true, verificationNotes = '' } = req.body || {};

  const hospital = db.findById('hospitals', id);
  if (!hospital) {
    return error(res, `Hospital with ID '${id}' not found`, 404);
  }

  const isVerified = verified === true || verified === 'true';
  const updated = db.updateById('hospitals', id, {
    verified: isVerified,
    verifiedAt: isVerified ? new Date().toISOString() : null,
    verifiedBy: req.user ? req.user.id : 'admin',
    verificationNotes: safeTrim(verificationNotes)
  });

  const actionMsg = updated.verified
    ? 'Hospital successfully verified & published'
    : 'Hospital marked as unverified / rejected';
  return success(res, updated, actionMsg);
}

// --- Emergency Services Verification Workflow ---
function getPendingEmergencyServices(req, res) {
  const pendingContacts = db.find('emergency_contacts', c => c.verified === false);
  const pendingAmbulances = db.find('ambulances', a => a.verified === false);

  return success(res, {
    pendingEmergencyContacts: pendingContacts,
    pendingAmbulances: pendingAmbulances,
    totalPending: pendingContacts.length + pendingAmbulances.length
  }, 'Pending emergency service verifications retrieved');
}

function verifyEmergencyContact(req, res) {
  const { id } = req.params;
  const { verified = true, verificationNotes = '' } = req.body || {};

  const contact = db.findById('emergency_contacts', id);
  if (!contact) {
    return error(res, `Emergency contact with ID '${id}' not found`, 404);
  }

  const isVerified = verified === true || verified === 'true';
  const updated = db.updateById('emergency_contacts', id, {
    verified: isVerified,
    verifiedAt: isVerified ? new Date().toISOString() : null,
    verifiedBy: req.user ? req.user.id : 'admin',
    verificationNotes: safeTrim(verificationNotes)
  });

  return success(
    res,
    updated,
    updated.verified ? 'Emergency contact verified and published' : 'Emergency contact marked unverified'
  );
}

function verifyAmbulance(req, res) {
  const { id } = req.params;
  const { verified = true, verificationNotes = '' } = req.body || {};

  const ambulance = db.findById('ambulances', id);
  if (!ambulance) {
    return error(res, `Ambulance with ID '${id}' not found`, 404);
  }

  const isVerified = verified === true || verified === 'true';
  const updated = db.updateById('ambulances', id, {
    verified: isVerified,
    verifiedAt: isVerified ? new Date().toISOString() : null,
    verifiedBy: req.user ? req.user.id : 'admin',
    verificationNotes: safeTrim(verificationNotes)
  });

  return success(
    res,
    updated,
    updated.verified ? 'Ambulance unit verified and activated' : 'Ambulance unit marked unverified'
  );
}

// --- Complete User Management (List, Get, Update, Role, Status, Delete) ---
function sanitizeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phoneNumber: u.phoneNumber || '',
    department: u.department || '',
    status: u.status || 'active',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt || null
  };
}

function getUsers(req, res) {
  const { role, status, search } = req.query;
  let users = db.find('users');

  if (role) {
    users = users.filter(u => u.role === role);
  }
  if (status) {
    users = users.filter(u => (u.status || 'active') === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    users = users.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }

  return success(res, users.map(sanitizeUser), `Found ${users.length} registered users`);
}

function getUserById(req, res) {
  const { id } = req.params;
  const user = db.findById('users', id);
  if (!user) {
    return error(res, `User with ID '${id}' not found`, 404);
  }
  return success(res, sanitizeUser(user), 'User details retrieved successfully');
}

function updateUser(req, res) {
  const { id } = req.params;
  const user = db.findById('users', id);
  if (!user) {
    return error(res, `User with ID '${id}' not found`, 404);
  }

  const body = req.body || {};
  const updates = {};

  if (body.name !== undefined) {
    const n = safeTrim(body.name);
    if (n.length < 2) return error(res, 'Name must be at least 2 characters long', 400);
    updates.name = n;
  }

  if (body.email !== undefined) {
    const em = safeTrim(body.email).toLowerCase();
    if (!isValidEmail(em)) return error(res, 'Invalid email format', 400);
    const conflict = db.findOne('users', u => u.email.toLowerCase() === em && u.id !== id);
    if (conflict) return error(res, 'Email is already in use by another account', 409);
    updates.email = em;
  }

  if (body.phoneNumber !== undefined) {
    if (body.phoneNumber !== '' && !isValidPhone(body.phoneNumber)) {
      return error(res, 'Invalid phoneNumber format', 400);
    }
    updates.phoneNumber = safeTrim(body.phoneNumber);
  }

  if (body.department !== undefined) {
    updates.department = safeTrim(body.department);
  }

  if (body.role !== undefined) {
    if (!['admin', 'user'].includes(body.role)) {
      return error(res, "Role must be either 'admin' or 'user'", 400);
    }
    updates.role = body.role;
  }

  if (body.status !== undefined) {
    if (!['active', 'disabled', 'suspended'].includes(body.status)) {
      return error(res, "Status must be one of: 'active', 'disabled', 'suspended'", 400);
    }
    updates.status = body.status;
  }

  if (body.password !== undefined) {
    if (typeof body.password !== 'string' || body.password.length < 6) {
      return error(res, 'Password must be at least 6 characters long', 400);
    }
    updates.passwordHash = hashPassword(body.password);
  }

  const updated = db.updateById('users', id, updates);
  return success(res, sanitizeUser(updated), 'User record updated successfully');
}

function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!['admin', 'user'].includes(role)) {
    return error(res, "Role must be either 'admin' or 'user'", 400);
  }

  const user = db.findById('users', id);
  if (!user) {
    return error(res, `User with ID '${id}' not found`, 404);
  }

  const updated = db.updateById('users', id, { role });
  return success(res, sanitizeUser(updated), `User role updated to '${role}'`);
}

function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!['active', 'disabled', 'suspended'].includes(status)) {
    return error(res, "Status must be one of: 'active', 'disabled', 'suspended'", 400);
  }

  const user = db.findById('users', id);
  if (!user) {
    return error(res, `User with ID '${id}' not found`, 404);
  }

  if (req.user && req.user.id === id && status !== 'active') {
    return error(res, 'Administrators cannot disable their own active account', 400);
  }

  const updated = db.updateById('users', id, { status });
  return success(res, sanitizeUser(updated), `User account status updated to '${status}'`);
}

function deleteUser(req, res) {
  const { id } = req.params;
  const user = db.findById('users', id);
  if (!user) {
    return error(res, `User with ID '${id}' not found`, 404);
  }

  if (req.user && req.user.id === id) {
    return error(res, 'Administrators cannot delete their own active account', 400);
  }

  db.deleteById('users', id);
  return success(res, { id }, 'User account deleted successfully');
}

function reseed(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return error(res, 'Database reseed is disabled in production', 403);
  }

  const refreshedData = seedDatabase();
  return success(res, {
    hospitalsCount: refreshedData.hospitals.length,
    doctorsCount: refreshedData.doctors.length,
    locationsCount: refreshedData.locations.length,
    emergencyContactsCount: refreshedData.emergency_contacts.length,
    ambulancesCount: refreshedData.ambulances.length,
    usersCount: refreshedData.users.length
  }, 'Database reset to initial seed state');
}

module.exports = {
  getDashboardStats,
  getPendingHospitals,
  verifyHospital,
  getPendingEmergencyServices,
  verifyEmergencyContact,
  verifyAmbulance,
  getUsers,
  getUserById,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  reseed
};
