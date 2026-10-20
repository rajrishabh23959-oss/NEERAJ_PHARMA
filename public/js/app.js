// Neeraj Pharma Healthcare & Emergency Hospital Locator - Frontend Engine
const app = {
  // Application State
  state: {
    userLat: 28.6139,
    userLng: 77.2090,
    radiusKm: 25,
    searchQuery: '',
    selectedFacility: 'all',
    selectedSpecialty: 'all',
    open24x7Only: false,
    emergencyOnly: false,
    icuOnly: false,
    sortBy: 'distance',
    hospitals: [],
    selectedHospitalId: null,
    currentUser: null,
    token: null,
    map: null,
    markers: [],
    userMarker: null
  },

  // City preset coordinates
  cityCoordinates: {
    delhi: { lat: 28.6139, lng: 77.2090, name: 'Delhi NCR (Central)' },
    south_delhi: { lat: 28.5355, lng: 77.2100, name: 'South Delhi' },
    gurugram: { lat: 28.4595, lng: 77.0266, name: 'Gurugram' },
    noida: { lat: 28.5708, lng: 77.3271, name: 'Noida' },
    mumbai: { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
    chennai: { lat: 13.0827, lng: 80.2707, name: 'Chennai' }
  },

  init() {
    this.restoreSession();
    this.initMap();
    this.loadLocationsDirectory();
    this.fetchHospitals();
    this.updateCoordsDisplay();
  },

  async loadLocationsDirectory() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        this.state.locations = data.data;
      }
    } catch (_) {}
  },

  // ==========================================
  // Authentication & Session
  // ==========================================
  restoreSession() {
    const token = localStorage.getItem('np_token');
    const userJson = localStorage.getItem('np_user');
    if (token && userJson) {
      try {
        this.state.token = token;
        this.state.currentUser = JSON.parse(userJson);
        this.updateAuthUI();
      } catch (_) {
        this.logout();
      }
    }
  },

  updateAuthUI() {
    const unauth = document.getElementById('unauthControls');
    const auth = document.getElementById('authControls');
    const navAdmin = document.getElementById('navAdminLink');
    const nameLabel = document.getElementById('userNameLabel');
    const roleBadge = document.getElementById('userRoleBadge');

    if (this.state.currentUser) {
      unauth.style.display = 'none';
      auth.style.display = 'flex';
      nameLabel.textContent = this.state.currentUser.name;
      roleBadge.textContent = this.state.currentUser.role;
      roleBadge.style.background = this.state.currentUser.role === 'admin' ? '#d97706' : '#0284c7';
      if (this.state.currentUser.role === 'admin') {
        navAdmin.style.display = 'inline-block';
      } else {
        navAdmin.style.display = 'none';
      }
    } else {
      unauth.style.display = 'flex';
      auth.style.display = 'none';
      navAdmin.style.display = 'none';
    }
  },

  openAuthModal(tab = 'login') {
    this.switchAuthTab(tab);
    document.getElementById('authModal').style.display = 'flex';
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabReg = document.getElementById('tabRegisterBtn');

    if (tab === 'login') {
      loginForm.style.display = 'block';
      regForm.style.display = 'none';
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
    } else {
      loginForm.style.display = 'none';
      regForm.style.display = 'block';
      tabLogin.classList.remove('active');
      tabReg.classList.add('active');
    }
  },

  fillDemoLogin(type) {
    if (type === 'admin') {
      document.getElementById('loginEmail').value = 'admin@neerajpharma.com';
      document.getElementById('loginPassword').value = 'Admin@12345';
    } else {
      document.getElementById('loginEmail').value = 'patient@neerajpharma.com';
      document.getElementById('loginPassword').value = 'User@12345';
    }
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errBox = document.getElementById('loginError');
    errBox.style.display = 'none';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      this.state.token = data.data.token;
      this.state.currentUser = data.data.user;
      localStorage.setItem('np_token', data.data.token);
      localStorage.setItem('np_user', JSON.stringify(data.data.user));

      this.updateAuthUI();
      this.closeModal('authModal');
      this.fetchHospitals(); // Refresh with role context
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  },

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const errBox = document.getElementById('registerError');
    errBox.style.display = 'none';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phoneNumber: phone })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Registration failed'));
      }

      this.state.token = data.data.token;
      this.state.currentUser = data.data.user;
      localStorage.setItem('np_token', data.data.token);
      localStorage.setItem('np_user', JSON.stringify(data.data.user));

      this.updateAuthUI();
      this.closeModal('authModal');
      this.fetchHospitals();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  },

  logout() {
    this.state.token = null;
    this.state.currentUser = null;
    localStorage.removeItem('np_token');
    localStorage.removeItem('np_user');
    this.updateAuthUI();
    this.fetchHospitals();
  },

  // ==========================================
  // Geospatial Map Initialization & Updates
  // ==========================================
  initMap() {
    try {
      if (typeof L === 'undefined') {
        console.warn('Leaflet not loaded, rendering fallback visual map.');
        return;
      }
      this.state.map = L.map('hospitalMap').setView([this.state.userLat, this.state.userLng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors | Neeraj Pharma Locator'
      }).addTo(this.state.map);

      this.updateUserMapMarker();
    } catch (err) {
      console.warn('Map initialization note:', err.message);
    }
  },

  updateUserMapMarker() {
    if (!this.state.map) return;
    if (this.state.userMarker) {
      this.state.map.removeLayer(this.state.userMarker);
    }

    const userIcon = L.divIcon({
      className: 'user-pin-div',
      html: `<div style="background:#16a34a; width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    this.state.userMarker = L.marker([this.state.userLat, this.state.userLng], { icon: userIcon })
      .addTo(this.state.map)
      .bindPopup('<strong>📍 Your Search Location</strong>');

    this.state.map.setView([this.state.userLat, this.state.userLng], 12);
  },

  updateHospitalMarkers() {
    if (!this.state.map) return;

    // Clear existing markers
    this.state.markers.forEach(m => this.state.map.removeLayer(m));
    this.state.markers = [];

    this.state.hospitals.forEach(h => {
      const isVerified = h.verified;
      const isEmergency = h.hasEmergency;

      let color = isEmergency ? '#dc2626' : (isVerified ? '#0284c7' : '#d97706');
      let iconHtml = `
        <div style="background:${color}; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          +
        </div>
      `;

      const hospIcon = L.divIcon({
        className: 'hosp-pin-div',
        html: iconHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([h.latitude, h.longitude], { icon: hospIcon })
        .addTo(this.state.map)
        .bindPopup(`
          <div style="font-family:inherit; min-width:180px;">
            <strong style="color:#0f172a; font-size:13px;">${h.name}</strong><br/>
            <span style="font-size:11px; color:#64748b;">${h.facilityType} &bull; ${h.distanceKm !== null ? h.distanceKm + ' km away' : ''}</span><br/>
            <div style="margin-top:6px; font-size:11px;">
              <strong>Beds Available:</strong> ${h.availableBeds || 0} (ICU: ${h.icuBedsAvailable || 0})
            </div>
            <button onclick="app.openHospitalDetails('${h.id}')" style="margin-top:8px; background:#0284c7; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; width:100%;">View Hospital Details</button>
          </div>
        `);

      this.state.markers.push(marker);
    });
  },

  // ==========================================
  // Location Handlers
  // ==========================================
  handleCitySelect(cityKey) {
    if (cityKey === 'current') {
      this.detectUserLocation();
      return;
    }
    const city = this.cityCoordinates[cityKey];
    if (city) {
      this.state.userLat = city.lat;
      this.state.userLng = city.lng;
      this.updateCoordsDisplay();
      this.updateUserMapMarker();
      this.fetchHospitals();
    }
  },

  detectUserLocation() {
    const btn = document.getElementById('btnDetectGPS');
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Using Central Hub location.');
      return;
    }

    btn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.state.userLat = pos.coords.latitude;
        this.state.userLng = pos.coords.longitude;
        this.updateCoordsDisplay();
        this.updateUserMapMarker();
        this.fetchHospitals();
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> GPS Active`;
      },
      (err) => {
        console.warn('GPS detection failed, fallback to Delhi central:', err.message);
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Use My GPS`;
        alert('Could not retrieve GPS coordinates. Setting location to central healthcare hub.');
      },
      { timeout: 8000 }
    );
  },

  updateCoordsDisplay() {
    const label = document.getElementById('locationReferenceLabel');
    const dispLabel = document.getElementById('dispCoordsLabel');
    if (label) {
      label.textContent = `Coordinates: ${this.state.userLat.toFixed(4)}° N, ${this.state.userLng.toFixed(4)}° E`;
    }
    if (dispLabel) {
      dispLabel.textContent = `${this.state.userLat.toFixed(4)}, ${this.state.userLng.toFixed(4)}`;
    }
  },

  handleSearchInput() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.state.searchQuery = document.getElementById('searchInput').value;
      this.fetchHospitals();
    }, 300);
  },

  handleRadiusChange(val) {
    this.state.radiusKm = parseFloat(val);
    document.getElementById('radiusValue').textContent = `${val} km`;
    this.fetchHospitals();
  },

  handleSortChange(val) {
    this.state.sortBy = val;
    this.fetchHospitals();
  },

  applyFilters() {
    this.state.selectedFacility = document.getElementById('facilitySelect').value;
    this.state.selectedSpecialty = document.getElementById('specialtySelect').value;
    const chkOpenNow = document.getElementById('chkOpenNow');
    this.state.openNowOnly = chkOpenNow ? chkOpenNow.checked : false;
    this.state.open24x7Only = document.getElementById('chk247').checked;
    this.state.emergencyOnly = document.getElementById('chkEmergency').checked;
    this.state.icuOnly = document.getElementById('chkICU').checked;
    this.fetchHospitals();
  },

  // ==========================================
  // Fetch & Render Hospitals
  // ==========================================
  async fetchHospitals() {
    const listContainer = document.getElementById('hospitalsList');
    const countLabel = document.getElementById('resultsCount');

    let query = `/api/hospitals?lat=${this.state.userLat}&lng=${this.state.userLng}&radius=${this.state.radiusKm}`;

    if (this.state.searchQuery) query += `&search=${encodeURIComponent(this.state.searchQuery)}`;
    if (this.state.selectedFacility !== 'all') query += `&facility=${encodeURIComponent(this.state.selectedFacility)}`;
    if (this.state.selectedSpecialty !== 'all') query += `&specialty=${encodeURIComponent(this.state.selectedSpecialty)}`;
    if (this.state.openNowOnly) query += `&openNow=true`;
    if (this.state.open24x7Only) query += `&open24x7=true`;
    if (this.state.emergencyOnly) query += `&hasEmergency=true`;
    if (this.state.icuOnly) query += `&minBeds=1`;
    if (this.state.sortBy) query += `&sortBy=${this.state.sortBy}`;

    // Include auth token if available (to view unverified if admin)
    const headers = {};
    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    }

    try {
      const res = await fetch(query, { headers });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch hospitals');
      }

      this.state.hospitals = result.data || [];
      countLabel.textContent = `Found ${this.state.hospitals.length} nearby healthcare facilities within ${this.state.radiusKm} km`;

      this.renderHospitalCards(this.state.hospitals);
      this.updateHospitalMarkers();
    } catch (err) {
      listContainer.innerHTML = `
        <div class="alert alert-danger">
          Error loading hospitals: ${err.message}
        </div>
      `;
    }
  },

  renderHospitalCards(hospitals) {
    const container = document.getElementById('hospitalsList');
    if (!hospitals || hospitals.length === 0) {
      container.innerHTML = `
        <div style="background:#fff; padding:32px; border-radius:12px; text-align:center; border:1px solid #e2e8f0;">
          <h3>No hospitals found in this radius</h3>
          <p style="color:#64748b; margin-top:6px;">Try expanding your distance slider or resetting filters.</p>
          <button class="btn btn-outline" style="margin-top:14px;" onclick="app.resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = hospitals.map(h => {
      const distStr = h.distanceKm !== null ? `${h.distanceKm} km` : 'N/A';
      const etaDrive = h.eta ? `${h.eta.estimatedDrivingMinutes}m drive` : '';
      const etaAmb = h.eta ? `⚡ ${h.eta.estimatedAmbulanceMinutes}m ambulance ETA` : '';

      return `
        <article class="hospital-card" onclick="app.focusHospitalOnMap('${h.id}', ${h.latitude}, ${h.longitude})">
          <div class="card-top">
            <div>
              <h4 class="hospital-title">${h.name}</h4>
              <p class="card-address">📍 ${h.address}, ${h.city}</p>
            </div>
            <div class="distance-badge">
              ${distStr}
            </div>
          </div>

          <div class="card-badges">
            ${h.verified ? `<span class="badge badge-verified">✓ Verified Partner</span>` : `<span class="badge" style="background:#fef3c7; color:#92400e;">Pending Verification</span>`}
            ${h.hasEmergency ? `<span class="badge badge-emergency">🚨 24x7 Emergency Ready</span>` : ``}
            ${h.realTimeAvailability ? `<span class="badge ${h.realTimeAvailability.isOpenNow ? 'badge-verified' : 'badge-emergency'}">🕒 ${h.realTimeAvailability.statusLabel}</span>` : ''}
            ${h.open24x7 ? `<span class="badge badge-247">24 Hours Open</span>` : `<span class="badge badge-facility">${h.operatingHours}</span>`}
            <span class="badge badge-facility">${h.facilityType}</span>
            <span class="badge" style="background:#f1f5f9; color:#0f172a;">★ ${h.rating} / 5.0</span>
          </div>

          <div class="card-metrics">
            <div class="metric-item">
              <span class="metric-val" style="color:#16a34a;">${h.availableBeds || 0}</span>
              <span class="metric-label">Total Beds Free</span>
            </div>
            <div class="metric-item">
              <span class="metric-val" style="color:#dc2626;">${h.icuBedsAvailable || 0}</span>
              <span class="metric-label">ICU Beds Free</span>
            </div>
            <div class="metric-item">
              <span class="metric-val" style="color:#0284c7;">${h.ventilatorBedsAvailable || 0}</span>
              <span class="metric-label">Ventilators Free</span>
            </div>
          </div>

          <div class="card-actions" onclick="event.stopPropagation()">
            <a href="tel:${h.emergencyHotline || h.phone}" class="btn btn-danger btn-sm">
              🚨 Call Emergency (${h.emergencyHotline || h.phone})
            </a>
            <button class="btn btn-outline btn-sm" onclick="app.openHospitalDetails('${h.id}')">
              Doctors & Services
            </button>
            <button class="btn btn-outline btn-sm" onclick="app.openDirections(${h.latitude}, ${h.longitude})">
              Directions (${etaDrive})
            </button>
          </div>
        </article>
      `;
    }).join('');
  },

  focusHospitalOnMap(id, lat, lng) {
    if (!this.state.map) return;
    this.state.map.setView([lat, lng], 15, { animate: true });
    const targetMarker = this.state.markers.find(m => {
      const p = m.getLatLng();
      return Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001;
    });
    if (targetMarker) {
      targetMarker.openPopup();
    }
  },

  openDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${this.state.userLat},${this.state.userLng}&destination=${lat},${lng}`;
    window.open(url, '_blank');
  },

  resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('facilitySelect').value = 'all';
    document.getElementById('specialtySelect').value = 'all';
    document.getElementById('chk247').checked = false;
    document.getElementById('chkEmergency').checked = false;
    document.getElementById('chkICU').checked = false;
    document.getElementById('radiusRange').value = 25;
    document.getElementById('radiusValue').textContent = '25 km';
    this.state.searchQuery = '';
    this.state.selectedFacility = 'all';
    this.state.selectedSpecialty = 'all';
    this.state.open24x7Only = false;
    this.state.emergencyOnly = false;
    this.state.icuOnly = false;
    this.state.radiusKm = 25;
    this.fetchHospitals();
  },

  resetView() {
    this.state.userLat = 28.6139;
    this.state.userLng = 77.2090;
    document.getElementById('citySelect').value = 'delhi';
    this.resetFilters();
    this.updateCoordsDisplay();
    this.updateUserMapMarker();
  },

  // ==========================================
  // Hospital Details Modal
  // ==========================================
  async openHospitalDetails(hospitalId) {
    const modal = document.getElementById('hospitalModal');
    const body = document.getElementById('modalHospitalBody');
    body.innerHTML = '<p>Loading hospital and affiliated doctors...</p>';
    modal.style.display = 'flex';

    try {
      const res = await fetch(`/api/hospitals/${hospitalId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const h = data.data;
      document.getElementById('modalHospitalName').textContent = h.name;
      document.getElementById('modalHospitalAddress').textContent = `📍 ${h.address}, ${h.city}, ${h.state} - ${h.postalCode}`;
      document.getElementById('modalVerifiedBadge').textContent = h.verified ? '✓ Verified Healthcare Partner' : 'Pending Verification';

      document.getElementById('modalCallDirect').href = `tel:${h.phone}`;
      document.getElementById('modalCallEmergency').href = `tel:${h.emergencyHotline || h.phone}`;

      const dispatchBtn = document.getElementById('modalDispatchAmbulance');
      dispatchBtn.onclick = () => {
        app.closeModal('hospitalModal');
        app.openDispatchModal(h.id);
      };

      const specialtiesHtml = (h.specialties || []).map(s => `<span class="badge badge-facility">${s}</span>`).join(' ');
      const servicesHtml = (h.services || []).map(s => `<span class="badge" style="background:#e0f2fe; color:#0369a1;">${s}</span>`).join(' ');

      const doctorsHtml = (h.doctors || []).length > 0 ? (h.doctors || []).map(d => `
        <div class="doctor-item">
          <div class="doctor-name">${d.name}</div>
          <div class="doctor-spec">${d.specialty} &bull; ${d.qualifications}</div>
          <div style="font-size:0.8rem; color:#475569; margin:4px 0;">${d.experienceYears} Years Experience &bull; Fee: ₹${d.consultationFee}</div>
          <div class="doctor-time">🕒 ${d.availability}</div>
          ${d.emergencyOnCall ? `<span class="badge badge-emergency" style="margin-top:6px; display:inline-block;">24/7 On-Call Emergency</span>` : ''}
        </div>
      `).join('') : '<p style="color:#64748b; font-size:0.85rem;">No affiliated doctors registered yet.</p>';

      body.innerHTML = `
        <div class="card-metrics" style="margin-bottom:20px;">
          <div class="metric-item">
            <span class="metric-val" style="color:#16a34a;">${h.availableBeds || 0} / ${h.totalBeds || 0}</span>
            <span class="metric-label">General Beds Free</span>
          </div>
          <div class="metric-item">
            <span class="metric-val" style="color:#dc2626;">${h.icuBedsAvailable || 0}</span>
            <span class="metric-label">ICU Beds Free</span>
          </div>
          <div class="metric-item">
            <span class="metric-val" style="color:#0284c7;">${h.ventilatorBedsAvailable || 0}</span>
            <span class="metric-label">Ventilators Free</span>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:6px;">Operating Hours & Emergency Status</h4>
          <p style="font-size:0.85rem; color:#475569;">🕒 <strong>Hours:</strong> ${h.operatingHours}</p>
          <p style="font-size:0.85rem; color:#475569;">🚨 <strong>Emergency Hotline:</strong> <a href="tel:${h.emergencyHotline}" style="color:#dc2626; font-weight:700;">${h.emergencyHotline}</a></p>
          <p style="font-size:0.85rem; color:#475569;">📞 <strong>General Enquiries:</strong> ${h.phone}</p>
        </div>

        <div style="margin-bottom:16px;">
          <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:6px;">Medical Specialties</h4>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">${specialtiesHtml}</div>
        </div>

        <div style="margin-bottom:20px;">
          <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:6px;">Facilities & Emergency Equipment</h4>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">${servicesHtml}</div>
        </div>

        <div>
          <h4 style="font-size:1rem; font-weight:800; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px;">
            Affiliated Doctors & On-Call Specialists (${(h.doctors || []).length})
          </h4>
          <div class="doctors-grid">${doctorsHtml}</div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  },

  // ==========================================
  // Emergency Ambulance Dispatch
  // ==========================================
  openDispatchModal(preferredHospitalId = null) {
    this._preferredHospitalId = preferredHospitalId;
    document.getElementById('dispatchForm').style.display = 'block';
    document.getElementById('dispatchSuccessBlock').style.display = 'none';
    this.updateCoordsDisplay();
    document.getElementById('dispatchModal').style.display = 'flex';
  },

  async handleDispatchSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitDispatch');
    btn.disabled = true;
    btn.textContent = 'Allocating Closest Ambulance...';

    const payload = {
      patientName: document.getElementById('dispPatientName').value,
      contactPhone: document.getElementById('dispContactPhone').value,
      emergencyType: document.getElementById('dispEmergencyType').value,
      vehicleType: document.getElementById('dispVehicleType').value,
      notes: document.getElementById('dispNotes').value,
      latitude: this.state.userLat,
      longitude: this.state.userLng,
      preferredHospitalId: this._preferredHospitalId
    };

    try {
      const res = await fetch('/api/emergency/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const d = data.data;
      const form = document.getElementById('dispatchForm');
      const successBlock = document.getElementById('dispatchSuccessBlock');

      form.style.display = 'none';
      successBlock.style.display = 'block';
      successBlock.innerHTML = `
        <div style="text-align:center; padding:16px 0;">
          <div style="width:60px; height:60px; background:#dcfce7; color:#16a34a; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:12px;">
            ✓
          </div>
          <h3 style="color:#0f172a; font-weight:800;">Emergency Unit Dispatched!</h3>
          <p style="color:#16a34a; font-weight:700; font-size:1.1rem; margin-top:4px;">
            ETA: ~${d.estimatedArrivalMinutes} Minutes
          </p>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin:16px 0; text-align:left; font-size:0.85rem;">
            <p><strong>Tracking ID:</strong> <code>${d.trackingId}</code></p>
            <p><strong>Vehicle Number:</strong> ${d.assignedAmbulance ? d.assignedAmbulance.vehicleNumber : 'Emergency Unit'}</p>
            <p><strong>Driver:</strong> ${d.assignedAmbulance ? d.assignedAmbulance.driverName : 'Primary Responder'}</p>
            <p><strong>Driver Contact:</strong> <a href="tel:${d.assignedAmbulance ? d.assignedAmbulance.contactNumber : '112'}">${d.assignedAmbulance ? d.assignedAmbulance.contactNumber : '112'}</a></p>
            <p><strong>Destination:</strong> ${d.destinationHospital ? d.destinationHospital.name : 'Nearest Trauma Facility'}</p>
          </div>
          <button class="btn btn-outline btn-block" onclick="app.closeModal('dispatchModal')">Done / Close</button>
        </div>
      `;
    } catch (err) {
      alert(`Dispatch error: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirm & Dispatch Nearest Ambulance';
    }
  },

  // ==========================================
  // Directory & Ambulances Modals
  // ==========================================
  async openEmergencyContactsModal() {
    const modal = document.getElementById('emergencyDirectoryModal');
    const body = document.getElementById('emergencyDirectoryBody');
    modal.style.display = 'flex';
    body.innerHTML = '<p>Loading emergency directory...</p>';

    try {
      const res = await fetch('/api/emergency/contacts');
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const helplines = data.data.nationalHelplines.map(h => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${h.name}</strong>
            <a href="tel:${h.phoneNumber}" class="btn btn-danger btn-sm">Dial ${h.phoneNumber}</a>
          </div>
          <p style="font-size:0.8rem; color:#64748b; margin-top:4px;">${h.serviceScope} &bull; ${h.availability}</p>
        </div>
      `).join('');

      body.innerHTML = `
        <h3 style="font-size:1.1rem; margin-bottom:12px;">Government Emergency Helplines</h3>
        <div>${helplines}</div>
      `;
    } catch (err) {
      body.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  },

  async openAmbulancesModal() {
    const modal = document.getElementById('emergencyDirectoryModal');
    const body = document.getElementById('emergencyDirectoryBody');
    modal.style.display = 'flex';
    body.innerHTML = '<p>Finding live ambulances in your network...</p>';

    try {
      const res = await fetch(`/api/emergency/ambulances?lat=${this.state.userLat}&lng=${this.state.userLng}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const list = data.data.map(a => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${a.vehicleNumber}</strong> &bull; <span style="color:#0284c7; font-weight:600;">${a.vehicleType}</span>
            <div style="font-size:0.8rem; color:#64748b;">Affiliated: ${a.hospitalAffiliation} &bull; Driver: ${a.driverName}</div>
            <div style="font-size:0.75rem; color:#16a34a; font-weight:700;">Status: ${a.status} ${a.distanceKm !== undefined ? `(~${a.distanceKm} km away)` : ''}</div>
          </div>
          <a href="tel:${a.contactNumber}" class="btn btn-danger btn-sm">Call Driver</a>
        </div>
      `).join('');

      body.innerHTML = `
        <h3 style="font-size:1.1rem; margin-bottom:12px;">Active Ambulances Ready for Dispatch</h3>
        <div>${list}</div>
      `;
    } catch (err) {
      body.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  },

  // ==========================================
  // Admin Operations Panel
  // ==========================================
  async openAdminModal() {
    if (!this.state.currentUser || this.state.currentUser.role !== 'admin') {
      alert('Administrator privileges required.');
      return;
    }
    document.getElementById('adminModal').style.display = 'flex';
    this.loadAdminStats();
    this.loadPendingHospitals();
    this.loadPendingEmergency();
    this.loadAdminUsers();
  },

  async loadPendingEmergency() {
    const wrap = document.getElementById('pendingEmergencyTableWrap');
    if (!wrap) return;
    try {
      const res = await fetch('/api/admin/emergency/pending', {
        headers: { 'Authorization': `Bearer ${this.state.token}` }
      });
      const data = await res.json();
      if (!data.success) return;
      const contacts = data.data.pendingEmergencyContacts || [];
      const ambs = data.data.pendingAmbulances || [];
      if (contacts.length === 0 && ambs.length === 0) {
        wrap.innerHTML = '<p style="color:#16a34a; font-weight:600; padding:8px 0;">✓ All emergency contacts and ambulances are verified!</p>';
        return;
      }
      wrap.innerHTML = `
        <table>
          <thead><tr><th>Type</th><th>Name / Vehicle</th><th>Contact</th><th>Action</th></tr></thead>
          <tbody>
            ${contacts.map(c => `<tr><td>Helpline</td><td><strong>${c.name}</strong></td><td>${c.phoneNumber}</td><td><button class="btn btn-primary btn-xs" onclick="app.verifyEmergencyItem('contact','${c.id}',true)">Verify</button></td></tr>`).join('')}
            ${ambs.map(a => `<tr><td>Ambulance</td><td><strong>${a.vehicleNumber}</strong> (${a.vehicleType})</td><td>${a.contactNumber}</td><td><button class="btn btn-primary btn-xs" onclick="app.verifyEmergencyItem('ambulance','${a.id}',true)">Verify</button></td></tr>`).join('')}
          </tbody>
        </table>
      `;
    } catch (_) {}
  },

  async verifyEmergencyItem(kind, id, verified) {
    const endpoint = kind === 'contact' ? `/api/admin/emergency-contacts/${id}/verify` : `/api/admin/ambulances/${id}/verify`;
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.state.token}` },
      body: JSON.stringify({ verified })
    });
    this.loadPendingEmergency();
    this.loadAdminStats();
  },

  async loadAdminUsers() {
    const wrap = document.getElementById('adminUsersTableWrap');
    if (!wrap) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${this.state.token}` }
      });
      const data = await res.json();
      if (!data.success) return;
      const users = data.data || [];
      wrap.innerHTML = `
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge badge-facility">${u.role}</span></td>
                <td><span class="badge ${u.status === 'active' ? 'badge-verified' : 'badge-emergency'}">${u.status || 'active'}</span></td>
                <td>
                  <button class="btn btn-outline btn-xs" onclick="app.toggleUserRole('${u.id}', '${u.role === 'admin' ? 'user' : 'admin'}')">Make ${u.role === 'admin' ? 'User' : 'Admin'}</button>
                  <button class="btn btn-ghost btn-xs" onclick="app.toggleUserStatus('${u.id}', '${u.status === 'active' ? 'disabled' : 'active'}')">${u.status === 'active' ? 'Disable' : 'Activate'}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (_) {}
  },

  async toggleUserRole(id, role) {
    await fetch(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.state.token}` },
      body: JSON.stringify({ role })
    });
    this.loadAdminUsers();
  },

  async toggleUserStatus(id, status) {
    await fetch(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.state.token}` },
      body: JSON.stringify({ status })
    });
    this.loadAdminUsers();
  },

  async loadAdminStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${this.state.token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const m = data.data.metrics;
      document.getElementById('kpiTotalHospitals').textContent = m.totalHospitals;
      document.getElementById('kpiVerifiedHospitals').textContent = m.verifiedHospitals;
      document.getElementById('kpiPendingHospitals').textContent = m.pendingHospitals;
      document.getElementById('kpiTotalDoctors').textContent = m.totalDoctors;
      document.getElementById('kpiAmbulances').textContent = `${m.availableAmbulances}/${m.totalAmbulances}`;
      document.getElementById('kpiUsers').textContent = m.totalUsers;
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  },

  async loadPendingHospitals() {
    const wrap = document.getElementById('pendingHospitalsTableWrap');
    wrap.innerHTML = '<p>Loading pending verification list...</p>';

    try {
      const res = await fetch('/api/admin/hospitals/pending', {
        headers: { 'Authorization': `Bearer ${this.state.token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const list = data.data || [];
      if (list.length === 0) {
        wrap.innerHTML = '<p style="color:#16a34a; font-weight:600; padding:12px 0;">✓ All hospital submissions have been reviewed and verified!</p>';
        return;
      }

      wrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Hospital Name</th>
              <th>City / Area</th>
              <th>Facility Type</th>
              <th>Phone</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(h => `
              <tr>
                <td><strong>${h.name}</strong></td>
                <td>${h.city} (${h.address})</td>
                <td>${h.facilityType}</td>
                <td>${h.phone}</td>
                <td>${new Date(h.createdAt).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-primary btn-xs" onclick="app.verifyHospital('${h.id}', true)">Verify & Publish</button>
                  <button class="btn btn-ghost btn-xs" onclick="app.verifyHospital('${h.id}', false)">Reject</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      wrap.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  },

  async verifyHospital(hospitalId, isApproved) {
    try {
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.state.token}`
        },
        body: JSON.stringify({ verified: isApproved, verificationNotes: isApproved ? 'Verified by Admin' : 'Rejected' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      alert(data.message);
      this.loadAdminStats();
      this.loadPendingHospitals();
      this.fetchHospitals();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  },

  toggleAddHospitalForm() {
    const form = document.getElementById('addHospitalForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  },

  async handleAddHospitalSubmit(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('newHospName').value,
      facilityType: document.getElementById('newHospFacility').value,
      address: document.getElementById('newHospAddress').value,
      city: document.getElementById('newHospCity').value,
      latitude: parseFloat(document.getElementById('newHospLat').value),
      longitude: parseFloat(document.getElementById('newHospLng').value),
      phone: document.getElementById('newHospPhone').value,
      emergencyHotline: document.getElementById('newHospEmergency').value,
      availableBeds: parseInt(document.getElementById('newHospBeds').value, 10),
      totalBeds: parseInt(document.getElementById('newHospBeds').value, 10) * 2,
      specialties: document.getElementById('newHospSpecialties').value.split(',').map(s => s.trim()),
      open24x7: true,
      hasEmergency: true
    };

    try {
      const res = await fetch('/api/hospitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.state.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      alert('Hospital successfully added and verified!');
      document.getElementById('addHospitalForm').reset();
      this.toggleAddHospitalForm();
      this.loadAdminStats();
      this.loadPendingHospitals();
      this.fetchHospitals();
    } catch (err) {
      alert(`Error creating hospital: ${err.message}`);
    }
  },

  // Modal helpers
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }
};

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
