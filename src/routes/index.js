const express = require('express');
const authRoutes = require('./authRoutes');
const hospitalRoutes = require('./hospitalRoutes');
const doctorRoutes = require('./doctorRoutes');
const locationRoutes = require('./locationRoutes');
const emergencyRoutes = require('./emergencyRoutes');
const adminRoutes = require('./adminRoutes');
const { db } = require('../config/db');

const apiRouter = express.Router();

// Root API Directory
apiRouter.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Neeraj Pharma Healthcare & Emergency Hospital Locator REST API',
    version: '2.0.0',
    documentation: '/docs',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/me'
      },
      hospitals: {
        nearbySearch: 'GET /api/hospitals?lat={lat}&lng={lng}&radius={km}&facility={type}&specialty={spec}&openNow={bool}',
        details: 'GET /api/hospitals/:id',
        availability: 'GET /api/hospitals/:id/availability',
        updateAvailability: 'PATCH /api/hospitals/:id/availability (admin)',
        updateContacts: 'PATCH /api/hospitals/:id/contacts (admin)',
        create: 'POST /api/hospitals (auth)',
        update: 'PUT /api/hospitals/:id (admin)',
        delete: 'DELETE /api/hospitals/:id (admin)'
      },
      doctors: {
        list: 'GET /api/doctors?hospitalId={id}&specialty={spec}&availableNow={bool}',
        details: 'GET /api/doctors/:id',
        create: 'POST /api/doctors (admin)',
        update: 'PUT /api/doctors/:id (admin)',
        delete: 'DELETE /api/doctors/:id (admin)'
      },
      locations: {
        list: 'GET /api/locations?city={city}&lat={lat}&lng={lng}',
        details: 'GET /api/locations/:id',
        create: 'POST /api/locations (admin)',
        update: 'PUT /api/locations/:id (admin)',
        delete: 'DELETE /api/locations/:id (admin)'
      },
      emergency: {
        contacts: 'GET /api/emergency/contacts',
        createContact: 'POST /api/emergency/contacts (admin)',
        updateContact: 'PUT /api/emergency/contacts/:id (admin)',
        deleteContact: 'DELETE /api/emergency/contacts/:id (admin)',
        ambulances: 'GET /api/emergency/ambulances?lat={lat}&lng={lng}',
        createAmbulance: 'POST /api/emergency/ambulances (admin)',
        updateAmbulance: 'PUT /api/emergency/ambulances/:id (admin)',
        deleteAmbulance: 'DELETE /api/emergency/ambulances/:id (admin)',
        dispatch: 'POST /api/emergency/dispatch',
        track: 'GET /api/emergency/dispatch/:trackingId'
      },
      admin: {
        stats: 'GET /api/admin/stats (admin)',
        pendingHospitals: 'GET /api/admin/hospitals/pending (admin)',
        verifyHospital: 'PATCH /api/admin/hospitals/:id/verify (admin)',
        pendingEmergency: 'GET /api/admin/emergency/pending (admin)',
        verifyEmergencyContact: 'PATCH /api/admin/emergency-contacts/:id/verify (admin)',
        verifyAmbulance: 'PATCH /api/admin/ambulances/:id/verify (admin)',
        users: 'GET /api/admin/users (admin)',
        userDetails: 'GET /api/admin/users/:id (admin)',
        updateUser: 'PUT /api/admin/users/:id (admin)',
        updateRole: 'PATCH /api/admin/users/:id/role (admin)',
        updateStatus: 'PATCH /api/admin/users/:id/status (admin)',
        deleteUser: 'DELETE /api/admin/users/:id (admin)',
        reseed: 'POST /api/admin/reseed (admin)'
      }
    }
  });
});

// System Health Check
apiRouter.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    platform: 'Neeraj Pharma Healthcare & Emergency Hospital Locator API',
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    totalVerifiedHospitals: db.count('hospitals', h => h.verified),
    totalLocations: db.count('locations'),
    activeAmbulances: db.count('ambulances', a => a.status === 'Available' && a.verified !== false)
  });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/hospitals', hospitalRoutes);
apiRouter.use('/doctors', doctorRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/emergency', emergencyRoutes);
apiRouter.use('/admin', adminRoutes);

module.exports = apiRouter;
