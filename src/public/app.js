// State
let currentToken = localStorage.getItem('token') || '';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let activeFilters = {
  hasIcu: false,
  hasOxygen: false,
  is24x7: false,
  specialty: '',
  facility: '',
};

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  fetchInitialData();
  fetchHospitals();
  fetchAmbulances();
  fetchEmergencyContacts();
});

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Fetch dashboard stats
async function fetchInitialData() {
  try {
    const res = await fetch('/api/v1/hospitals?limit=100');
    const data = await res.json();
    if (data.success) {
      document.getElementById('statHospitals').textContent = data.total || data.count || '5+';
      
      let totalIcu = 0;
      data.data.forEach((h) => {
        if (h.availability && h.availability.availableIcuBeds) {
          totalIcu += h.availability.availableIcuBeds;
        }
      });
      document.getElementById('statIcu').textContent = totalIcu > 0 ? totalIcu : '63+';
    }

    const ambRes = await fetch('/api/v1/emergency/ambulances');
    const ambData = await ambRes.json();
    if (ambData.success) {
      document.getElementById('statAmbulances').textContent = ambData.count || '4';
    }

    const hlRes = await fetch('/api/v1/emergency/contacts');
    const hlData = await hlRes.json();
    if (hlData.success) {
      document.getElementById('statHelplines').textContent = hlData.count || '8';
    }
  } catch (err) {
    console.error('Error fetching initial metrics:', err);
  }
}

// Search Hospitals
async function searchHospitals() {
  const q = document.getElementById('searchInput').value.trim();
  const city = document.getElementById('citySelect').value;

  const params = new URLSearchParams();
  if (q) params.append('q', q);
  if (city) params.append('city', city);
  if (activeFilters.hasIcu) params.append('minBeds', '1');
  if (activeFilters.is24x7) params.append('is24x7', 'true');
  if (activeFilters.specialty) params.append('specialty', activeFilters.specialty);
  if (activeFilters.facility) params.append('facility', activeFilters.facility);

  document.getElementById('resultsCount').textContent = 'Searching...';

  try {
    const res = await fetch(`/api/v1/hospitals/search?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      renderHospitals(data.data);
      document.getElementById('resultsCount').textContent = `${data.count} Hospitals Found`;
      document.getElementById('resultsSubtext').textContent = q || city ? `Results matching "${q || city}"` : 'Showing verified healthcare centers';
    } else {
      showToast(data.message || 'Search failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to search API', 'error');
  }
}

// Locate Nearby using GPS
async function locateNearbyGps() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  showToast('Acquiring precise GPS coordinates...', 'success');
  document.getElementById('resultsCount').textContent = 'Locating GPS...';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      await fetchNearby(lat, lng);
    },
    async (err) => {
      console.warn('GPS denied or unavailable. Using Delhi NCR reference coordinates.');
      showToast('GPS access denied. Using Delhi NCR reference center.', 'error');
      await fetchNearby(28.5672, 77.2090); // Default to Delhi AIIMS coords
    },
    { timeout: 10000 }
  );
}

// Fetch Nearby Hospitals from Geolocation API
async function fetchNearby(lat, lng) {
  const radius = document.getElementById('radiusSelect').value;
  const params = new URLSearchParams({
    lat,
    lng,
    radius,
  });

  if (activeFilters.hasIcu) params.append('hasIcu', 'true');
  if (activeFilters.hasOxygen) params.append('hasOxygen', 'true');
  if (activeFilters.is24x7) params.append('is24x7', 'true');

  try {
    const res = await fetch(`/api/v1/hospitals/nearby?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      renderHospitals(data.data, true);
      document.getElementById('resultsCount').textContent = `${data.count} Hospitals within ${radius} km`;
      document.getElementById('resultsSubtext').textContent = `Closest emergency facilities sorted by GPS distance`;
      showToast(`Found ${data.count} hospitals within ${radius}km`, 'success');
    }
  } catch (err) {
    showToast('Nearby search failed', 'error');
  }
}

// Fetch default hospital list
async function fetchHospitals() {
  try {
    const res = await fetch('/api/v1/hospitals?limit=12');
    const data = await res.json();
    if (data.success) {
      renderHospitals(data.data);
      document.getElementById('resultsCount').textContent = `${data.count} Verified Hospitals`;
    }
  } catch (err) {
    console.error('Error fetching hospitals:', err);
  }
}

// Render Hospital Cards
function renderHospitals(hospitals, hasDistance = false) {
  const grid = document.getElementById('hospitalsGrid');
  grid.innerHTML = '';

  if (!hospitals || hospitals.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px solid var(--border);">
        <p style="font-size: 1.1rem; color: var(--text-muted); font-weight: 600;">No hospitals matched your filters.</p>
        <button class="btn btn-primary" style="margin-top: 12px;" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  hospitals.forEach((h) => {
    const avail = h.availability || {};
    const card = document.createElement('div');
    card.className = 'hospital-card';

    const distanceBadge = (hasDistance || h.distanceKm !== undefined)
      ? `<span class="badge-tag distance">📍 ${(h.distanceKm || 0).toFixed(1)} km away</span>`
      : '';

    const verifiedBadge = h.isVerified
      ? `<span class="badge-tag verified">✓ Verified</span>`
      : '';

    const facilitiesHtml = (h.facilities || [])
      .slice(0, 4)
      .map((f) => `<span class="fac-tag">${f}</span>`)
      .join('');

    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${h.image || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80'}" alt="${h.name}" loading="lazy" />
        <div class="card-badges">
          ${verifiedBadge}
          ${distanceBadge}
          <span class="badge-tag">${h.type || 'Hospital'}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-header-row">
          <h3 class="hospital-name">${h.name}</h3>
          <span class="hospital-rating">★ ${h.rating || 4.5}</span>
        </div>
        <p class="hospital-address">
          📍 ${h.address?.street || ''}, ${h.address?.city || ''} (${h.address?.state || ''})
        </p>

        <div class="availability-box">
          <div class="avail-item">
            <span class="avail-num">${avail.availableBeds || 0}</span>
            <span class="avail-label">General Beds</span>
          </div>
          <div class="avail-item highlight-icu">
            <span class="avail-num">${avail.availableIcuBeds || 0}</span>
            <span class="avail-label">ICU Beds</span>
          </div>
          <div class="avail-item highlight-oxy">
            <span class="avail-num">${avail.availableOxygenBeds || 0}</span>
            <span class="avail-label">Oxygen</span>
          </div>
        </div>

        <div class="facilities-tags">
          ${facilitiesHtml}
        </div>

        <div class="card-footer">
          <a href="tel:${h.emergencyHotline || h.contactPhone}" class="btn-call" aria-label="Call emergency hotline for ${h.name}">
            📞 Call Emergency (${h.emergencyHotline || h.contactPhone})
          </a>
          <button class="btn-update-beds" aria-label="Update real-time bed availability for ${h.name}" onclick="openBedModal('${h._id}', '${h.name.replace(/'/g, "\\'")}', ${avail.availableBeds || 0}, ${avail.availableIcuBeds || 0}, ${avail.availableOxygenBeds || 0}, ${avail.ambulanceCount || 2}, ${avail.isEmergencyAccepting !== false})">
            ⚙️ Update Beds
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Filter Pills handler
function togglePill(btn) {
  const filter = btn.getAttribute('data-filter');
  btn.classList.toggle('active');
  const isActive = btn.classList.contains('active');
  btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

  if (filter === 'hasIcu') activeFilters.hasIcu = isActive;
  if (filter === 'hasOxygen') activeFilters.hasOxygen = isActive;
  if (filter === 'is24x7') activeFilters.is24x7 = isActive;
  if (filter === 'trauma') activeFilters.facility = isActive ? 'Trauma' : '';
  if (filter === 'cardiology') activeFilters.specialty = isActive ? 'Cardiology' : '';

  searchHospitals();
}

function resetFilters() {
  activeFilters = { hasIcu: false, hasOxygen: false, is24x7: false, specialty: '', facility: '' };
  document.querySelectorAll('.pill').forEach((p) => {
    p.classList.remove('active');
    p.setAttribute('aria-pressed', 'false');
  });
  searchHospitals();
}
  document.getElementById('searchInput').value = '';
  document.getElementById('citySelect').value = '';
  fetchHospitals();
}

// Fetch Ambulances
async function fetchAmbulances() {
  try {
    const res = await fetch('/api/v1/emergency/ambulances');
    const data = await res.json();
    if (data.success) {
      renderAmbulances(data.data);
    }
  } catch (err) {
    console.error('Error loading ambulances:', err);
  }
}

function renderAmbulances(ambulances) {
  const grid = document.getElementById('ambulancesGrid');
  grid.innerHTML = '';

  ambulances.forEach((amb) => {
    const card = document.createElement('div');
    card.className = 'ambulance-card';
    card.innerHTML = `
      <div class="ambulance-top">
        <span class="amb-type">🚑 ${amb.type}</span>
        <span class="amb-badge">● ${amb.status.toUpperCase()}</span>
      </div>
      <div class="amb-details">
        <strong>Vehicle:</strong> ${amb.vehicleNumber}<br/>
        <strong>Provider:</strong> ${amb.providerName}<br/>
        <strong>Driver:</strong> ${amb.driverName}<br/>
        <strong>Base City:</strong> ${amb.city}
      </div>
      <a href="tel:${amb.contactNumber}" class="btn btn-primary full-width" aria-label="Dispatch ambulance vehicle ${amb.vehicleNumber}">
        📞 Dispatch Call (${amb.contactNumber})
      </a>
    `;
    grid.appendChild(card);
  });
}

// Fetch Emergency Helplines
async function fetchEmergencyContacts() {
  try {
    const res = await fetch('/api/v1/emergency/contacts');
    const data = await res.json();
    if (data.success) {
      renderHelplines(data.data);
    }
  } catch (err) {
    console.error('Error fetching helplines:', err);
  }
}

function renderHelplines(contacts) {
  const grid = document.getElementById('helplinesGrid');
  grid.innerHTML = '';

  contacts.forEach((c) => {
    const card = document.createElement('div');
    card.className = `helpline-card ${c.priority <= 1 ? 'urgent' : ''}`;
    card.innerHTML = `
      <div>
        <span class="hl-category">${c.category}</span>
        <h4 class="hl-title">${c.title}</h4>
        <a href="tel:${c.number}" class="hl-number" aria-label="Call emergency helpline ${c.name || c.title} at ${c.number}">${c.number}</a>
        <p style="font-size: 0.8125rem; color: var(--text-muted);">${c.description || ''}</p>
      </div>
      <a href="tel:${c.number}" class="btn btn-primary full-width" style="margin-top: 12px;" aria-label="Call ${c.name || c.title} at ${c.number}">
        📞 Call ${c.number}
      </a>
    `;
    grid.appendChild(card);
  });
}

// Quick SOS Trigger
async function triggerGpsSos() {
  openSosModal();
  const content = document.getElementById('sosContent');
  content.innerHTML = '<div class="loading-spinner">Acquiring current GPS & dispatching emergency triage...</div>';

  if (!navigator.geolocation) {
    fetchQuickSos(28.5672, 77.2090);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => fetchQuickSos(pos.coords.latitude, pos.coords.longitude),
    () => fetchQuickSos(28.5672, 77.2090),
    { timeout: 8000 }
  );
}

async function fetchQuickSos(lat, lng) {
  try {
    const res = await fetch(`/api/v1/emergency/quick-sos?lat=${lat}&lng=${lng}`);
    const data = await res.json();

    if (data.success) {
      renderSosSummary(data.sosSummary);
    }
  } catch (err) {
    document.getElementById('sosContent').innerHTML = '<p style="color: var(--emergency);">Emergency triage connection failed. Please dial 112 or 108 directly!</p>';
  }
}

function renderSosSummary(summary) {
  const content = document.getElementById('sosContent');
  let hospitalsHtml = '';
  (summary.nearestHospitals || []).forEach((h) => {
    hospitalsHtml += `
      <div class="sos-hospital-item">
        <div>
          <strong>${h.name}</strong> (${(h.distanceKm || 0).toFixed(1)} km away)<br/>
          <span style="font-size: 0.8125rem; color: var(--emergency); font-weight: 700;">
            ICU Beds Available: ${h.availability?.availableIcuBeds || 0}
          </span>
        </div>
        <a href="tel:${h.emergencyHotline}" class="btn btn-sos-sm">📞 Call ${h.emergencyHotline}</a>
      </div>
    `;
  });

  let ambulancesHtml = '';
  (summary.nearestAmbulances || []).forEach((amb) => {
    ambulancesHtml += `
      <div class="sos-ambulance-item">
        <div>
          <strong>🚑 ${amb.type}</strong> (${(amb.distanceKm || 0).toFixed(1)} km)<br/>
          <span style="font-size: 0.8125rem; color: var(--text-muted);">${amb.providerName} | ${amb.driverName}</span>
        </div>
        <a href="tel:${amb.contactNumber}" class="btn btn-primary btn-sm">📞 Call ${amb.contactNumber}</a>
      </div>
    `;
  });

  content.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h4 style="color: var(--emergency); margin-bottom: 8px;">🚨 Nearest Critical Care Hospitals:</h4>
      ${hospitalsHtml || '<p>No immediate hospital found in radius.</p>'}
    </div>

    <div style="margin-bottom: 16px;">
      <h4 style="color: var(--primary); margin-bottom: 8px;">🚑 Rapid Dispatch Ambulances:</h4>
      ${ambulancesHtml || '<p>Call National Ambulance 108 immediately.</p>'}
    </div>

    <div style="background: #fee2e2; padding: 12px; border-radius: 8px; font-size: 0.875rem;">
      <strong>⚠️ Instructions:</strong>
      <ul style="padding-left: 20px; margin-top: 4px;">
        ${summary.instructions.map((i) => `<li>${i}</li>`).join('')}
      </ul>
    </div>
  `;
}

// Modal Triggers
function openSosModal() {
  document.getElementById('sosModal').classList.add('open');
}
function closeSosModal() {
  document.getElementById('sosModal').classList.remove('open');
}

function openAuthModal() {
  if (currentUser) {
    if (confirm(`Logged in as ${currentUser.name} (${currentUser.role}). Do you want to sign out?`)) {
      logout();
    }
    return;
  }
  document.getElementById('authModal').classList.add('open');
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}

function switchAuthTab(tab) {
  const loginBtn = document.getElementById('loginTabBtn');
  const registerBtn = document.getElementById('registerTabBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (tab === 'login') {
    loginBtn.classList.add('active');
    loginBtn.setAttribute('aria-selected', 'true');
    registerBtn.classList.remove('active');
    registerBtn.setAttribute('aria-selected', 'false');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginBtn.classList.remove('active');
    loginBtn.setAttribute('aria-selected', 'false');
    registerBtn.classList.add('active');
    registerBtn.setAttribute('aria-selected', 'true');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

// Authentication
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.success) {
      currentToken = data.token;
      currentUser = data.user;
      localStorage.setItem('token', currentToken);
      localStorage.setItem('user', JSON.stringify(currentUser));
      closeAuthModal();
      updateAuthUI();
      showToast(`Welcome back, ${currentUser.name}! (${currentUser.role})`, 'success');
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Login request failed', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value;
  const role = document.getElementById('regRole').value;

  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, role }),
    });

    const data = await res.json();
    if (data.success) {
      currentToken = data.token;
      currentUser = data.user;
      localStorage.setItem('token', currentToken);
      localStorage.setItem('user', JSON.stringify(currentUser));
      closeAuthModal();
      updateAuthUI();
      showToast(`Account registered successfully as ${currentUser.role}!`, 'success');
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Registration request failed', 'error');
  }
}

function logout() {
  currentToken = '';
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateAuthUI();
  showToast('Signed out successfully');
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (currentUser) {
    btn.innerHTML = `👤 ${currentUser.name.split(' ')[0]} (${currentUser.role})`;
  } else {
    btn.innerHTML = `🔑 Admin / Login`;
  }
}

// Bed Availability Modal for Admins
function openBedModal(id, name, beds, icu, oxy, amb, isAcc) {
  if (!currentToken) {
    showToast('Please log in with Admin or Hospital credentials to update capacity.', 'error');
    openAuthModal();
    return;
  }

  document.getElementById('bedHospitalId').value = id;
  document.getElementById('bedModalHospitalName').textContent = `Editing live emergency capacity for ${name}`;
  document.getElementById('bedAvailable').value = beds;
  document.getElementById('bedIcuAvailable').value = icu;
  document.getElementById('bedOxygenAvailable').value = oxy;
  document.getElementById('bedAmbulanceCount').value = amb;
  document.getElementById('bedEmergencyAccepting').checked = isAcc;

  document.getElementById('bedUpdateModal').classList.add('open');
}

function closeBedModal() {
  document.getElementById('bedUpdateModal').classList.remove('open');
}

async function handleBedUpdate(e) {
  e.preventDefault();
  const id = document.getElementById('bedHospitalId').value;
  const availableBeds = parseInt(document.getElementById('bedAvailable').value, 10);
  const availableIcuBeds = parseInt(document.getElementById('bedIcuAvailable').value, 10);
  const availableOxygenBeds = parseInt(document.getElementById('bedOxygenAvailable').value, 10);
  const ambulanceCount = parseInt(document.getElementById('bedAmbulanceCount').value, 10);
  const isEmergencyAccepting = document.getElementById('bedEmergencyAccepting').checked;

  try {
    const res = await fetch(`/api/v1/hospitals/${id}/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        availableBeds,
        availableIcuBeds,
        availableOxygenBeds,
        ambulanceCount,
        isEmergencyAccepting,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Real-time emergency bed capacity updated!', 'success');
      closeBedModal();
      fetchHospitals();
      fetchInitialData();
    } else {
      showToast(data.message || 'Update failed', 'error');
    }
  } catch (err) {
    showToast('Failed to update bed capacity', 'error');
  }
}
