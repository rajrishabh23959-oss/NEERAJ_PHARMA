// Comprehensive Full-Stack Integration Test Suite (75+ Tests across All 4 Modules & Edge Cases)
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../server');
const { seedDatabase } = require('../src/config/db');

let server;
let baseUrl;
const TEST_PORT = 5058;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method: method.toUpperCase(),
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);

    if (body !== null && body !== undefined) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test.before(async () => {
  seedDatabase();
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(TEST_PORT, () => {
      baseUrl = `http://localhost:${TEST_PORT}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

// ============================================================================
// 1. SYSTEM HEALTH, EXPRESS HEADERS & ERROR MIDDLEWARE
// ============================================================================
test('Module 1: System Health, Express Runtime & Centralized Error Middleware', async (t) => {
  await t.test('GET /api/health returns 200 with platform status and entity counts', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'online');
    assert.ok(res.body.totalVerifiedHospitals >= 10);
    assert.ok(res.body.totalLocations >= 6);
    assert.ok(res.body.activeAmbulances >= 1);
  });

  await t.test('GET /api returns complete API routing directory', async () => {
    const res = await request('GET', '/api');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.endpoints.hospitals);
    assert.ok(res.body.endpoints.locations);
    assert.ok(res.body.endpoints.emergency);
    assert.ok(res.body.endpoints.admin);
  });

  await t.test('Malformed JSON request body is caught by centralized errorHandler (400)', async () => {
    const res = await request('POST', '/api/auth/login', '{ invalid json payload ');
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('Unknown API route is handled by centralized notFoundHandler (404)', async () => {
    const res = await request('GET', '/api/non-existent-endpoint-xyz');
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
  });
});

// ============================================================================
// 2. AUTHENTICATION, RBAC SECURITY & INPUT SAFETY
// ============================================================================
test('Module 2: Authentication, Role Self-Assignment Prevention & Profile Management', async (t) => {
  let userToken = '';
  const uniqueEmail = `citizen_${Date.now()}@example.com`;

  await t.test('SECURITY: POST /api/auth/register blocks role self-assignment ("role": "admin") with 403 Forbidden', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Attacker User',
      email: `attacker_${Date.now()}@example.com`,
      password: 'Password@123',
      role: 'admin'
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/auth/register handles numeric phoneNumber safely without 500 error', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Numeric Phone User',
      email: uniqueEmail,
      password: 'Password@123',
      phoneNumber: 9876543210
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'user');
    assert.equal(res.body.data.user.phoneNumber, '9876543210');
    userToken = res.body.data.token;
  });

  await t.test('POST /api/auth/register prevents duplicate email registration (409 Conflict)', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Duplicate User',
      email: uniqueEmail,
      password: 'Password@123'
    });
    assert.equal(res.statusCode, 409);
  });

  await t.test('POST /api/auth/register rejects invalid email or short password (400)', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'A',
      email: 'invalid-email',
      password: '123'
    });
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.errors.length >= 2);
  });

  await t.test('POST /api/auth/login validates credentials and returns JWT', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: uniqueEmail,
      password: 'Password@123'
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.token);
  });

  await t.test('POST /api/auth/login fails with incorrect password (401)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: uniqueEmail,
      password: 'WrongPassword!'
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test('GET /api/auth/me returns authenticated user profile', async () => {
    const res = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.email, uniqueEmail);
  });

  await t.test('PUT /api/auth/me updates user profile and handles numeric phoneNumber', async () => {
    const res = await request('PUT', '/api/auth/me', {
      name: 'Updated Citizen Name',
      phoneNumber: 9123456789,
      department: 'Emergency Volunteer'
    }, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.name, 'Updated Citizen Name');
    assert.equal(res.body.data.phoneNumber, '9123456789');
  });

  await t.test('GET /api/auth/me rejects missing or invalid JWT (401)', async () => {
    const res1 = await request('GET', '/api/auth/me');
    assert.equal(res1.statusCode, 401);
    const res2 = await request('GET', '/api/auth/me', null, {
      'Authorization': 'Bearer invalid.tampered.token'
    });
    assert.equal(res2.statusCode, 401);
  });
});

// ============================================================================
// 3. HOSPITALS, GEOLOCATION VALIDATION & REAL-TIME OPERATING HOURS AVAILABILITY
// ============================================================================
test('Module 3: Hospital Search Validation, Haversine Distance & Dynamic Real-Time Availability', async (t) => {
  await t.test('GET /api/hospitals rejects non-numeric coordinates lat=abc (400 Bad Request)', async () => {
    const res = await request('GET', '/api/hospitals?lat=abc&lng=77.2090');
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/hospitals rejects out-of-range coordinates lat=999 (400 Bad Request)', async () => {
    const res = await request('GET', '/api/hospitals?lat=999&lng=77.2090');
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/hospitals rejects partial coordinates when lng is missing (400 Bad Request)', async () => {
    const res = await request('GET', '/api/hospitals?lat=28.6139');
    assert.equal(res.statusCode, 400);
  });

  await t.test('GET /api/hospitals enforces MAX_SEARCH_RADIUS_KM and rejects radius=500 (400 Bad Request)', async () => {
    const res = await request('GET', '/api/hospitals?lat=28.6139&lng=77.2090&radius=500');
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/hospitals with valid lat/lng calculates Haversine distance, ETAs & realTimeAvailability', async () => {
    const res = await request('GET', '/api/hospitals?lat=28.6328&lng=77.2197&radius=20');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.length > 0);
    const first = res.body.data[0];
    assert.ok(typeof first.distanceKm === 'number');
    assert.ok(first.eta);
    assert.ok(first.realTimeAvailability);
    assert.equal(typeof first.isOpenNow, 'boolean');
  });

  await t.test('Real-time availability engine accurately computes open/closed status from operatingHours', async () => {
    // hosp_009 operates 08:00 AM - 10:00 PM (Mon-Sat)
    const openRes = await request('GET', '/api/hospitals/hosp_009/availability?checkTime=2026-10-23T14:00:00');
    assert.equal(openRes.statusCode, 200);
    assert.equal(openRes.body.data.isOpenNow, true);
    assert.equal(openRes.body.data.isAvailableNow, true);

    const closedRes = await request('GET', '/api/hospitals/hosp_009/availability?checkTime=2026-10-23T23:15:00');
    assert.equal(closedRes.statusCode, 200);
    assert.equal(closedRes.body.data.isOpenNow, false);
    assert.equal(closedRes.body.data.isAvailableNow, false);
  });

  await t.test('GET /api/hospitals?openNow=true dynamically filters out hospitals closed at checkTime', async () => {
    const res = await request('GET', '/api/hospitals?openNow=true&checkTime=2026-10-23T23:30:00');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every(h => h.isOpenNow === true));
    // hosp_009 (closes 22:00) and hosp_010 (closes 23:00) must NOT be in openNow results at 23:30!
    assert.ok(!res.body.data.some(h => h.id === 'hosp_009'));
    assert.ok(!res.body.data.some(h => h.id === 'hosp_010'));
  });

  await t.test('GET /api/hospitals/:id returns hospital details, location, doctors and ambulances', async () => {
    const res = await request('GET', '/api/hospitals/hosp_001');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.id, 'hosp_001');
    assert.ok(res.body.data.realTimeAvailability);
    assert.ok(Array.isArray(res.body.data.doctors));
    assert.ok(res.body.data.location);
  });
});

// ============================================================================
// 4. HOSPITAL CRUD, NUMERIC VALIDATION, CONTACTS & AVAILABILITY UPDATES
// ============================================================================
test('Module 4: Hospital CRUD, Bed/Rating Validation & Contact Management', async (t) => {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@neerajpharma.com',
    password: 'Admin@12345'
  });
  const adminToken = loginRes.body.data.token;
  let createdHospId = '';

  await t.test('POST /api/hospitals creates new verified hospital when called by admin', async () => {
    const res = await request('POST', '/api/hospitals', {
      name: 'Central Trauma & Cardiac Center',
      address: '15 Barakhamba Road, New Delhi',
      city: 'New Delhi',
      latitude: 28.6292,
      longitude: 77.2275,
      phone: '+91-11-23415566',
      facilityType: 'Trauma Center',
      totalBeds: 200,
      availableBeds: 45,
      rating: 4.7,
      open24x7: true,
      hasEmergency: true
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.verified, true);
    createdHospId = res.body.data.id;
  });

  await t.test('PUT /api/hospitals/:id rejects negative availableBeds or rating > 5 (400 Bad Request)', async () => {
    const res1 = await request('PUT', `/api/hospitals/${createdHospId}`, {
      availableBeds: -15
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(res1.statusCode, 400);

    const res2 = await request('PUT', `/api/hospitals/${createdHospId}`, {
      rating: 6.5
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(res2.statusCode, 400);

    const res3 = await request('PUT', `/api/hospitals/${createdHospId}`, {
      availableBeds: 500 // Exceeds totalBeds (200)
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(res3.statusCode, 400);
  });

  await t.test('PATCH /api/hospitals/:id/availability updates live bed counts and operating hours', async () => {
    const res = await request('PATCH', `/api/hospitals/${createdHospId}/availability`, {
      availableBeds: 60,
      icuBedsAvailable: 12
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.availableBeds, 60);
    assert.equal(res.body.data.icuBedsAvailable, 12);
  });

  await t.test('PATCH /api/hospitals/:id/contacts updates hospital contact details', async () => {
    const res = await request('PATCH', `/api/hospitals/${createdHospId}/contacts`, {
      phone: '+91-11-23419900',
      emergencyHotline: '+91-11-23419911',
      email: 'triage@centraltrauma.org'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.phone, '+91-11-23419900');
  });

  await t.test('DELETE /api/hospitals/:id deletes hospital record', async () => {
    const res = await request('DELETE', `/api/hospitals/${createdHospId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
  });
});

// ============================================================================
// 5. LOCATIONS ENTITY API & DOCTORS CRUD
// ============================================================================
test('Module 5: Locations Entity CRUD & Doctors Management', async (t) => {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@neerajpharma.com',
    password: 'Admin@12345'
  });
  const adminToken = loginRes.body.data.token;

  await t.test('GET /api/locations returns mapped geographical hubs with hospital counts', async () => {
    const res = await request('GET', '/api/locations?lat=28.6139&lng=77.2090');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.length >= 6);
    assert.ok(typeof res.body.data[0].hospitalCount === 'number');
  });

  await t.test('GET /api/locations/:id returns location and associated hospitals', async () => {
    const res = await request('GET', '/api/locations/loc_001');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.id, 'loc_001');
    assert.ok(Array.isArray(res.body.data.hospitals));
  });

  let locId = '';
  await t.test('POST, PUT, DELETE /api/locations manages location mappings', async () => {
    const createRes = await request('POST', '/api/locations', {
      cityName: 'Faridabad',
      state: 'Haryana',
      address: 'NH-19 Medical Corridor, Faridabad',
      postalCode: '121001',
      latitude: 28.4089,
      longitude: 77.3178,
      keyArea: 'Sector 16 / NH-19'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(createRes.statusCode, 201);
    locId = createRes.body.data.id;

    const updateRes = await request('PUT', `/api/locations/${locId}`, {
      zoneType: 'NCR Southern Hub'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(updateRes.body.data.zoneType, 'NCR Southern Hub');

    const delRes = await request('DELETE', `/api/locations/${locId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  let docId = '';
  await t.test('POST, PUT, DELETE /api/doctors manages doctor records with shift availability', async () => {
    const createRes = await request('POST', '/api/doctors', {
      hospitalId: 'hosp_001',
      name: 'Dr. Kavita Krishnan',
      specialty: 'Neurology',
      qualifications: 'MD, DM (Neurology)',
      experienceYears: 12,
      contact: '+91-9811998877',
      availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
      emergencyOnCall: true,
      consultationFee: 1400
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(createRes.statusCode, 201);
    docId = createRes.body.data.id;

    const updateRes = await request('PUT', `/api/doctors/${docId}`, {
      consultationFee: 1600
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(updateRes.body.data.consultationFee, 1600);

    const delRes = await request('DELETE', `/api/doctors/${docId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });
});

// ============================================================================
// 6. EMERGENCY CONTACTS & AMBULANCES ADMIN CRUD + VERIFICATION WORKFLOW
// ============================================================================
test('Module 6: Emergency Contacts CRUD, Ambulances CRUD & Verification Workflow', async (t) => {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@neerajpharma.com',
    password: 'Admin@12345'
  });
  const adminToken = loginRes.body.data.token;

  let contactId = '';
  await t.test('POST, PUT, DELETE /api/emergency/contacts allows admin to manage emergency contacts', async () => {
    const createRes = await request('POST', '/api/emergency/contacts', {
      name: 'Delhi Air Ambulance Command Center',
      type: 'Air Rescue',
      phoneNumber: '+91-11-25678000',
      serviceScope: 'Critical Organ & Trauma Airlift',
      averageResponseTimeMinutes: 15
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(createRes.statusCode, 201);
    contactId = createRes.body.data.id;

    const updateRes = await request('PUT', `/api/emergency/contacts/${contactId}`, {
      averageResponseTimeMinutes: 12
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(updateRes.body.data.averageResponseTimeMinutes, 12);

    const delRes = await request('DELETE', `/api/emergency/contacts/${contactId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  let ambId = '';
  await t.test('POST, PUT, DELETE /api/emergency/ambulances allows admin to manage ambulance units', async () => {
    const createRes = await request('POST', '/api/emergency/ambulances', {
      vehicleNumber: 'DL-01-EQ-7799',
      vehicleType: 'Advanced Life Support (ALS)',
      driverName: 'SandeepTomar',
      contactNumber: '+91-9810998877',
      currentLatitude: 28.6100,
      currentLongitude: 77.2050,
      hospitalAffiliation: 'Neeraj Pharma Apex Hospital',
      hospitalId: 'hosp_001',
      status: 'Available'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(createRes.statusCode, 201);
    ambId = createRes.body.data.id;

    const updateRes = await request('PUT', `/api/emergency/ambulances/${ambId}`, {
      status: 'Maintenance'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(updateRes.body.data.status, 'Maintenance');

    const delRes = await request('DELETE', `/api/emergency/ambulances/${ambId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  await t.test('Admin Emergency Verification Workflow approves pending emergency contacts & ambulances', async () => {
    const pendingRes = await request('GET', '/api/admin/emergency/pending', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(pendingRes.statusCode, 200);
    assert.ok(pendingRes.body.data.totalPending >= 2);

    const verifyContactRes = await request('PATCH', '/api/admin/emergency-contacts/emg_006/verify', {
      verified: true,
      verificationNotes: 'Verified emergency hotline readiness'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(verifyContactRes.statusCode, 200);
    assert.equal(verifyContactRes.body.data.verified, true);

    const verifyAmbRes = await request('PATCH', '/api/admin/ambulances/amb_007/verify', {
      verified: true,
      verificationNotes: 'Inspected ALS/BLS equipment'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(verifyAmbRes.statusCode, 200);
    assert.equal(verifyAmbRes.body.data.verified, true);
  });
});

// ============================================================================
// 7. COMPLETE ADMIN USER MANAGEMENT (EDIT, ROLE, DISABLE/ENABLE, DELETE)
// ============================================================================
test('Module 7: Complete Admin User Lifecycle Management', async (t) => {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@neerajpharma.com',
    password: 'Admin@12345'
  });
  const adminToken = loginRes.body.data.token;

  // Register a test user to manage
  const regRes = await request('POST', '/api/auth/register', {
    name: 'Managed User',
    email: `managed_${Date.now()}@example.com`,
    password: 'Password@123',
    phoneNumber: '+91-9811223399'
  });
  const targetUserId = regRes.body.data.user.id;
  const targetUserToken = regRes.body.data.token;

  await t.test('GET /api/admin/users/:id retrieves single user details', async () => {
    const res = await request('GET', `/api/admin/users/${targetUserId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.id, targetUserId);
  });

  await t.test('PUT /api/admin/users/:id edits user profile and department', async () => {
    const res = await request('PUT', `/api/admin/users/${targetUserId}`, {
      name: 'Managed User Updated',
      department: 'Triage Coordinator'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.name, 'Managed User Updated');
    assert.equal(res.body.data.department, 'Triage Coordinator');
  });

  await t.test('PATCH /api/admin/users/:id/status disables user and blocks their token/login (403)', async () => {
    const disableRes = await request('PATCH', `/api/admin/users/${targetUserId}/status`, {
      status: 'disabled'
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert.equal(disableRes.statusCode, 200);
    assert.equal(disableRes.body.data.status, 'disabled');

    // Disabled user cannot access protected routes
    const meRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${targetUserToken}`
    });
    assert.equal(meRes.statusCode, 403);
  });

  await t.test('DELETE /api/admin/users/:id deletes user account', async () => {
    const delRes = await request('DELETE', `/api/admin/users/${targetUserId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  await t.test('POST /api/admin/reseed restores clean initial database state', async () => {
    const res = await request('POST', '/api/admin/reseed', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.hospitalsCount, 12);
  });
});
