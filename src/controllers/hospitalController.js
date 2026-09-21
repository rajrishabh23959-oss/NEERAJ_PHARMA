// Hospital Management, Geolocation Search & Real-Time Availability Controller
const { db } = require('../config/db');
const { searchNearbyHospitals } = require('../services/geoService');
const { computeHospitalAvailability, computeDoctorAvailability } = require('../services/availabilityService');
const {
  validateSearchQuery,
  validateHospital,
  validateHospitalContacts
} = require('../models/schemas');
const { safeTrim } = require('../utils/validator');
const { success, error } = require('../utils/response');

function getAllHospitals(req, res) {
  const queryValidation = validateSearchQuery(req.query);
  if (!queryValidation.isValid) {
    return error(res, `Invalid search parameters: ${queryValidation.errors.join('; ')}`, 400, queryValidation.errors);
  }

  const {
    lat,
    lng,
    radius,
    facility,
    specialty,
    open24x7,
    openNow,
    availableNow,
    hasEmergency,
    search,
    minBeds,
    checkTime,
    sortBy,
    verifiedOnly,
    page = 1,
    limit = 50
  } = req.query;

  const isAdmin = req.user && req.user.role === 'admin';
  const filterVerified = verifiedOnly !== undefined ? verifiedOnly === 'true' : (!isAdmin);

  const hospitals = searchNearbyHospitals({
    latitude: lat,
    longitude: lng,
    radiusKm: radius,
    facilityType: facility,
    specialty,
    open24x7,
    openNow,
    availableNow,
    hasEmergency,
    verifiedOnly: filterVerified,
    search,
    minBeds,
    checkTime,
    sortBy: sortBy || 'distance'
  });

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = hospitals.slice(startIndex, startIndex + limitNum);

  return success(
    res,
    paginated,
    `Found ${hospitals.length} hospitals matching criteria`,
    200,
    {
      total: hospitals.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(hospitals.length / limitNum),
      filtersApplied: {
        coordinates: (lat !== undefined && lng !== undefined) ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null,
        radiusKm: radius ? parseFloat(radius) : 'default',
        facility: facility || 'all',
        specialty: specialty || 'all',
        open24x7: open24x7 === 'true',
        openNow: openNow === 'true',
        availableNow: availableNow === 'true',
        hasEmergency: hasEmergency === 'true'
      }
    }
  );
}

function getHospitalById(req, res) {
  const { id } = req.params;
  const { checkTime } = req.query;
  const hospital = db.findById('hospitals', id);

  if (!hospital) {
    return error(res, `Hospital with ID '${id}' not found`, 404);
  }

  const realTimeAvailability = computeHospitalAvailability(hospital, checkTime);
  const doctors = db.find('doctors', d => d.hospitalId === id).map(doc => ({
    ...doc,
    realTimeAvailability: computeDoctorAvailability(doc, checkTime)
  }));
  const ambulances = db.find('ambulances', a => a.hospitalId === id);
  const location = hospital.locationId ? db.findById('locations', hospital.locationId) : null;

  return success(
    res,
    {
      ...hospital,
      isOpenNow: realTimeAvailability.isOpenNow,
      isAvailableNow: realTimeAvailability.isAvailableNow,
      realTimeAvailability,
      location,
      doctors,
      ambulances
    },
    'Hospital details retrieved successfully'
  );
}

function getHospitalAvailability(req, res) {
  const { id } = req.params;
  const { checkTime } = req.query;
  const hospital = db.findById('hospitals', id);

  if (!hospital) {
    return error(res, `Hospital with ID '${id}' not found`, 404);
  }

  const availability = computeHospitalAvailability(hospital, checkTime);
  return success(res, {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    operatingHours: hospital.operatingHours,
    open24x7: hospital.open24x7,
    hasEmergency: hospital.hasEmergency,
    ...availability
  }, 'Real-time hospital availability calculated successfully');
}

function updateHospitalAvailability(req, res) {
  const { id } = req.params;
  const existing = db.findById('hospitals', id);

  if (!existing) {
    return error(res, `Hospital with ID '${id}' not found`, 404);
  }

  const { isValid, errors } = validateHospital(req.body, true, existing);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const updates = {};
  if (req.body.totalBeds !== undefined) updates.totalBeds = Number(req.body.totalBeds);
  if (req.body.availableBeds !== undefined) updates.availableBeds = Number(req.body.availableBeds);
  if (req.body.icuBedsAvailable !== undefined) updates.icuBedsAvailable = Number(req.body.icuBedsAvailable);
  if (req.body.ventilatorBedsAvailable !== undefined) updates.ventilatorBedsAvailable = Number(req.body.ventilatorBedsAvailable);
  if (req.body.open24x7 !== undefined) updates.open24x7 = req.body.open24x7 === true || req.body.open24x7 === 'true';
  if (req.body.hasEmergency !== undefined) updates.hasEmergency = req.body.hasEmergency === true || req.body.hasEmergency === 'true';
  if (req.body.operatingHours !== undefined) updates.operatingHours = safeTrim(req.body.operatingHours);
  if (req.body.operatingSchedule !== undefined) updates.operatingSchedule = req.body.operatingSchedule;

  const updated = db.updateById('hospitals', id, updates);
  const realTimeAvailability = computeHospitalAvailability(updated);

  return success(res, {
    ...updated,
    realTimeAvailability
  }, 'Hospital availability updated successfully');
}

function updateHospitalContacts(req, res) {
  const { id } = req.params;
  const existing = db.findById('hospitals', id);

  if (!existing) {
    return error(res, `Hospital with ID '${id}' not found`, 404);
  }

  const { isValid, errors } = validateHospitalContacts(req.body);
  if (!isValid) {
    return error(res, `Contact validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const updates = {};
  if (req.body.phone !== undefined) updates.phone = safeTrim(req.body.phone);
  if (req.body.emergencyHotline !== undefined) updates.emergencyHotline = safeTrim(req.body.emergencyHotline);
  if (req.body.email !== undefined) updates.email = safeTrim(req.body.email);
  if (req.body.website !== undefined) updates.website = safeTrim(req.body.website);
  if (req.body.address !== undefined) updates.address = safeTrim(req.body.address);
  if (req.body.city !== undefined) updates.city = safeTrim(req.body.city);
  if (req.body.state !== undefined) updates.state = safeTrim(req.body.state);
  if (req.body.postalCode !== undefined) updates.postalCode = safeTrim(req.body.postalCode);

  const updated = db.updateById('hospitals', id, updates);
  return success(res, updated, 'Hospital contact details updated successfully');
}

function createHospital(req, res) {
  const { isValid, errors } = validateHospital(req.body, false);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const isAdmin = req.user && req.user.role === 'admin';
  const body = req.body;
  const totalBeds = body.totalBeds !== undefined ? Number(body.totalBeds) : 100;
  const availableBeds = body.availableBeds !== undefined ? Number(body.availableBeds) : Math.min(20, totalBeds);

  const hospitalData = {
    locationId: body.locationId || 'loc_001',
    name: safeTrim(body.name),
    address: safeTrim(body.address),
    city: safeTrim(body.city, 'New Delhi'),
    state: safeTrim(body.state, 'Delhi'),
    postalCode: safeTrim(body.postalCode),
    latitude: Number(body.latitude),
    longitude: Number(body.longitude),
    phone: safeTrim(body.phone),
    emergencyHotline: body.emergencyHotline ? safeTrim(body.emergencyHotline) : safeTrim(body.phone),
    email: safeTrim(body.email),
    facilityType: safeTrim(body.facilityType, 'General Hospital'),
    operatingHours: safeTrim(body.operatingHours, (body.open24x7 !== false ? '24 Hours / 7 Days' : '08:00 AM - 10:00 PM')),
    operatingSchedule: body.operatingSchedule || null,
    open24x7: body.open24x7 === undefined ? true : (body.open24x7 === true || body.open24x7 === 'true'),
    hasEmergency: body.hasEmergency !== false && body.hasEmergency !== 'false',
    totalBeds,
    availableBeds,
    icuBedsAvailable: body.icuBedsAvailable !== undefined ? Number(body.icuBedsAvailable) : 5,
    ventilatorBedsAvailable: body.ventilatorBedsAvailable !== undefined ? Number(body.ventilatorBedsAvailable) : 2,
    specialties: Array.isArray(body.specialties) ? body.specialties.map(s => safeTrim(s)) : ['Emergency Care', 'General Medicine'],
    services: Array.isArray(body.services) ? body.services.map(s => safeTrim(s)) : ['24x7 Emergency Room', 'Ambulance'],
    rating: body.rating !== undefined ? Number(body.rating) : 4.5,
    website: safeTrim(body.website),
    verified: isAdmin ? true : false,
    verifiedAt: isAdmin ? new Date().toISOString() : null,
    verifiedBy: isAdmin ? req.user.id : null
  };

  const newHospital = db.create('hospitals', hospitalData);

  return success(
    res,
    newHospital,
    isAdmin ? 'Hospital created and verified successfully' : 'Hospital submitted for administrator verification',
    201
  );
}

function updateHospital(req, res) {
  const { id } = req.params;
  const existing = db.findById('hospitals', id);

  if (!existing) {
    return error(res, `Hospital with ID '${id}' not found`, 404);
  }

  const { isValid, errors } = validateHospital(req.body, true, existing);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const updates = { ...req.body };
  if (updates.name !== undefined) updates.name = safeTrim(updates.name);
  if (updates.address !== undefined) updates.address = safeTrim(updates.address);
  if (updates.phone !== undefined) updates.phone = safeTrim(updates.phone);
  if (updates.emergencyHotline !== undefined) updates.emergencyHotline = safeTrim(updates.emergencyHotline);
  if (updates.latitude !== undefined) updates.latitude = Number(updates.latitude);
  if (updates.longitude !== undefined) updates.longitude = Number(updates.longitude);
  if (updates.totalBeds !== undefined) updates.totalBeds = Number(updates.totalBeds);
  if (updates.availableBeds !== undefined) updates.availableBeds = Number(updates.availableBeds);
  if (updates.icuBedsAvailable !== undefined) updates.icuBedsAvailable = Number(updates.icuBedsAvailable);
  if (updates.ventilatorBedsAvailable !== undefined) updates.ventilatorBedsAvailable = Number(updates.ventilatorBedsAvailable);
  if (updates.rating !== undefined) updates.rating = Number(updates.rating);

  const updatedHospital = db.updateById('hospitals', id, updates);
  return success(res, updatedHospital, 'Hospital updated successfully');
}

function deleteHospital(req, res) {
  const { id } = req.params;
  const existing = db.findById('hospitals', id);

  if (!existing) {
    return error(res, `Hospital with ID '${id}' not found`, 404);
  }

  db.deleteById('hospitals', id);
  return success(res, { id }, 'Hospital record deleted successfully');
}

module.exports = {
  getAllHospitals,
  getHospitalById,
  getHospitalAvailability,
  updateHospitalAvailability,
  updateHospitalContacts,
  createHospital,
  updateHospital,
  deleteHospital
};
