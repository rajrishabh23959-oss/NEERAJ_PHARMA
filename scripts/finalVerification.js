const http = require('http');
const fs = require('fs');
const path = require('path');
const { app, startServer } = require('../server');
const { seedDatabase } = require('../src/config/db');

async function runAudit() {
  console.log('======================================================================');
  console.log(' NEERAJ PHARMA HEALTHCARE PLATFORM — FINAL AUDIT & VERIFICATION SUITE');
  console.log('======================================================================\n');

  // 1. Postman Coverage Check (All 47 routes)
  console.log('--- 1. POSTMAN 47/47 ROUTE PARITY AUDIT ---');
  const colPath = path.resolve('./postman/neeraj_pharma_hospital_locator.postman_collection.json');
  const col = JSON.parse(fs.readFileSync(colPath, 'utf8'));
  const postmanEndpoints = [];
  function extractRequests(items) {
    for (const item of items) {
      if (item.request) {
        const method = item.request.method.toUpperCase();
        let rawUrl = item.request.url.raw || item.request.url;
        let normalizedPath = rawUrl.replace('{{baseUrl}}', '').split('?')[0].trim();
        postmanEndpoints.push({ method, path: normalizedPath, name: item.name });
      }
      if (item.item) extractRequests(item.item);
    }
  }
  extractRequests(col.item);

  const all47Routes = [
    { method: 'GET', path: '/api' },
    { method: 'GET', path: '/api/health' },
    { method: 'POST', path: '/api/auth/register' },
    { method: 'POST', path: '/api/auth/login' },
    { method: 'GET', path: '/api/auth/me' },
    { method: 'PUT', path: '/api/auth/me' },
    { method: 'GET', path: '/api/hospitals' },
    { method: 'GET', path: '/api/hospitals/:id' },
    { method: 'GET', path: '/api/hospitals/:id/availability' },
    { method: 'PATCH', path: '/api/hospitals/:id/availability' },
    { method: 'PATCH', path: '/api/hospitals/:id/contacts' },
    { method: 'POST', path: '/api/hospitals' },
    { method: 'PUT', path: '/api/hospitals/:id' },
    { method: 'DELETE', path: '/api/hospitals/:id' },
    { method: 'GET', path: '/api/doctors' },
    { method: 'GET', path: '/api/doctors/:id' },
    { method: 'POST', path: '/api/doctors' },
    { method: 'PUT', path: '/api/doctors/:id' },
    { method: 'DELETE', path: '/api/doctors/:id' },
    { method: 'GET', path: '/api/locations' },
    { method: 'GET', path: '/api/locations/:id' },
    { method: 'POST', path: '/api/locations' },
    { method: 'PUT', path: '/api/locations/:id' },
    { method: 'DELETE', path: '/api/locations/:id' },
    { method: 'GET', path: '/api/emergency/contacts' },
    { method: 'POST', path: '/api/emergency/contacts' },
    { method: 'PUT', path: '/api/emergency/contacts/:id' },
    { method: 'DELETE', path: '/api/emergency/contacts/:id' },
    { method: 'GET', path: '/api/emergency/ambulances' },
    { method: 'POST', path: '/api/emergency/ambulances' },
    { method: 'PUT', path: '/api/emergency/ambulances/:id' },
    { method: 'DELETE', path: '/api/emergency/ambulances/:id' },
    { method: 'POST', path: '/api/emergency/dispatch' },
    { method: 'GET', path: '/api/emergency/dispatch/:trackingId' },
    { method: 'GET', path: '/api/admin/stats' },
    { method: 'GET', path: '/api/admin/hospitals/pending' },
    { method: 'PATCH', path: '/api/admin/hospitals/:id/verify' },
    { method: 'GET', path: '/api/admin/emergency/pending' },
    { method: 'PATCH', path: '/api/admin/emergency-contacts/:id/verify' },
    { method: 'PATCH', path: '/api/admin/ambulances/:id/verify' },
    { method: 'GET', path: '/api/admin/users' },
    { method: 'GET', path: '/api/admin/users/:id' },
    { method: 'PUT', path: '/api/admin/users/:id' },
    { method: 'PATCH', path: '/api/admin/users/:id/role' },
    { method: 'PATCH', path: '/api/admin/users/:id/status' },
    { method: 'DELETE', path: '/api/admin/users/:id' },
    { method: 'POST', path: '/api/admin/reseed' }
  ];

  let postmanMatchCount = 0;
  for (const r of all47Routes) {
    const pattern = new RegExp('^' + r.path.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$');
    const m = postmanEndpoints.find(p => p.method === r.method && pattern.test(p.path));
    if (m) postmanMatchCount++;
  }
  console.log(`Postman Route Parity: ${postmanMatchCount}/47 (${Math.round((postmanMatchCount / 47) * 100)}%)`);
  if (postmanMatchCount !== 47) throw new Error('Postman coverage incomplete!');

  // 2. Documentation Coverage Check
  console.log('\n--- 2. API DOCUMENTATION 47/47 AUDIT ---');
  const docPath = path.resolve('./docs/API_DOCUMENTATION.md');
  const docContent = fs.readFileSync(docPath, 'utf8');
  let docMatchCount = 0;
  for (const r of all47Routes) {
    const searchPattern = `${r.method} \`${r.path}\``;
    const searchPattern2 = `\`${r.method}\` | \`${r.path}\``;
    const searchPattern3 = `${r.method} ${r.path}`;
    if (docContent.includes(searchPattern) || docContent.includes(searchPattern2) || docContent.includes(searchPattern3)) {
      docMatchCount++;
    }
  }
  console.log(`Documentation Route Coverage: ${docMatchCount}/47 (${Math.round((docMatchCount / 47) * 100)}%)`);
  if (docMatchCount !== 47) throw new Error('API Documentation incomplete!');

  // 3. Live Functional Testing
  console.log('\n--- 3. LIVE FUNCTIONAL SECURITY & HARDENING TESTS ---');
  seedDatabase();
  const PORT = 5099;
  const srv = http.createServer(app);
  await new Promise(resolve => srv.listen(PORT, resolve));

  function apiCall(method, apiPath, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const opt = {
        hostname: '127.0.0.1',
        port: PORT,
        path: apiPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      const req = http.request(opt, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch (_) { json = raw; }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  try {
    // 3a. Admin Login
    const loginRes = await apiCall('POST', '/api/auth/login', {
      email: 'admin@neerajpharma.com',
      password: 'Admin@12345'
    });
    const adminToken = loginRes.body.data.token;
    console.log('✓ Admin login successful');

    // 3b. Security Headers & X-Powered-By check
    const healthRes = await apiCall('GET', '/api/health');
    console.log('Checking Security Headers on /api/health:');
    console.log(`  X-Powered-By is undefined: ${healthRes.headers['x-powered-by'] === undefined ? 'PASS' : 'FAIL'}`);
    console.log(`  X-Content-Type-Options: ${healthRes.headers['x-content-type-options']}`);
    console.log(`  X-Frame-Options: ${healthRes.headers['x-frame-options']}`);
    if (healthRes.headers['x-powered-by'] !== undefined || healthRes.headers['x-content-type-options'] !== 'nosniff') {
      throw new Error('Security headers check failed');
    }

    // 3c. Stronger Password Check ('123456')
    const weakReg = await apiCall('POST', '/api/auth/register', {
      name: 'Weak Pass Test',
      email: `weak_${Date.now()}@test.com`,
      password: '123456'
    });
    console.log(`Registration with '123456' status: ${weakReg.status} (Expected 400 Bad Request)`);
    if (weakReg.status !== 400) throw new Error('Weak password was not rejected with 400!');

    // 3d. Orphan Doctor Cleanup on Hospital Delete
    const docBefore = await apiCall('GET', '/api/doctors?hospitalId=hosp_001');
    console.log(`Doctors before hospital delete: ${docBefore.body.data.length}`);
    const delHosp = await apiCall('DELETE', '/api/hospitals/hosp_001', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    console.log(`DELETE /api/hospitals/hosp_001 status: ${delHosp.status}`);
    const docAfter = await apiCall('GET', '/api/doctors?hospitalId=hosp_001');
    console.log(`Doctors after hospital delete: ${docAfter.body.data.length} (Expected 0)`);
    if (docAfter.body.data.length !== 0) throw new Error('Orphan doctors not cascade-deleted!');

    // Reseed DB
    await apiCall('POST', '/api/admin/reseed', null, { 'Authorization': `Bearer ${adminToken}` });

    // 3e. Production Guard on Reseed
    process.env.NODE_ENV = 'production';
    const prodReseed = await apiCall('POST', '/api/admin/reseed', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    process.env.NODE_ENV = 'development';
    console.log(`Reseed under NODE_ENV=production status: ${prodReseed.status} (Expected 403 Forbidden)`);
    if (prodReseed.status !== 403) throw new Error('Production reseed guard failed!');

    // 3f. Rate Limiting Burst
    console.log('Testing rate limiting with burst requests:');
    let rateLimited = false;
    for (let i = 0; i < 20; i++) {
      const r = await apiCall('POST', '/api/auth/login', { email: 'bad@test.com', password: 'Password@123' });
      if (r.status === 429) {
        rateLimited = true;
        console.log(`  Hit 429 Too Many Requests on request #${i + 1}`);
        break;
      }
    }
    if (!rateLimited) throw new Error('Rate limit 429 not triggered!');

    console.log('\n======================================================================');
    console.log(' ALL AUDIT AND HARDENING CHECKS PASSED WITH 100% SUCCESS!');
    console.log('======================================================================');
  } finally {
    await new Promise(resolve => srv.close(resolve));
    seedDatabase();
  }
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
