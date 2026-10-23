// Locations & Geographical Mapping Controller
const { db } = require('../config/db');
const { calculateDistance } = require('../services/geoService');
const { validateSearchQuery, validateLocation } = require('../models/schemas');
const { safeTrim } = require('../utils/validator');
const { success, error } = require('../utils/response');

function getLocations(req, res) {
  const queryValidation = validateSearchQuery(req.query);
  if (!queryValidation.isValid) {
    return error(res, `Invalid query parameters: ${queryValidation.errors.join('; ')}`, 400, queryValidation.errors);
  }

  const { city, state, search, lat, lng, radius } = req.query;
  let locations = db.find('locations');

  if (city) {
    const c = String(city).toLowerCase();
    locations = locations.filter(l => l.cityName && l.cityName.toLowerCase().includes(c));
  }

  if (state) {
    const s = String(state).toLowerCase();
    locations = locations.filter(l => l.state && l.state.toLowerCase().includes(s));
  }

  if (search) {
    const q = String(search).toLowerCase();
    locations = locations.filter(l =>
      (l.cityName && l.cityName.toLowerCase().includes(q)) ||
      (l.keyArea && l.keyArea.toLowerCase().includes(q)) ||
      (l.address && l.address.toLowerCase().includes(q))
    );
  }

  const hasCoords = lat !== undefined && lng !== undefined && lat !== '' && lng !== '';
  const allHospitals = db.find('hospitals', h => h.verified === true);

  let results = locations.map(loc => {
    const linkedHospitals = allHospitals.filter(h =>
      h.locationId === loc.id ||
      calculateDistance(loc.latitude, loc.longitude, h.latitude, h.longitude) <= 15
    );
    const distanceKm = hasCoords
      ? parseFloat(calculateDistance(Number(lat), Number(lng), loc.latitude, loc.longitude).toFixed(2))
      : null;

    return {
      ...loc,
      hospitalCount: linkedHospitals.length,
      distanceKm
    };
  });

  if (hasCoords && radius) {
    results = results.filter(l => l.distanceKm !== null && l.distanceKm <= Number(radius));
  }

  if (hasCoords) {
    results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }

  return success(res, results, `Found ${results.length} mapped healthcare locations`);
}

function getLocationById(req, res) {
  const { id } = req.params;
  const location = db.findById('locations', id);

  if (!location) {
    return error(res, `Location with ID '${id}' not found`, 404);
  }

  const hospitals = db.find('hospitals', h =>
    h.verified && (
      h.locationId === id ||
      calculateDistance(location.latitude, location.longitude, h.latitude, h.longitude) <= 15
    )
  );

  return success(res, {
    ...location,
    hospitalCount: hospitals.length,
    hospitals
  }, 'Location details and mapped hospitals retrieved successfully');
}

function createLocation(req, res) {
  const { isValid, errors } = validateLocation(req.body, false);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const body = req.body;
  const newLocation = db.create('locations', {
    cityName: safeTrim(body.cityName),
    state: safeTrim(body.state),
    address: safeTrim(body.address, safeTrim(body.cityName)),
    postalCode: safeTrim(body.postalCode),
    latitude: Number(body.latitude),
    longitude: Number(body.longitude),
    keyArea: safeTrim(body.keyArea),
    zoneType: safeTrim(body.zoneType, 'Urban Medical Hub'),
    hospitalCount: body.hospitalCount !== undefined ? Number(body.hospitalCount) : 0
  });

  return success(res, newLocation, 'Location mapping created successfully', 201);
}

function updateLocation(req, res) {
  const { id } = req.params;
  const existing = db.findById('locations', id);

  if (!existing) {
    return error(res, `Location with ID '${id}' not found`, 404);
  }

  const { isValid, errors } = validateLocation(req.body, true);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const updates = { ...req.body };
  if (updates.cityName !== undefined) updates.cityName = safeTrim(updates.cityName);
  if (updates.state !== undefined) updates.state = safeTrim(updates.state);
  if (updates.address !== undefined) updates.address = safeTrim(updates.address);
  if (updates.latitude !== undefined) updates.latitude = Number(updates.latitude);
  if (updates.longitude !== undefined) updates.longitude = Number(updates.longitude);
  if (updates.hospitalCount !== undefined) updates.hospitalCount = Number(updates.hospitalCount);

  const updated = db.updateById('locations', id, updates);
  return success(res, updated, 'Location mapping updated successfully');
}

function deleteLocation(req, res) {
  const { id } = req.params;
  const existing = db.findById('locations', id);

  if (!existing) {
    return error(res, `Location with ID '${id}' not found`, 404);
  }

  db.deleteById('locations', id);
  return success(res, { id }, 'Location mapping deleted successfully');
}

module.exports = {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
};
