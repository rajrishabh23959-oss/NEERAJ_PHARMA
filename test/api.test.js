require('dotenv').config();
const http = require('http');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const seedData = require('../src/seed/seeder');

let server;
let baseUrl;

const runTests = async () => {
  console.log('\n=============================================');
  console.log('🧪 RUNNING NEERAJPHARMA BACKEND API TEST SUITE');
  console.log('=============================================\n');

  try {
    // 1. Connect DB and seed
    await connectDB();
    await seedData();

    // 2. Start temporary HTTP server on random port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`Test server running at ${baseUrl}`);
        resolve();
      });
    });

    let testsPassed = 0;
    let testsFailed = 0;

    const assert = (condition, testName) => {
      if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        testsPassed++;
      } else {
        console.error(`  ❌ FAIL: ${testName}`);
        testsFailed++;
      }
    };

    // TEST 1: Health check
    console.log('\n--- 1. Service Health Check ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check returns 200 OK');
    assert(healthData.status === 'online', 'Status field is online');

    // TEST 2: User Login with Seeded Admin
    console.log('\n--- 2. Authentication & JWT ---');
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@neerajpharma.com',
        password: 'AdminPassword123!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Admin login returns 200');
    assert(!!loginData.token, 'Returns valid JWT token');
    assert(loginData.user.role === 'super_admin', 'User role is super_admin');

    const adminToken = loginData.token;

    // TEST 3: Invalid Login rejection
    const invalidLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@neerajpharma.com',
        password: 'WrongPassword!',
      }),
    });
    assert(invalidLoginRes.status === 401, 'Rejects invalid password with 401');

    // TEST 4: User Registration
    const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Intern User',
        email: `intern_${Date.now()}@neerajpharma.com`,
        password: 'InternSecurePass123!',
        phone: '+91 99999 88888',
        role: 'user',
      }),
    });
    const regData = await registerRes.json();
    assert(registerRes.status === 201, 'User registration returns 201 Created');
    assert(!!regData.token, 'Returns JWT token upon registration');

    // TEST 5: Geolocation Nearby Hospitals API
    console.log('\n--- 3. Geolocation & Hospital Locator ---');
    // AIIMS Delhi coords: lat 28.5672, lng 77.2090
    const nearbyRes = await fetch(
      `${baseUrl}/api/v1/hospitals/nearby?lat=28.5672&lng=77.2090&radius=15`
    );
    const nearbyData = await nearbyRes.json();
    assert(nearbyRes.status === 200, 'Nearby API returns 200 OK');
    assert(nearbyData.count > 0, 'Found nearby hospitals within 15km');
    assert(nearbyData.data[0].distanceKm !== undefined, 'Calculated distanceKm is present');
    assert(nearbyData.data[0].distanceKm <= 15, 'Hospital distance is within 15km radius');

    // TEST 6: Search & Filtering
    console.log('\n--- 4. Search & Multi-Filter API ---');
    const searchRes = await fetch(`${baseUrl}/api/v1/hospitals/search?city=Delhi&specialty=Cardiology`);
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Hospital search returns 200 OK');
    assert(searchData.count > 0, 'Filters hospitals by City and Specialty');

    // TEST 7: 1-Tap Quick SOS Endpoint
    console.log('\n--- 5. Emergency Services & SOS ---');
    const sosRes = await fetch(`${baseUrl}/api/v1/emergency/quick-sos?lat=28.5672&lng=77.2090`);
    const sosData = await sosRes.json();
    assert(sosRes.status === 200, 'Quick SOS endpoint returns 200 OK');
    assert(sosData.sosSummary.nearestHospitals.length > 0, 'SOS returns closest emergency hospitals');
    assert(sosData.sosSummary.urgentHelplines.length > 0, 'SOS returns emergency helplines');

    // TEST 8: Real-Time Bed Availability Update
    console.log('\n--- 6. Real-Time Bed & ICU Availability ---');
    const targetHospital = nearbyData.data[0];
    const updateBedRes = await fetch(
      `${baseUrl}/api/v1/hospitals/${targetHospital._id}/availability`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          availableIcuBeds: 25,
          availableOxygenBeds: 45,
          isEmergencyAccepting: true,
        }),
      }
    );
    const updateBedData = await updateBedRes.json();
    assert(updateBedRes.status === 200, 'Bed availability update returns 200 OK');
    assert(updateBedData.data.availableIcuBeds === 25, 'Available ICU bed count updated to 25');

    // TEST 9: Admin Dashboard Metrics
    console.log('\n--- 7. Admin Management APIs ---');
    const statsRes = await fetch(`${baseUrl}/api/v1/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'Admin dashboard stats returns 200 OK');
    assert(statsData.data.hospitals.total > 0, 'Returns total hospital metrics');
    assert(statsData.data.ambulances.total > 0, 'Returns ambulance count');

    console.log('\n=============================================');
    console.log(`🏁 TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('=============================================\n');

    server.close();
    await disconnectDB();

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test suite fatal error:', err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
};

runTests();
