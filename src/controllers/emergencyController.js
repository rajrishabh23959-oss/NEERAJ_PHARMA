// Emergency Services, Helplines CRUD & Ambulance Dispatch Controller
const { db } = require('../config/db');
const { getNearbyAmbulances, dispatchAmbulance } = require('../services/ambulanceService');
const {
  validateSearchQuery,
  validateEmergencyContact,
  validateAmbulance,
  validateAmbulanceDispatch
} = require('../models/schemas');
const { safeTrim } = require('../utils/validator');
const { success, error } = require('../utils/response');

// --- Emergency Contacts & Helplines ---
function getEmergencyContacts(req, res) {
  const isAdmin = req.user && req.user.role === 'admin';
  const showUnverified = req.query.verifiedOnly === 'false' && isAdmin;

  const hotlines = db.find('emergency_contacts', c => showUnverified ? true : c.verified !== false);
  const hospitals = db.find('hospitals', h => h.verified && h.hasEmergency).map(h => ({
    hospitalId: h.id,
    hospitalName: h.name,
    emergencyHotline: h.emergencyHotline || h.phone,
    phone: h.phone,
    city: h.city,
    open24x7: h.open24x7,
    icuBedsAvailable: h.icuBedsAvailable
  }));

  return success(res, {
    nationalHelplines: hotlines,
    hospitalEmergencyDesks: hospitals
  }, 'Emergency contacts retrieved successfully');
}

function createEmergencyContact(req, res) {
  const { isValid, errors } = validateEmergencyContact(req.body, false);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const isAdmin = req.user && req.user.role === 'admin';
  const body = req.body;

  const newContact = db.create('emergency_contacts', {
    hospitalId: body.hospitalId ? safeTrim(body.hospitalId) : null,
    name: safeTrim(body.name),
    type: safeTrim(body.type, 'Medical Emergency'),
    phoneNumber: safeTrim(body.phoneNumber),
    secondaryPhone: safeTrim(body.secondaryPhone),
    serviceScope: safeTrim(body.serviceScope),
    availability: safeTrim(body.availability, '24x7 Free Service'),
    averageResponseTimeMinutes: body.averageResponseTimeMinutes !== undefined ? Number(body.averageResponseTimeMinutes) : 10,
    description: safeTrim(body.description),
    verified: isAdmin ? (body.verified !== false) : false,
    verifiedAt: isAdmin ? new Date().toISOString() : null,
    verifiedBy: isAdmin ? req.user.id : null
  });

  return success(res, newContact, 'Emergency contact added successfully', 201);
}

function updateEmergencyContact(req, res) {
  const { id } = req.params;
  const existing = db.findById('emergency_contacts', id);

  if (!existing) {
    return error(res, `Emergency contact with ID '${id}' not found`, 404);
  }

  const { isValid, errors } = validateEmergencyContact(req.body, true);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const updates = { ...req.body };
  if (updates.name !== undefined) updates.name = safeTrim(updates.name);
  if (updates.phoneNumber !== undefined) updates.phoneNumber = safeTrim(updates.phoneNumber);
  if (updates.secondaryPhone !== undefined) updates.secondaryPhone = safeTrim(updates.secondaryPhone);
  if (updates.serviceScope !== undefined) updates.serviceScope = safeTrim(updates.serviceScope);
  if (updates.averageResponseTimeMinutes !== undefined) {
    updates.averageResponseTimeMinutes = Number(updates.averageResponseTimeMinutes);
  }

  const updated = db.updateById('emergency_contacts', id, updates);
  return success(res, updated, 'Emergency contact updated successfully');
}

function deleteEmergencyContact(req, res) {
  const { id } = req.params;
  const existing = db.findById('emergency_contacts', id);

  if (!existing) {
    return error(res, `Emergency contact with ID '${id}' not found`, 404);
  }

  db.deleteById('emergency_contacts', id);
  return success(res, { id }, 'Emergency contact deleted successfully');
}

// --- Ambulances CRUD & Search ---
function listAmbulances(req, res) {
  const queryValidation = validateSearchQuery(req.query);
  if (!queryValidation.isValid) {
    return error(res, `Invalid search parameters: ${queryValidation.errors.join('; ')}`, 400, queryValidation.errors);
  }

  const { lat, lng, radius, vehicleType, status, verifiedOnly } = req.query;
  const isAdmin = req.user && req.user.role === 'admin';
  const filterVerified = verifiedOnly !== undefined ? verifiedOnly === 'true' : (!isAdmin);

  const ambulances = getNearbyAmbulances({
    userLat: lat,
    userLng: lng,
    maxRadiusKm: radius ? parseFloat(radius) : 40,
    vehicleType,
    status: status || 'Available',
    verifiedOnly: filterVerified
  });

  return success(
    res,
    ambulances,
    `Found ${ambulances.length} ambulances matching criteria`,
    200,
    { count: ambulances.length }
  );
}

function createAmbulance(req, res) {
  const { isValid, errors } = validateAmbulance(req.body, false);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const body = req.body;
  const duplicate = db.findOne('ambulances', a => a.vehicleNumber.toLowerCase() === safeTrim(body.vehicleNumber).toLowerCase());
  if (duplicate) {
    return error(res, `Ambulance with vehicleNumber '${body.vehicleNumber}' already exists`, 409);
  }

  const isAdmin = req.user && req.user.role === 'admin';
  const newAmbulance = db.create('ambulances', {
    vehicleNumber: safeTrim(body.vehicleNumber),
    vehicleType: safeTrim(body.vehicleType),
    driverName: safeTrim(body.driverName),
    contactNumber: safeTrim(body.contactNumber),
    currentLatitude: Number(body.currentLatitude),
    currentLongitude: Number(body.currentLongitude),
    hospitalAffiliation: safeTrim(body.hospitalAffiliation, 'Emergency Network'),
    hospitalId: body.hospitalId ? safeTrim(body.hospitalId) : null,
    equipment: Array.isArray(body.equipment) ? body.equipment.map(e => safeTrim(e)) : ['Oxygen', 'Stretcher', 'First Aid Kit'],
    status: body.status || 'Available',
    baseCity: safeTrim(body.baseCity, 'New Delhi'),
    verified: isAdmin ? (body.verified !== false) : false,
    verifiedAt: isAdmin ? new Date().toISOString() : null,
    verifiedBy: isAdmin ? req.user.id : null
  });

  return success(res, newAmbulance, 'Ambulance unit registered successfully', 201);
}

function updateAmbulance(req, res) {
  const { id } = req.params;
  const existing = db.findById('ambulances', id);

  if (!existing) {
    return error(res, `Ambulance with ID '${id}' not found`, 404);
  }

  const mergedForValidation = {
    ...existing,
    ...req.body
  };
  const { isValid, errors } = validateAmbulance(mergedForValidation, true);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const updates = { ...req.body };
  if (updates.vehicleNumber !== undefined) updates.vehicleNumber = safeTrim(updates.vehicleNumber);
  if (updates.vehicleType !== undefined) updates.vehicleType = safeTrim(updates.vehicleType);
  if (updates.driverName !== undefined) updates.driverName = safeTrim(updates.driverName);
  if (updates.contactNumber !== undefined) updates.contactNumber = safeTrim(updates.contactNumber);
  if (updates.currentLatitude !== undefined) updates.currentLatitude = Number(updates.currentLatitude);
  if (updates.currentLongitude !== undefined) updates.currentLongitude = Number(updates.currentLongitude);

  const updated = db.updateById('ambulances', id, updates);
  return success(res, updated, 'Ambulance unit updated successfully');
}

function deleteAmbulance(req, res) {
  const { id } = req.params;
  const existing = db.findById('ambulances', id);

  if (!existing) {
    return error(res, `Ambulance with ID '${id}' not found`, 404);
  }

  db.deleteById('ambulances', id);
  return success(res, { id }, 'Ambulance unit deleted successfully');
}

// --- Dispatch & Tracking ---
function requestAmbulance(req, res) {
  const { isValid, errors } = validateAmbulanceDispatch(req.body);
  if (!isValid) {
    return error(res, 'Validation failed for emergency dispatch request', 400, errors);
  }

  const dispatch = dispatchAmbulance(req.body);

  return success(
    res,
    dispatch,
    `Emergency ambulance dispatched! Tracking ID: ${dispatch.trackingId}. ETA: ~${dispatch.estimatedArrivalMinutes} minutes.`,
    201
  );
}

function getDispatchStatus(req, res) {
  const { trackingId } = req.params;
  const dispatch = db.findOne('emergency_dispatches', d => d.trackingId === trackingId);

  if (!dispatch) {
    return error(res, `Dispatch record with Tracking ID '${trackingId}' not found`, 404);
  }

  return success(res, dispatch, 'Dispatch status retrieved');
}

module.exports = {
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  listAmbulances,
  createAmbulance,
  updateAmbulance,
  deleteAmbulance,
  requestAmbulance,
  getDispatchStatus
};
