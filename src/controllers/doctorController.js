// Doctors Management & Shift Availability Controller
const { db } = require('../config/db');
const { validateDoctor } = require('../models/schemas');
const { computeDoctorAvailability } = require('../services/availabilityService');
const { safeTrim } = require('../utils/validator');
const { success, error } = require('../utils/response');

function getDoctors(req, res) {
  const { hospitalId, specialty, emergencyOnCall, availableNow, checkTime } = req.query;

  let doctors = db.find('doctors');

  if (hospitalId) {
    doctors = doctors.filter(d => d.hospitalId === hospitalId);
  }

  if (specialty && specialty !== 'all') {
    const sp = String(specialty).toLowerCase();
    doctors = doctors.filter(d => d.specialty && d.specialty.toLowerCase().includes(sp));
  }

  if (emergencyOnCall === 'true') {
    doctors = doctors.filter(d => d.emergencyOnCall === true);
  }

  let enriched = doctors.map(doc => {
    const hospital = db.findById('hospitals', doc.hospitalId);
    const realTimeAvailability = computeDoctorAvailability(doc, checkTime);
    return {
      ...doc,
      isAvailableNow: realTimeAvailability.isAvailableNow,
      realTimeAvailability,
      hospitalName: hospital ? hospital.name : 'Unknown Hospital',
      hospitalCity: hospital ? hospital.city : ''
    };
  });

  if (availableNow === 'true') {
    enriched = enriched.filter(d => d.isAvailableNow === true);
  }

  return success(res, enriched, `Found ${enriched.length} doctors`);
}

function getDoctorById(req, res) {
  const { id } = req.params;
  const { checkTime } = req.query;
  const doctor = db.findById('doctors', id);

  if (!doctor) {
    return error(res, `Doctor with ID '${id}' not found`, 404);
  }

  const hospital = db.findById('hospitals', doctor.hospitalId);
  const realTimeAvailability = computeDoctorAvailability(doctor, checkTime);

  return success(res, {
    ...doctor,
    isAvailableNow: realTimeAvailability.isAvailableNow,
    realTimeAvailability,
    hospital: hospital || null
  }, 'Doctor profile retrieved successfully');
}

function createDoctor(req, res) {
  const { isValid, errors } = validateDoctor(req.body, false);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  const hospital = db.findById('hospitals', req.body.hospitalId);
  if (!hospital) {
    return error(res, `Associated hospital with ID '${req.body.hospitalId}' does not exist`, 400);
  }

  const newDoctor = db.create('doctors', {
    hospitalId: safeTrim(req.body.hospitalId),
    name: safeTrim(req.body.name),
    specialty: safeTrim(req.body.specialty),
    qualifications: safeTrim(req.body.qualifications, 'MBBS, MD'),
    experienceYears: req.body.experienceYears !== undefined ? Number(req.body.experienceYears) : 5,
    contact: req.body.contact ? safeTrim(req.body.contact) : hospital.phone,
    email: safeTrim(req.body.email),
    availability: safeTrim(req.body.availability, 'Mon - Fri (09:00 AM - 05:00 PM)'),
    shiftSchedule: req.body.shiftSchedule || null,
    emergencyOnCall: req.body.emergencyOnCall === true || req.body.emergencyOnCall === 'true',
    consultationFee: req.body.consultationFee !== undefined ? Number(req.body.consultationFee) : 1000,
    bio: safeTrim(req.body.bio)
  });

  return success(res, newDoctor, 'Doctor added successfully', 201);
}

function updateDoctor(req, res) {
  const { id } = req.params;
  const existing = db.findById('doctors', id);

  if (!existing) {
    return error(res, `Doctor with ID '${id}' not found`, 404);
  }

  const { isValid, errors } = validateDoctor(req.body, true);
  if (!isValid) {
    return error(res, `Validation failed: ${errors.join('; ')}`, 400, errors);
  }

  if (req.body.hospitalId !== undefined) {
    const hospital = db.findById('hospitals', req.body.hospitalId);
    if (!hospital) {
      return error(res, `Associated hospital with ID '${req.body.hospitalId}' does not exist`, 400);
    }
  }

  const updates = { ...req.body };
  if (updates.name !== undefined) updates.name = safeTrim(updates.name);
  if (updates.specialty !== undefined) updates.specialty = safeTrim(updates.specialty);
  if (updates.contact !== undefined) updates.contact = safeTrim(updates.contact);
  if (updates.experienceYears !== undefined) updates.experienceYears = Number(updates.experienceYears);
  if (updates.consultationFee !== undefined) updates.consultationFee = Number(updates.consultationFee);

  const updatedDoctor = db.updateById('doctors', id, updates);
  return success(res, updatedDoctor, 'Doctor updated successfully');
}

function deleteDoctor(req, res) {
  const { id } = req.params;
  const existing = db.findById('doctors', id);

  if (!existing) {
    return error(res, `Doctor with ID '${id}' not found`, 404);
  }

  db.deleteById('doctors', id);
  return success(res, { id }, 'Doctor deleted successfully');
}

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
