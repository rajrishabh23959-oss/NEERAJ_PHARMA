// Geolocation, Haversine Distance & Real-Time Availability Filtering Service
const { db } = require('../config/db');
const config = require('../config/env');
const { computeHospitalAvailability } = require('./availabilityService');

/**
 * Calculates great-circle distance between two coordinates using Haversine formula.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const toRad = deg => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates driving and emergency arrival times based on distance in km.
 */
function calculateETA(distanceKm) {
  const ambulanceMinutes = Math.max(3, Math.round((distanceKm / 40) * 60 + 3));
  const drivingMinutes = Math.max(4, Math.round((distanceKm / 30) * 60));

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    estimatedAmbulanceMinutes: ambulanceMinutes,
    estimatedDrivingMinutes: drivingMinutes
  };
}

/**
 * Performs proximity search, real-time operating hours availability calculation, and multi-criteria filtering.
 */
function searchNearbyHospitals({
  latitude,
  longitude,
  radiusKm = config.DEFAULT_RADIUS_KM,
  facilityType,
  specialty,
  open24x7,
  openNow,
  availableNow,
  hasEmergency,
  verifiedOnly = true,
  search,
  minBeds,
  checkTime = null,
  sortBy = 'distance'
}) {
  let hospitals = db.find('hospitals');

  if (verifiedOnly) {
    hospitals = hospitals.filter(h => h.verified === true);
  }

  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    hospitals = hospitals.filter(h =>
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.address && h.address.toLowerCase().includes(q)) ||
      (h.city && h.city.toLowerCase().includes(q)) ||
      (h.specialties && h.specialties.some(s => s.toLowerCase().includes(q)))
    );
  }

  if (facilityType && facilityType !== 'all') {
    const ft = String(facilityType).toLowerCase();
    hospitals = hospitals.filter(h => h.facilityType && h.facilityType.toLowerCase().includes(ft));
  }

  if (specialty && specialty !== 'all') {
    const sp = String(specialty).toLowerCase();
    hospitals = hospitals.filter(h =>
      h.specialties && h.specialties.some(s => s.toLowerCase().includes(sp))
    );
  }

  if (open24x7 === true || open24x7 === 'true') {
    hospitals = hospitals.filter(h => h.open24x7 === true);
  }

  if (hasEmergency === true || hasEmergency === 'true') {
    hospitals = hospitals.filter(h => h.hasEmergency === true);
  }

  if (minBeds !== undefined && minBeds !== '') {
    const minBedsNum = parseInt(minBeds, 10);
    if (!isNaN(minBedsNum)) {
      hospitals = hospitals.filter(h => (h.availableBeds || 0) >= minBedsNum);
    }
  }

  const hasCoordinates = latitude !== undefined && longitude !== undefined &&
                         latitude !== '' && longitude !== '' &&
                         !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  let results = hospitals.map(hospital => {
    let dist = null;
    let eta = null;
    if (hasCoordinates) {
      dist = calculateDistance(
        Number(latitude),
        Number(longitude),
        hospital.latitude,
        hospital.longitude
      );
      eta = calculateETA(dist);
    }
    const realTimeAvailability = computeHospitalAvailability(hospital, checkTime);
    return {
      ...hospital,
      isOpenNow: realTimeAvailability.isOpenNow,
      isAvailableNow: realTimeAvailability.isAvailableNow,
      realTimeAvailability,
      distanceKm: dist !== null ? parseFloat(dist.toFixed(2)) : null,
      eta
    };
  });

  // Dynamic real-time "Open Now" filter computed from operatingHours
  if (openNow === true || openNow === 'true') {
    results = results.filter(h => h.isOpenNow === true);
  }

  // Dynamic real-time "Available Now" (Open Now + Beds Available)
  if (availableNow === true || availableNow === 'true') {
    results = results.filter(h => h.isAvailableNow === true);
  }

  // Radius filter
  if (hasCoordinates && radiusKm !== undefined && radiusKm !== '') {
    const maxR = parseFloat(radiusKm);
    results = results.filter(h => h.distanceKm !== null && h.distanceKm <= maxR);
  }

  // Sorting
  if (hasCoordinates && sortBy === 'distance') {
    results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  } else if (sortBy === 'rating') {
    results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'beds') {
    results.sort((a, b) => (b.availableBeds || 0) - (a.availableBeds || 0));
  }

  return results;
}

module.exports = {
  calculateDistance,
  calculateETA,
  searchNearbyHospitals
};
