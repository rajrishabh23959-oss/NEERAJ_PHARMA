// Strict Entity & Query Validation Schemas
const {
  isValidEmail,
  isStrictNumber,
  isNonNegativeInteger,
  isValidCoordinates,
  safeTrim,
  isValidPhone
} = require('../utils/validator');
const config = require('../config/env');

function validateSearchQuery(query) {
  const errors = [];
  const { lat, lng, radius, minBeds, page, limit } = query || {};

  // Coordinate validation: if either lat or lng is supplied, both must be supplied and valid
  if (lat !== undefined || lng !== undefined) {
    if (lat === undefined || lng === undefined || lat === '' || lng === '') {
      errors.push('Both lat and lng query parameters must be provided together');
    } else if (!isValidCoordinates(lat, lng)) {
      errors.push('Invalid coordinates: lat must be between -90 and 90, and lng must be between -180 and 180');
    }
  }

  // Radius validation against MAX_SEARCH_RADIUS_KM
  if (radius !== undefined && radius !== '') {
    if (!isStrictNumber(radius) || Number(radius) <= 0) {
      errors.push('Radius must be a positive number in kilometers');
    } else if (Number(radius) > config.MAX_SEARCH_RADIUS_KM) {
      errors.push(`Radius cannot exceed maximum search radius of ${config.MAX_SEARCH_RADIUS_KM} km`);
    }
  }

  // minBeds validation
  if (minBeds !== undefined && minBeds !== '') {
    if (!isNonNegativeInteger(minBeds)) {
      errors.push('minBeds must be a non-negative integer');
    }
  }

  // Pagination validation
  if (page !== undefined && page !== '') {
    if (!isNonNegativeInteger(page) || Number(page) < 1) {
      errors.push('page must be a positive integer (>= 1)');
    }
  }
  if (limit !== undefined && limit !== '') {
    if (!isNonNegativeInteger(limit) || Number(limit) < 1 || Number(limit) > 200) {
      errors.push('limit must be a positive integer between 1 and 200');
    }
  }

  return { isValid: errors.length === 0, errors };
}

function validateHospital(data, isUpdate = false, existingHospital = null) {
  const errors = [];
  const body = data || {};

  if (!isUpdate || body.name !== undefined) {
    const name = safeTrim(body.name);
    if (!name || name.length < 3) {
      errors.push('Hospital name must be at least 3 characters long');
    }
  }

  if (!isUpdate || body.address !== undefined) {
    const address = safeTrim(body.address);
    if (!address || address.length < 5) {
      errors.push('Address is required (at least 5 characters)');
    }
  }

  if (!isUpdate || body.latitude !== undefined || body.longitude !== undefined) {
    const lat = body.latitude !== undefined ? body.latitude : (existingHospital ? existingHospital.latitude : undefined);
    const lng = body.longitude !== undefined ? body.longitude : (existingHospital ? existingHospital.longitude : undefined);
    if (!isValidCoordinates(lat, lng)) {
      errors.push('Valid latitude (-90 to 90) and longitude (-180 to 180) are required');
    }
  }

  if (!isUpdate || body.phone !== undefined) {
    if (!isValidPhone(body.phone)) {
      errors.push('A valid phone number is required');
    }
  }

  if (body.emergencyHotline !== undefined && body.emergencyHotline !== '') {
    if (!isValidPhone(body.emergencyHotline)) {
      errors.push('Emergency hotline must be a valid phone number');
    }
  }

  if (body.email !== undefined && body.email !== '') {
    if (!isValidEmail(String(body.email))) {
      errors.push('Hospital email must be a valid email address');
    }
  }

  // Numeric bed validation
  const bedFields = ['totalBeds', 'availableBeds', 'icuBedsAvailable', 'ventilatorBedsAvailable'];
  for (const field of bedFields) {
    if (body[field] !== undefined) {
      if (!isNonNegativeInteger(body[field])) {
        errors.push(`${field} must be a non-negative integer (>= 0)`);
      }
    }
  }

  // Logical bed capacity check
  const effectiveTotalBeds = body.totalBeds !== undefined && isNonNegativeInteger(body.totalBeds)
    ? Number(body.totalBeds)
    : (existingHospital ? existingHospital.totalBeds : null);
  const effectiveAvailableBeds = body.availableBeds !== undefined && isNonNegativeInteger(body.availableBeds)
    ? Number(body.availableBeds)
    : (existingHospital ? existingHospital.availableBeds : null);

  if (effectiveTotalBeds !== null && effectiveAvailableBeds !== null && effectiveAvailableBeds > effectiveTotalBeds) {
    errors.push(`availableBeds (${effectiveAvailableBeds}) cannot exceed totalBeds (${effectiveTotalBeds})`);
  }

  // Rating validation
  if (body.rating !== undefined) {
    if (!isStrictNumber(body.rating) || Number(body.rating) < 0 || Number(body.rating) > 5) {
      errors.push('Rating must be a number between 0 and 5');
    }
  }

  return { isValid: errors.length === 0, errors };
}

function validateHospitalContacts(data) {
  const errors = [];
  const body = data || {};
  const allowedKeys = ['phone', 'emergencyHotline', 'email', 'website', 'address', 'city', 'state', 'postalCode'];
  const hasAny = allowedKeys.some(k => body[k] !== undefined);
  if (!hasAny) {
    errors.push('At least one contact field (phone, emergencyHotline, email, website, address) must be provided');
  }
  if (body.phone !== undefined && !isValidPhone(body.phone)) {
    errors.push('Invalid phone number format');
  }
  if (body.emergencyHotline !== undefined && !isValidPhone(body.emergencyHotline)) {
    errors.push('Invalid emergencyHotline format');
  }
  if (body.email !== undefined && body.email !== '' && !isValidEmail(String(body.email))) {
    errors.push('Invalid email address format');
  }
  return { isValid: errors.length === 0, errors };
}

function validateDoctor(data, isUpdate = false) {
  const errors = [];
  const body = data || {};

  if (!isUpdate || body.name !== undefined) {
    const name = safeTrim(body.name);
    if (!name || name.length < 3) {
      errors.push('Doctor name is required (at least 3 characters)');
    }
  }
  if (!isUpdate || body.specialty !== undefined) {
    const specialty = safeTrim(body.specialty);
    if (!specialty || specialty.length < 2) {
      errors.push('Specialty is required');
    }
  }
  if (!isUpdate || body.hospitalId !== undefined) {
    const hospId = safeTrim(body.hospitalId);
    if (!hospId) {
      errors.push('Valid hospitalId association is required');
    }
  }
  if (body.experienceYears !== undefined && !isNonNegativeInteger(body.experienceYears)) {
    errors.push('experienceYears must be a non-negative integer');
  }
  if (body.consultationFee !== undefined && !isNonNegativeInteger(body.consultationFee)) {
    errors.push('consultationFee must be a non-negative integer');
  }
  if (body.contact !== undefined && body.contact !== '' && !isValidPhone(body.contact)) {
    errors.push('Doctor contact must be a valid phone number');
  }
  return { isValid: errors.length === 0, errors };
}

function validateEmergencyContact(data, isUpdate = false) {
  const errors = [];
  const body = data || {};

  if (!isUpdate || body.name !== undefined) {
    const name = safeTrim(body.name);
    if (!name || name.length < 3) {
      errors.push('Emergency contact name is required (at least 3 characters)');
    }
  }
  if (!isUpdate || body.phoneNumber !== undefined) {
    if (!isValidPhone(body.phoneNumber)) {
      errors.push('Valid phoneNumber is required');
    }
  }
  if (!isUpdate || body.serviceScope !== undefined) {
    const scope = safeTrim(body.serviceScope);
    if (!scope || scope.length < 3) {
      errors.push('serviceScope description is required');
    }
  }
  if (body.averageResponseTimeMinutes !== undefined && !isNonNegativeInteger(body.averageResponseTimeMinutes)) {
    errors.push('averageResponseTimeMinutes must be a non-negative integer');
  }
  return { isValid: errors.length === 0, errors };
}

function validateAmbulance(data, isUpdate = false) {
  const errors = [];
  const body = data || {};

  if (!isUpdate || body.vehicleNumber !== undefined) {
    const vn = safeTrim(body.vehicleNumber);
    if (!vn || vn.length < 4) {
      errors.push('Valid vehicleNumber is required');
    }
  }
  if (!isUpdate || body.vehicleType !== undefined) {
    const vt = safeTrim(body.vehicleType);
    if (!vt) {
      errors.push('vehicleType is required');
    }
  }
  if (!isUpdate || body.driverName !== undefined) {
    const dn = safeTrim(body.driverName);
    if (!dn || dn.length < 2) {
      errors.push('driverName is required');
    }
  }
  if (!isUpdate || body.contactNumber !== undefined) {
    if (!isValidPhone(body.contactNumber)) {
      errors.push('Valid driver contactNumber is required');
    }
  }
  if (!isUpdate || body.currentLatitude !== undefined || body.currentLongitude !== undefined) {
    if (!isValidCoordinates(body.currentLatitude, body.currentLongitude)) {
      errors.push('Valid currentLatitude (-90 to 90) and currentLongitude (-180 to 180) are required');
    }
  }
  if (body.status !== undefined && !['Available', 'Dispatched', 'Maintenance'].includes(body.status)) {
    errors.push("Ambulance status must be one of: 'Available', 'Dispatched', 'Maintenance'");
  }
  return { isValid: errors.length === 0, errors };
}

function validateLocation(data, isUpdate = false) {
  const errors = [];
  const body = data || {};

  if (!isUpdate || body.cityName !== undefined) {
    if (!safeTrim(body.cityName)) errors.push('cityName is required');
  }
  if (!isUpdate || body.state !== undefined) {
    if (!safeTrim(body.state)) errors.push('state is required');
  }
  if (!isUpdate || body.latitude !== undefined || body.longitude !== undefined) {
    if (!isValidCoordinates(body.latitude, body.longitude)) {
      errors.push('Valid latitude (-90 to 90) and longitude (-180 to 180) are required');
    }
  }
  if (body.hospitalCount !== undefined && !isNonNegativeInteger(body.hospitalCount)) {
    errors.push('hospitalCount must be a non-negative integer');
  }
  return { isValid: errors.length === 0, errors };
}

function validateUserRegister(data) {
  const errors = [];
  const body = data || {};
  const name = safeTrim(body.name);

  if (!name || name.length < 2) {
    errors.push('Name is required (at least 2 characters)');
  }
  if (!body.email || !isValidEmail(String(body.email))) {
    errors.push('A valid email address is required');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (body.phoneNumber !== undefined && body.phoneNumber !== '' && !isValidPhone(body.phoneNumber)) {
    errors.push('phoneNumber must be a valid phone number');
  }

  return { isValid: errors.length === 0, errors };
}

function validateUserLogin(data) {
  const errors = [];
  const body = data || {};
  if (!body.email || !isValidEmail(String(body.email))) {
    errors.push('A valid email is required');
  }
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required');
  }
  return { isValid: errors.length === 0, errors };
}

function validateAmbulanceDispatch(data) {
  const errors = [];
  const body = data || {};
  const patientName = safeTrim(body.patientName);

  if (!patientName || patientName.length < 2) {
    errors.push('Patient name is required (at least 2 characters)');
  }
  if (!isValidPhone(body.contactPhone)) {
    errors.push('Valid contact phone number is required');
  }
  if (!isValidCoordinates(body.latitude, body.longitude)) {
    errors.push('Valid pickup latitude (-90 to 90) and longitude (-180 to 180) coordinates are required');
  }
  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateSearchQuery,
  validateHospital,
  validateHospitalContacts,
  validateDoctor,
  validateEmergencyContact,
  validateAmbulance,
  validateLocation,
  validateUserRegister,
  validateUserLogin,
  validateAmbulanceDispatch
};
