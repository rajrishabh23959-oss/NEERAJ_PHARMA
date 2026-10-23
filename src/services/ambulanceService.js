// Emergency Services & Ambulance Dispatch Service
const { db } = require('../config/db');
const config = require('../config/env');
const { calculateDistance } = require('./geoService');
const { safeTrim } = require('../utils/validator');

function getNearbyAmbulances({
  userLat,
  userLng,
  maxRadiusKm = config.DEFAULT_RADIUS_KM,
  vehicleType,
  status = 'Available',
  verifiedOnly = true
} = {}) {
  let ambulances = db.find('ambulances');

  if (verifiedOnly) {
    ambulances = ambulances.filter(a => a.verified !== false);
  }

  if (status && status !== 'all') {
    ambulances = ambulances.filter(a => a.status.toLowerCase() === String(status).toLowerCase());
  }

  if (vehicleType && vehicleType !== 'all') {
    const vt = String(vehicleType).toLowerCase();
    ambulances = ambulances.filter(a => a.vehicleType && a.vehicleType.toLowerCase().includes(vt));
  }

  const hasCoords = userLat !== undefined && userLng !== undefined &&
                    userLat !== '' && userLng !== '' &&
                    !isNaN(Number(userLat)) && !isNaN(Number(userLng));

  if (!hasCoords) {
    return ambulances;
  }

  const lat = Number(userLat);
  const lng = Number(userLng);

  const list = ambulances.map(amb => {
    const dist = calculateDistance(lat, lng, amb.currentLatitude, amb.currentLongitude);
    return {
      ...amb,
      distanceKm: parseFloat(dist.toFixed(2)),
      etaMinutes: Math.max(3, Math.round((dist / 40) * 60 + 2))
    };
  });

  return list
    .filter(a => a.distanceKm <= Number(maxRadiusKm))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function dispatchAmbulance({
  patientName,
  contactPhone,
  latitude,
  longitude,
  emergencyType = 'General Medical',
  vehicleType = 'Any',
  preferredHospitalId = null,
  notes = ''
}) {
  const userLat = Number(latitude);
  const userLng = Number(longitude);

  let candidateAmbulances = db.find('ambulances', a => a.status === 'Available' && a.verified !== false);

  if (vehicleType && vehicleType !== 'Any') {
    const filtered = candidateAmbulances.filter(a =>
      a.vehicleType.toLowerCase().includes(String(vehicleType).toLowerCase())
    );
    if (filtered.length > 0) {
      candidateAmbulances = filtered;
    }
  }

  if (candidateAmbulances.length === 0) {
    candidateAmbulances = db.find('ambulances', a => a.verified !== false);
  }

  let nearestAmbulance = null;
  let minDistance = Infinity;

  candidateAmbulances.forEach(amb => {
    const dist = calculateDistance(userLat, userLng, amb.currentLatitude, amb.currentLongitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestAmbulance = amb;
    }
  });

  if (!nearestAmbulance) {
    nearestAmbulance = db.find('ambulances')[0];
    minDistance = 5.0;
  }

  db.updateById('ambulances', nearestAmbulance.id, { status: 'Dispatched' });

  const hospitals = db.find('hospitals', h => h.verified && h.hasEmergency);
  let targetHospital = null;
  if (preferredHospitalId) {
    targetHospital = hospitals.find(h => h.id === preferredHospitalId);
  }
  if (!targetHospital && hospitals.length > 0) {
    let minDistHosp = Infinity;
    hospitals.forEach(h => {
      const d = calculateDistance(userLat, userLng, h.latitude, h.longitude);
      if (d < minDistHosp) {
        minDistHosp = d;
        targetHospital = h;
      }
    });
  }

  const etaMinutes = Math.max(4, Math.round((minDistance / 40) * 60 + 3));
  const trackingId = `SOS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const dispatchRecord = db.create('emergency_dispatches', {
    trackingId,
    patientName: safeTrim(patientName),
    contactPhone: safeTrim(contactPhone),
    emergencyType: safeTrim(emergencyType, 'General Medical'),
    vehicleType: nearestAmbulance.vehicleType,
    assignedAmbulanceId: nearestAmbulance.id,
    assignedAmbulance: {
      id: nearestAmbulance.id,
      vehicleNumber: nearestAmbulance.vehicleNumber,
      driverName: nearestAmbulance.driverName,
      contactNumber: nearestAmbulance.contactNumber,
      equipment: nearestAmbulance.equipment
    },
    userCoordinates: { latitude: userLat, longitude: userLng },
    destinationHospital: targetHospital ? {
      id: targetHospital.id,
      name: targetHospital.name,
      phone: targetHospital.emergencyHotline || targetHospital.phone,
      address: targetHospital.address
    } : null,
    distanceKm: parseFloat(minDistance.toFixed(2)),
    estimatedArrivalMinutes: etaMinutes,
    notes: safeTrim(notes),
    status: 'Dispatched',
    dispatchedAt: new Date().toISOString()
  });

  return dispatchRecord;
}

module.exports = {
  getNearbyAmbulances,
  dispatchAmbulance
};
