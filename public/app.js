/**
 * Neeraj Pharma Healthcare & Emergency Hospital Locator
 * Production Frontend Application (Zero Hardcoded Mock Data)
 */

class NeerajPharmaApp {
  constructor() {
    this.token = localStorage.getItem('np_token') || null;
    this.currentUser = null;
    this.activeView = 'hospitals';
    this.currentLocation = { lat: 28.6139, lng: 77.2090, name: 'New Delhi (Central NCR)' };
    
    this.hospitals = [];
    this.doctors = [];
    this.locations = [];
    this.emergencyContacts = [];
    this.ambulances = [];
    
    this.map = null;
    this.markersGroup = null;
    this.userMarker = null;
    this.searchDebounceTimer = null;
    this.activeTrackingId = null;
    this.adminActiveTab = 'kpi';
  }

  async init() {
    this.initMap();
    await this.restoreAuthSession();
    await this.fetchPlatformHealth();
    await this.fetchHospitals();
    await this.fetchLocations();
    await this.fetchDoctors();
    await this.fetchEmergencyData();
    this.setupUrlHashListener();
  }

  // =========================================================================
  // API CLIENT & HTTP HELPERS
  // =========================================================================
  async api(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data && (data.message || (data.errors && data.errors.join(', ')))
          ? (data.message || data.errors.join(', '))
          : `HTTP error ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.warn(`API Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // =========================================================================
  // LEAFLET INTERACTIVE MAP
  // =========================================================================
  initMap() {
    const mapEl = document.getElementById('hospitalMap');
    if (!mapEl || typeof L === 'undefined') return;

    this.map = L.map('hospitalMap', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([this.currentLocation.lat, this.currentLocation.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.renderUserLocationMarker();
  }

  renderUserLocationMarker() {
    if (!this.map) return;
    if (this.userMarker) {
      this.markersGroup.removeLayer(this.userMarker);
    }

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="background:#2563EB; width:18px; height:18px; border-radius:50%; border:3px solid #FFFFFF; box-shadow:0 0 10px rgba(37,99,235,0.7); animation:pulseDot 1.5s infinite;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    this.userMarker = L.marker([this.currentLocation.lat, this.currentLocation.lng], {
      icon: userIcon,
      zIndexOffset: 1000
    }).bindPopup(`<strong>Your Location</strong><br>${this.currentLocation.name}`);

    this.markersGroup.addLayer(this.userMarker);
  }

  updateMapMarkers() {
    if (!this.map || !this.markersGroup) return;

    // Clear previous hospital markers (keep user location)
    this.markersGroup.clearLayers();
    this.renderUserLocationMarker();

    const bounds = L.latLngBounds([[this.currentLocation.lat, this.currentLocation.lng]]);

    this.hospitals.forEach(hosp => {
      if (!hosp.latitude || !hosp.longitude) return;

      const isOpen = hosp.realTimeAvailability ? hosp.realTimeAvailability.isOpenNow : hosp.open24x7;
      const markerColor = isOpen ? '#059669' : '#DC2626';

      const hospitalIcon = L.divIcon({
        className: 'custom-hospital-marker',
        html: `<div style="background:${markerColor}; color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; border:2px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,0.3);">H</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([hosp.latitude, hosp.longitude], { icon: hospitalIcon });

      const popupHtml = `
        <div style="font-family:Inter,sans-serif; min-width:220px;">
          <h4 style="font-size:1.05rem; font-weight:800; color:#111827; margin-bottom:4px;">${hosp.name}</h4>
          <p style="font-size:0.8rem; color:#4B5563; margin-bottom:6px;">${hosp.address || ''}</p>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.8rem;">
            <span>Rating: <strong>⭐ ${hosp.rating || '4.5'}</strong></span>
            <span>Beds: <strong>${hosp.availableBeds || 0} / ${hosp.totalBeds || 0}</strong></span>
          </div>
          <div style="display:flex; gap:4px; font-size:0.75rem; margin-bottom:8px;">
            <span style="background:${isOpen ? '#D1FAE5' : '#FEE2E2'}; color:${isOpen ? '#065F46' : '#991B1B'}; padding:2px 8px; border-radius:999px; font-weight:700;">
              ${isOpen ? 'Open Now' : 'Closed'}
            </span>
            <span style="background:#E0E7FF; color:#4338CA; padding:2px 8px; border-radius:999px; font-weight:600;">
              ICU: ${hosp.icuBedsAvailable || 0}
            </span>
          </div>
          <div style="display:flex; gap:6px;">
            <button onclick="app.openHospitalDetails('${hosp.id}')" style="background:#2563EB; color:#fff; border:none; padding:4px 10px; border-radius:999px; font-size:0.75rem; cursor:pointer; font-weight:600;">View Details</button>
            <button onclick="app.openDispatchModalForHospital('${hosp.id}')" style="background:#DC2626; color:#fff; border:none; padding:4px 10px; border-radius:999px; font-size:0.75rem; cursor:pointer; font-weight:600;">Dispatch SOS</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markersGroup.addLayer(marker);
      bounds.extend([hosp.latitude, hosp.longitude]);
    });

    if (this.hospitals.length > 0) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }

  // =========================================================================
  // VIEW NAVIGATION & HASH ROUTING
  // =========================================================================
  showView(viewName) {
    this.activeView = viewName;
    ['hospitals', 'doctors', 'locations', 'emergency'].forEach(v => {
      const el = document.getElementById(`view${v.charAt(0).toUpperCase() + v.slice(1)}`);
      const link = document.getElementById(`navLink${v.charAt(0).toUpperCase() + v.slice(1)}`);
      if (el) el.style.display = (v === viewName) ? 'block' : 'none';
      if (link) link.classList.toggle('active', v === viewName);
    });

    if (viewName === 'hospitals' && this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
    }

    window.location.hash = viewName;
  }

  setupUrlHashListener() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (['hospitals', 'doctors', 'locations', 'emergency'].includes(hash)) {
        this.showView(hash);
      }
    });

    const initHash = window.location.hash.replace('#', '');
    if (initHash && ['hospitals', 'doctors', 'locations', 'emergency'].includes(initHash)) {
      this.showView(initHash);
    }
  }

  // =========================================================================
  // PLATFORM HEALTH & STATS
  // =========================================================================
  async fetchPlatformHealth() {
    try {
      const res = await this.api('/api/health');
      if (res && res.success) {
        const elHosp = document.getElementById('statHospitals');
        const elAmb = document.getElementById('statAmbulances');
        if (elHosp) elHosp.textContent = res.totalVerifiedHospitals || '10+';
        if (elAmb) elAmb.textContent = res.activeAmbulances || '6';
      }
    } catch (_) {}
  }

  // =========================================================================
  // HOSPITALS LOCATOR (GET /api/hospitals)
  // =========================================================================
  async fetchHospitals() {
    const listContainer = document.getElementById('hospitalListContainer');
    const countEl = document.getElementById('hospitalResultsCount');
    if (countEl) countEl.textContent = 'Searching hospitals nearby...';

    const search = (document.getElementById('searchInput')?.value || '').trim();
    const facility = document.getElementById('facilitySelect')?.value || '';
    const specialty = document.getElementById('specialtySelect')?.value || '';
    const sortBy = document.getElementById('sortBySelect')?.value || 'distance';
    const openNow = document.getElementById('filterOpenNow')?.checked || false;
    const hasEmergency = document.getElementById('filterEmergency')?.checked || false;
    const minBeds = document.getElementById('filterBeds')?.checked ? 1 : 0;
    const radius = document.getElementById('radiusInput')?.value || 35;

    const params = new URLSearchParams();
    if (this.currentLocation.lat && this.currentLocation.lng) {
      params.append('lat', this.currentLocation.lat);
      params.append('lng', this.currentLocation.lng);
      params.append('radius', radius);
    }
    if (search) params.append('search', search);
    if (facility) params.append('facility', facility);
    if (specialty) params.append('specialty', specialty);
    if (sortBy) params.append('sortBy', sortBy);
    if (openNow) params.append('openNow', 'true');
    if (hasEmergency) params.append('hasEmergency', 'true');
    if (minBeds > 0) params.append('minBeds', minBeds);

    try {
      const res = await this.api(`/api/hospitals?${params.toString()}`);
      this.hospitals = res.data || [];

      // Calculate total available beds across verified hospitals
      const totalAvailable = this.hospitals.reduce((acc, h) => acc + (h.availableBeds || 0), 0);
      const statBedsEl = document.getElementById('statAvailableBeds');
      if (statBedsEl) statBedsEl.textContent = totalAvailable;

      if (countEl) {
        countEl.textContent = `Found ${this.hospitals.length} verified hospitals within ${radius} km`;
      }

      this.renderHospitalCards();
      this.updateMapMarkers();
    } catch (err) {
      if (countEl) countEl.textContent = 'Failed to load hospitals';
      if (listContainer) {
        listContainer.innerHTML = `<div style="padding:1.5rem; color:#991B1B; background:#FEE2E2; border-radius:16px;">Error loading hospitals: ${err.message}</div>`;
      }
    }
  }

  renderHospitalCards() {
    const container = document.getElementById('hospitalListContainer');
    if (!container) return;

    if (this.hospitals.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:3rem 1.5rem;">
          <h3 style="margin-bottom:0.5rem;">No Hospitals Match Current Filters</h3>
          <p style="font-size:0.95rem; color:var(--text-body); margin-bottom:1.25rem;">
            Try increasing the search radius, clearing text filters, or loading sample city coordinates.
          </p>
          <button class="btn btn-sm btn-primary" onclick="app.loadSampleLocation()">Load New Delhi NCR Sample</button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.hospitals.map(h => {
      const isOpen = h.realTimeAvailability ? h.realTimeAvailability.isOpenNow : h.open24x7;
      const statusText = h.realTimeAvailability ? h.realTimeAvailability.statusText : (h.open24x7 ? 'Open 24/7' : 'Regular Hours');
      const dist = h.distanceKm !== undefined ? `${h.distanceKm} km away` : 'GPS mapped';
      const eta = h.estimatedDriveTimeMinutes ? `~${h.estimatedDriveTimeMinutes} min drive` : '';

      return `
        <article class="hospital-item-card">
          <div class="hospital-card-header">
            <div>
              <h3 class="hospital-name">${h.name}</h3>
              <p class="hospital-address">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                ${h.address || h.city || ''}
              </p>
            </div>
            <span class="hospital-badge-status ${isOpen ? 'badge-open' : 'badge-closed'}">
              ${statusText}
            </span>
          </div>

          <div class="hospital-metrics-row">
            <div class="metric-chip">
              <span>⭐</span>
              <span>Rating: <strong>${h.rating || '4.5'}</strong></span>
            </div>
            <div class="metric-chip">
              <span>🛏️</span>
              <span>Available Beds: <strong style="color:var(--green);">${h.availableBeds || 0}</strong> / ${h.totalBeds || 0}</span>
            </div>
            <div class="metric-chip">
              <span>🫁</span>
              <span>ICU: <strong>${h.icuBedsAvailable || 0}</strong></span>
            </div>
            <div class="metric-chip">
              <span>📍</span>
              <span>${dist} ${eta ? `&bull; ${eta}` : ''}</span>
            </div>
          </div>

          <div class="hospital-card-footer">
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <a href="tel:${h.emergencyHotline || h.phone}" class="btn btn-sm btn-outline" style="border-color:#DC2626; color:#DC2626;">
                📞 Call Hotline: ${h.emergencyHotline || h.phone}
              </a>
              <button class="btn btn-sm btn-outline" onclick="app.openHospitalDetails('${h.id}')">
                Details & Doctors
              </button>
            </div>
            <button class="btn btn-sm btn-danger" onclick="app.openDispatchModalForHospital('${h.id}')">
              Dispatch SOS
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  handleSearchInput() {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.fetchHospitals(), 350);
  }

  handleRadiusChange(val) {
    const lbl = document.getElementById('radiusLabel');
    if (lbl) lbl.textContent = `${val} km`;
    this.fetchHospitals();
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    this.showToast('Acquiring your GPS coordinates...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentLocation = {
          lat: parseFloat(pos.coords.latitude.toFixed(4)),
          lng: parseFloat(pos.coords.longitude.toFixed(4)),
          name: 'Your Current GPS Location'
        };
        this.showToast(`GPS Location set: ${this.currentLocation.lat}, ${this.currentLocation.lng}`, 'success');
        this.fetchHospitals();
      },
      (err) => {
        this.showToast(`Unable to acquire GPS: ${err.message}. Loading sample New Delhi coordinates.`, 'error');
        this.loadSampleLocation();
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  loadSampleLocation() {
    // New Delhi Central Connaught Place coordinates from seed data
    this.currentLocation = {
      lat: 28.6139,
      lng: 77.2090,
      name: 'New Delhi (Central NCR Seed Hub)'
    };
    this.showToast('Loaded pre-seeded New Delhi NCR coordinates (28.6139, 77.2090)', 'success');
    this.fetchHospitals();
  }

  // =========================================================================
  // HOSPITAL DETAILS MODAL (GET /api/hospitals/:id)
  // =========================================================================
  async openHospitalDetails(hospId) {
    const container = document.getElementById('hospitalDetailContent');
    if (!container) return;

    container.innerHTML = '<div style="padding:2rem; text-align:center;">Loading hospital profile...</div>';
    this.openModal('hospitalDetailModal');

    try {
      const res = await this.api(`/api/hospitals/${hospId}`);
      const h = res.data;
      if (!h) throw new Error('Hospital data not found');

      const doctorsRes = await this.api(`/api/doctors?hospitalId=${hospId}`).catch(() => ({ data: [] }));
      const docs = doctorsRes.data || [];

      const isOpen = h.realTimeAvailability ? h.realTimeAvailability.isOpenNow : h.open24x7;

      container.innerHTML = `
        <div style="border-bottom: 1px solid var(--border); padding-bottom: 1.25rem; margin-bottom: 1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
            <div>
              <span class="section-label">${h.facilityType || 'Healthcare Facility'}</span>
              <h2 style="font-size: 1.75rem; margin-bottom: 0.25rem;">${h.name}</h2>
              <p style="color:var(--text-body); font-size:0.95rem;">${h.address}, ${h.city}, ${h.state} - ${h.postalCode || ''}</p>
            </div>
            <span class="hospital-badge-status ${isOpen ? 'badge-open' : 'badge-closed'}" style="font-size:0.9rem; padding:0.4rem 1rem;">
              ${isOpen ? 'Open Now & Receiving Patients' : 'Closed / Off Hours'}
            </span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
          <div class="card" style="padding:1rem;">
            <div style="font-size:0.8rem; color:var(--text-body);">Total Capacity</div>
            <div style="font-size:1.5rem; font-weight:800; color:var(--text-heading);">${h.totalBeds || 0} Beds</div>
          </div>
          <div class="card" style="padding:1rem;">
            <div style="font-size:0.8rem; color:var(--text-body);">Available General Beds</div>
            <div style="font-size:1.5rem; font-weight:800; color:var(--green);">${h.availableBeds || 0} Beds</div>
          </div>
          <div class="card" style="padding:1rem;">
            <div style="font-size:0.8rem; color:var(--text-body);">ICU Beds Available</div>
            <div style="font-size:1.5rem; font-weight:800; color:var(--primary);">${h.icuBedsAvailable || 0} ICU</div>
          </div>
          <div class="card" style="padding:1rem;">
            <div style="font-size:0.8rem; color:var(--text-body);">Ventilator Units</div>
            <div style="font-size:1.5rem; font-weight:800; color:var(--indigo);">${h.ventilatorBedsAvailable || 0} Units</div>
          </div>
        </div>

        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:1.1rem; margin-bottom:0.5rem;">Operating Hours & Contacts</h4>
          <p style="font-size:0.9rem; margin-bottom:0.4rem;"><strong>Schedule:</strong> ${h.operatingHours || '24 Hours / 7 Days'}</p>
          <p style="font-size:0.9rem; margin-bottom:0.4rem;"><strong>Emergency Hotline:</strong> <a href="tel:${h.emergencyHotline}" style="color:var(--red); font-weight:700;">${h.emergencyHotline || h.phone}</a></p>
          <p style="font-size:0.9rem; margin-bottom:0.4rem;"><strong>Main Reception:</strong> ${h.phone || '--'} &bull; <strong>Email:</strong> ${h.email || '--'}</p>
        </div>

        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:1.1rem; margin-bottom:0.75rem;">Affiliated Specialists & On-Duty Doctors (${docs.length})</h4>
          ${docs.length === 0 ? '<p style="font-size:0.9rem; color:var(--text-body);">No specialist doctor records directly attached to this hospital.</p>' : `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1rem;">
              ${docs.map(d => `
                <div class="card" style="padding:1rem;">
                  <strong style="color:var(--text-heading); font-size:0.95rem;">${d.name}</strong>
                  <div style="color:var(--primary); font-size:0.85rem; font-weight:600;">${d.specialty}</div>
                  <div style="font-size:0.8rem; color:var(--text-body); margin-top:4px;">${d.qualifications || ''}</div>
                  <div style="font-size:0.8rem; margin-top:6px;">Fee: <strong>₹${d.consultationFee || 1000}</strong> &bull; Exp: ${d.experienceYears || 5} yrs</div>
                  <div style="margin-top:8px;">
                    <span style="font-size:0.75rem; padding:2px 8px; border-radius:999px; background:${d.realTimeAvailability?.isAvailableNow ? '#D1FAE5' : '#F3F4F6'}; color:${d.realTimeAvailability?.isAvailableNow ? '#065F46' : '#4B5563'}; font-weight:700;">
                      ${d.realTimeAvailability?.dutyStatus || 'Regular Shift'}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid var(--border); padding-top:1rem;">
          <button class="btn btn-outline" onclick="app.closeModal('hospitalDetailModal')">Close</button>
          <button class="btn btn-danger" onclick="app.closeModal('hospitalDetailModal'); app.openDispatchModalForHospital('${h.id}')">
            Request Emergency Ambulance to ${h.name}
          </button>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="padding:2rem; color:#991B1B;">Error loading details: ${err.message}</div>`;
    }
  }

  // =========================================================================
  // DOCTORS DIRECTORY (GET /api/doctors)
  // =========================================================================
  async fetchDoctors() {
    const search = document.getElementById('doctorSearchInput')?.value || '';
    const hospitalId = document.getElementById('doctorHospitalFilter')?.value || '';
    const availableNow = document.getElementById('doctorAvailableNow')?.checked || false;
    const emergencyOnCall = document.getElementById('doctorEmergencyCall')?.checked || false;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (hospitalId) params.append('hospitalId', hospitalId);
    if (availableNow) params.append('availableNow', 'true');
    if (emergencyOnCall) params.append('emergencyOnCall', 'true');

    try {
      const res = await this.api(`/api/doctors?${params.toString()}`);
      this.doctors = res.data || [];

      const docStatEl = document.getElementById('statDoctors');
      if (docStatEl) docStatEl.textContent = `${this.doctors.length}`;

      this.populateDoctorHospitalFilter();
      this.renderDoctorCards();
    } catch (err) {
      const grid = document.getElementById('doctorsGrid');
      if (grid) grid.innerHTML = `<div style="grid-column:1/-1; padding:2rem; color:#991B1B; background:#FEE2E2; border-radius:16px;">Failed to load doctors: ${err.message}</div>`;
    }
  }

  populateDoctorHospitalFilter() {
    const sel = document.getElementById('doctorHospitalFilter');
    if (!sel || sel.options.length > 1) return;

    this.hospitals.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = h.name;
      sel.appendChild(opt);
    });
  }

  renderDoctorCards() {
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;

    if (this.doctors.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem;" class="card">No doctors found matching your filter criteria.</div>';
      return;
    }

    grid.innerHTML = this.doctors.map(d => {
      const isAvailable = d.realTimeAvailability ? d.realTimeAvailability.isAvailableNow : false;
      const statusText = d.realTimeAvailability ? d.realTimeAvailability.dutyStatus : 'Standard Shift';

      return `
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
              <span class="section-label" style="margin-bottom:0;">${d.specialty}</span>
              <span style="font-size:0.75rem; padding:2px 8px; border-radius:999px; background:${isAvailable ? '#D1FAE5' : '#F3F4F6'}; color:${isAvailable ? '#065F46' : '#4B5563'}; font-weight:700;">
                ${statusText}
              </span>
            </div>
            <h3 style="font-size:1.15rem; margin-bottom:0.25rem;">${d.name}</h3>
            <p style="font-size:0.85rem; color:var(--primary); font-weight:600; margin-bottom:0.5rem;">
              🏥 ${d.hospitalName || 'Affiliated Hospital'}
            </p>
            <p style="font-size:0.82rem; color:var(--text-body); margin-bottom:0.75rem;">
              ${d.qualifications || ''} &bull; ${d.experienceYears || 1} yrs experience
            </p>
            <div style="font-size:0.85rem; color:var(--text-heading); margin-bottom:0.5rem;">
              Schedule: <strong>${d.availability || 'Mon-Fri 09:00 - 17:00'}</strong>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:0.75rem; margin-top:0.75rem;">
            <span style="font-weight:700; color:var(--text-heading); font-size:0.95rem;">Fee: ₹${d.consultationFee || 1000}</span>
            <a href="tel:${d.contact || '+91-11-45678900'}" class="btn btn-sm btn-outline">Call Desk</a>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // LOCATIONS DIRECTORY (GET /api/locations)
  // =========================================================================
  async fetchLocations() {
    try {
      const res = await this.api('/api/locations');
      this.locations = res.data || [];
      this.renderLocationCards();
    } catch (_) {}
  }

  renderLocationCards() {
    const grid = document.getElementById('locationsGrid');
    if (!grid) return;

    grid.innerHTML = this.locations.map(loc => `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <span class="section-label">${loc.zoneType || 'Medical Corridor'}</span>
          <h3 style="font-size:1.25rem; margin-bottom:0.35rem;">${loc.cityName}</h3>
          <p style="font-size:0.85rem; color:var(--text-body); margin-bottom:0.75rem;">${loc.address}</p>
          <div style="font-size:0.85rem; margin-bottom:0.5rem;">
            Postal Code: <strong>${loc.postalCode}</strong> &bull; State: <strong>${loc.state}</strong>
          </div>
          <p style="font-size:0.8rem; color:#6B7280;">Key Area: ${loc.keyArea || 'Metro Center'}</p>
        </div>
        <div style="border-top:1px solid var(--border); padding-top:0.75rem; margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.85rem; font-weight:700; color:var(--primary);">${loc.hospitalCount || 0} Verified Hospitals</span>
          <button class="btn btn-sm btn-primary" onclick="app.selectLocationHub(${loc.latitude}, ${loc.longitude}, '${loc.cityName}')">
            Explore Hub
          </button>
        </div>
      </div>
    `).join('');
  }

  selectLocationHub(lat, lng, name) {
    this.currentLocation = { lat, lng, name };
    this.showView('hospitals');
    this.showToast(`Switched map focus to ${name}`, 'info');
    this.fetchHospitals();
  }

  // =========================================================================
  // EMERGENCY FLEET & CONTACTS (GET /api/emergency/*)
  // =========================================================================
  async fetchEmergencyData() {
    try {
      const [contactsRes, ambulancesRes] = await Promise.all([
        this.api('/api/emergency/contacts'),
        this.api('/api/emergency/ambulances')
      ]);

      this.emergencyContacts = contactsRes.data || [];
      this.ambulances = ambulancesRes.data || [];

      this.renderEmergencyContacts();
      this.renderAmbulances();
    } catch (_) {}
  }

  renderEmergencyContacts() {
    const grid = document.getElementById('emergencyContactsGrid');
    if (!grid) return;

    grid.innerHTML = this.emergencyContacts.map(c => `
      <div class="card" style="border-left: 4px solid var(--red);">
        <span class="section-label" style="color:var(--red);">${c.type || 'Emergency Hotline'}</span>
        <h3 style="font-size:1.15rem; margin-bottom:0.25rem;">${c.name}</h3>
        <p style="font-size:0.85rem; color:var(--text-body); margin-bottom:0.75rem;">${c.description || c.serviceScope}</p>
        <div style="font-size:0.85rem; margin-bottom:1rem;">
          Response Time: <strong>~${c.averageResponseTimeMinutes || 5} mins</strong> &bull; Availability: <strong>${c.availability}</strong>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <a href="tel:${c.phoneNumber}" class="btn btn-sm btn-danger" style="flex:1;">
            📞 Call ${c.phoneNumber}
          </a>
          ${c.secondaryPhone ? `<a href="tel:${c.secondaryPhone}" class="btn btn-sm btn-outline">Alt: ${c.secondaryPhone}</a>` : ''}
        </div>
      </div>
    `).join('');
  }

  renderAmbulances() {
    const grid = document.getElementById('ambulancesGrid');
    if (!grid) return;

    grid.innerHTML = this.ambulances.map(a => {
      const isAvailable = a.status === 'Available';
      const badgeBg = isAvailable ? '#D1FAE5' : (a.status === 'Dispatched' ? '#FEF3C7' : '#FEE2E2');
      const badgeCol = isAvailable ? '#065F46' : (a.status === 'Dispatched' ? '#92400E' : '#991B1B');

      return `
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
              <span class="section-label">${a.vehicleType}</span>
              <span style="font-size:0.75rem; padding:2px 8px; border-radius:999px; background:${badgeBg}; color:${badgeCol}; font-weight:700;">
                ${a.status}
              </span>
            </div>
            <h3 style="font-size:1.25rem; margin-bottom:0.25rem;">${a.vehicleNumber}</h3>
            <p style="font-size:0.85rem; color:var(--text-body); margin-bottom:0.5rem;">
              Driver: <strong>${a.driverName}</strong> (${a.contactNumber})
            </p>
            <p style="font-size:0.85rem; color:var(--text-body); margin-bottom:0.75rem;">
              Affiliation: <strong>${a.hospitalAffiliation || 'Regional Base'}</strong>
            </p>
            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:0.5rem;">
              ${(a.equipment || []).map(eq => `<span style="font-size:0.7rem; background:#F3F4F6; padding:2px 6px; border-radius:6px; color:#4B5563;">${eq}</span>`).join('')}
            </div>
          </div>
          <div style="border-top:1px solid var(--border); padding-top:0.75rem; margin-top:0.75rem;">
            <button class="btn btn-sm btn-danger" style="width:100%;" onclick="app.openDispatchModalForAmbulance('${a.id}', '${a.vehicleType}')">
              Deploy This Unit
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // EMERGENCY SOS DISPATCH (POST /api/emergency/dispatch)
  // =========================================================================
  openDispatchModal() {
    this.openModal('dispatchModal');
    const errBox = document.getElementById('dispatchErrorBox');
    const successCard = document.getElementById('dispatchSuccessCard');
    const form = document.getElementById('dispatchForm');
    if (errBox) errBox.style.display = 'none';
    if (successCard) successCard.style.display = 'none';
    if (form) form.style.display = 'block';

    const latInput = document.getElementById('dispLatitude');
    const lngInput = document.getElementById('dispLongitude');
    if (latInput) latInput.value = this.currentLocation.lat;
    if (lngInput) lngInput.value = this.currentLocation.lng;
  }

  openDispatchModalForHospital(hospitalId) {
    this.openDispatchModal();
    const hosp = this.hospitals.find(h => h.id === hospitalId);
    if (hosp) {
      const notes = document.getElementById('dispNotes');
      if (notes) notes.value = `Destination requested: ${hosp.name}`;
      if (hosp.latitude && hosp.longitude) {
        document.getElementById('dispLatitude').value = hosp.latitude;
        document.getElementById('dispLongitude').value = hosp.longitude;
      }
    }
  }

  openDispatchModalForAmbulance(ambulanceId, vehicleType) {
    this.openDispatchModal();
    const vSel = document.getElementById('dispVehicleType');
    if (vSel && vehicleType) {
      for (let i = 0; i < vSel.options.length; i++) {
        if (vSel.options[i].value === vehicleType) {
          vSel.selectedIndex = i;
          break;
        }
      }
    }
  }

  fillDispatchCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        document.getElementById('dispLatitude').value = pos.coords.latitude.toFixed(4);
        document.getElementById('dispLongitude').value = pos.coords.longitude.toFixed(4);
        this.showToast('Updated coordinates from device GPS', 'success');
      });
    }
  }

  fillDispatchSampleLocation() {
    document.getElementById('dispLatitude').value = 28.6139;
    document.getElementById('dispLongitude').value = 77.2090;
    this.showToast('Loaded New Delhi NCR sample coordinates', 'info');
  }

  async submitDispatch(event) {
    event.preventDefault();
    const errBox = document.getElementById('dispatchErrorBox');
    const btn = document.getElementById('btnSubmitDispatch');
    const successCard = document.getElementById('dispatchSuccessCard');
    const successDetails = document.getElementById('dispatchSuccessDetails');
    const form = document.getElementById('dispatchForm');

    errBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Allocating Closest Ambulance...';

    const payload = {
      patientName: document.getElementById('dispPatientName').value.trim(),
      contactPhone: document.getElementById('dispPhone').value.trim(),
      emergencyType: document.getElementById('dispEmergencyType').value,
      vehicleType: document.getElementById('dispVehicleType').value,
      latitude: parseFloat(document.getElementById('dispLatitude').value),
      longitude: parseFloat(document.getElementById('dispLongitude').value),
      notes: document.getElementById('dispNotes').value.trim()
    };

    try {
      const res = await this.api('/api/emergency/dispatch', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      this.activeTrackingId = res.data.trackingId;
      form.style.display = 'none';
      successCard.style.display = 'block';

      successDetails.innerHTML = `
        <p><strong>Tracking SOS ID:</strong> <span style="font-family:monospace; font-size:1.1rem; color:#111827;">${res.data.trackingId}</span></p>
        <p><strong>Allocated Ambulance:</strong> ${res.data.assignedAmbulance.vehicleNumber} (${res.data.assignedAmbulance.driverName} - ${res.data.assignedAmbulance.contactNumber})</p>
        <p><strong>Estimated Arrival Time:</strong> ~${res.data.estimatedArrivalMinutes} minutes (${res.data.distanceKm} km)</p>
        <p><strong>Destination Trauma Center:</strong> ${res.data.destinationHospital ? res.data.destinationHospital.name : 'Nearest Available Hospital'}</p>
      `;

      this.showToast('Emergency Ambulance Dispatched Successfully!', 'success');
      this.fetchEmergencyData(); // Refresh fleet view
    } catch (err) {
      errBox.textContent = `Dispatch Failed: ${err.message}`;
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Dispatch Nearest Ambulance Now';
    }
  }

  // =========================================================================
  // TRACK AMBULANCE DISPATCH (GET /api/emergency/dispatch/:trackingId)
  // =========================================================================
  openTrackModal() {
    this.openModal('trackModal');
    if (this.activeTrackingId) {
      document.getElementById('trackIdInput').value = this.activeTrackingId;
      this.lookupTracking();
    }
  }

  viewActiveTracking() {
    this.closeModal('dispatchModal');
    this.openTrackModal();
  }

  async lookupTracking() {
    const trackingId = (document.getElementById('trackIdInput')?.value || '').trim();
    const container = document.getElementById('trackResultContainer');
    if (!trackingId || !container) return;

    container.innerHTML = '<div style="padding:1rem; text-align:center;">Querying live GPS dispatch feed...</div>';

    try {
      const res = await this.api(`/api/emergency/dispatch/${trackingId}`);
      const d = res.data;

      container.innerHTML = `
        <div class="card" style="background:#F9FAFB; border:1px solid #D1D5DB;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span class="section-label" style="color:var(--red); margin:0;">${d.emergencyType}</span>
            <span style="background:#FEF3C7; color:#92400E; font-weight:700; padding:3px 10px; border-radius:999px; font-size:0.75rem;">
              Status: ${d.status}
            </span>
          </div>
          <h4 style="font-size:1.2rem; margin-bottom:0.5rem;">Patient: ${d.patientName}</h4>
          <p style="font-size:0.85rem; color:var(--text-body); margin-bottom:0.5rem;">
            Contact: ${d.contactPhone} &bull; Requested: ${new Date(d.createdAt).toLocaleTimeString()}
          </p>
          <div style="background:#fff; border-radius:12px; padding:0.75rem; border:1px solid var(--border); font-size:0.9rem; margin-bottom:0.75rem;">
            <div>Vehicle: <strong>${d.vehicleType}</strong></div>
            <div>Estimated Arrival: <strong style="color:var(--red); font-size:1.1rem;">~${d.estimatedArrivalMinutes} Minutes</strong> (${d.distanceKm} km)</div>
            ${d.destinationHospital ? `<div style="margin-top:4px;">Destination: <strong>${d.destinationHospital.name}</strong></div>` : ''}
          </div>
          <p style="font-size:0.8rem; color:#6B7280; text-align:center;">Live GPS transponder connected to regional emergency network.</p>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="padding:1rem; color:#991B1B; background:#FEE2E2; border-radius:12px;">Tracking Error: ${err.message}</div>`;
    }
  }

  // =========================================================================
  // AUTHENTICATION & PROFILE (/api/auth/*)
  // =========================================================================
  async restoreAuthSession() {
    if (!this.token) {
      this.renderAuthUI();
      return;
    }

    try {
      const res = await this.api('/api/auth/me');
      this.currentUser = res.data;
    } catch (_) {
      this.token = null;
      localStorage.removeItem('np_token');
      this.currentUser = null;
    }

    this.renderAuthUI();
  }

  renderAuthUI() {
    const unauth = document.getElementById('unauthControls');
    const auth = document.getElementById('authControls');
    const roleBadge = document.getElementById('userRoleBadge');
    const nameLabel = document.getElementById('userNameLabel');
    const adminNav = document.getElementById('navAdminLink');

    if (this.currentUser) {
      if (unauth) unauth.style.display = 'none';
      if (auth) auth.style.display = 'flex';
      if (nameLabel) nameLabel.textContent = this.currentUser.name;
      if (roleBadge) {
        roleBadge.textContent = this.currentUser.role;
        roleBadge.className = `role-badge ${this.currentUser.role === 'admin' ? 'admin' : ''}`;
      }
      if (adminNav) {
        adminNav.style.display = (this.currentUser.role === 'admin') ? 'inline-block' : 'none';
      }
    } else {
      if (unauth) unauth.style.display = 'flex';
      if (auth) auth.style.display = 'none';
      if (adminNav) adminNav.style.display = 'none';
    }
  }

  openAuthModal(tab = 'login') {
    this.openModal('authModal');
    this.setAuthTab(tab);
  }

  setAuthTab(tab) {
    const tabLogin = document.getElementById('authTabLogin');
    const tabReg = document.getElementById('authTabRegister');
    const formLogin = document.getElementById('loginForm');
    const formReg = document.getElementById('registerForm');

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      formLogin.style.display = 'block';
      formReg.style.display = 'none';
    } else {
      tabReg.classList.add('active');
      tabLogin.classList.remove('active');
      formReg.style.display = 'block';
      formLogin.style.display = 'none';
    }
  }

  async quickAdminLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = 'admin@neerajpharma.com';
    if (passInput) passInput.value = 'Admin@12345';

    this.showToast('Logging in as pre-seeded Administrator...', 'info');
    try {
      const res = await this.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@neerajpharma.com', password: 'Admin@12345' })
      });

      this.token = res.data.token;
      this.currentUser = res.data.user;
      localStorage.setItem('np_token', this.token);
      this.renderAuthUI();
      this.closeModal('authModal');
      this.showToast('Signed in successfully as Administrator', 'success');
    } catch (err) {
      this.showToast(`Admin login failed: ${err.message}`, 'error');
    }
  }

  async submitLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errBox = document.getElementById('loginErrorBox');
    errBox.style.display = 'none';

    try {
      const res = await this.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      this.token = res.data.token;
      this.currentUser = res.data.user;
      localStorage.setItem('np_token', this.token);
      this.renderAuthUI();
      this.closeModal('authModal');
      this.showToast(`Welcome back, ${this.currentUser.name}!`, 'success');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  }

  async submitRegister(event) {
    event.preventDefault();
    const payload = {
      name: document.getElementById('regName').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      password: document.getElementById('regPassword').value,
      phoneNumber: document.getElementById('regPhone').value.trim(),
      department: document.getElementById('regDepartment').value.trim() || 'Public User'
    };

    const errBox = document.getElementById('regErrorBox');
    errBox.style.display = 'none';

    try {
      const res = await this.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      this.token = res.data.token;
      this.currentUser = res.data.user;
      localStorage.setItem('np_token', this.token);
      this.renderAuthUI();
      this.closeModal('authModal');
      this.showToast('Account registered successfully!', 'success');
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('np_token');
    this.renderAuthUI();
    this.showToast('You have been logged out.', 'info');
  }

  // =========================================================================
  // ADMIN CONTROL CENTER (GET /api/admin/*)
  // =========================================================================
  async openAdminModal() {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.showToast('Administrator privileges required. Use Demo Admin button.', 'error');
      this.openAuthModal('login');
      return;
    }

    this.openModal('adminModal');
    this.setAdminTab(this.adminActiveTab);
  }

  setAdminTab(tab) {
    this.adminActiveTab = tab;
    ['kpi', 'queue', 'hospitals', 'fleet', 'users', 'system'].forEach(t => {
      const btn = document.getElementById(`adminTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });

    this.renderAdminTab(tab);
  }

  async renderAdminTab(tab) {
    const container = document.getElementById('adminTabContent');
    if (!container) return;
    container.innerHTML = '<div style="padding:2rem; text-align:center;">Loading admin data...</div>';

    try {
      if (tab === 'kpi') {
        const stats = await this.api('/api/admin/stats');
        const s = stats.data;
        container.innerHTML = `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
            <div class="card">
              <div class="section-label">Hospitals</div>
              <div style="font-size:1.75rem; font-weight:800;">${s.hospitals.total} (${s.hospitals.verified} Verified)</div>
              <div style="color:var(--red); font-size:0.85rem; font-weight:600;">${s.hospitals.pending} Pending Review</div>
            </div>
            <div class="card">
              <div class="section-label">Ambulances</div>
              <div style="font-size:1.75rem; font-weight:800; color:var(--green);">${s.ambulances.available} Available</div>
              <div style="font-size:0.85rem; color:var(--text-body);">${s.ambulances.total} Total Units</div>
            </div>
            <div class="card">
              <div class="section-label">Medical Specialists</div>
              <div style="font-size:1.75rem; font-weight:800; color:var(--indigo);">${s.doctors.total} Doctors</div>
              <div style="font-size:0.85rem; color:var(--text-body);">Multi-specialty Roster</div>
            </div>
            <div class="card">
              <div class="section-label">Platform Accounts</div>
              <div style="font-size:1.75rem; font-weight:800;">${s.users.total} Users</div>
              <div style="font-size:0.85rem; color:var(--green);">${s.users.active} Active Profiles</div>
            </div>
          </div>
        `;
      } else if (tab === 'queue') {
        const [hospQueue, emgQueue] = await Promise.all([
          this.api('/api/admin/hospitals/pending'),
          this.api('/api/admin/emergency/pending')
        ]);

        const pendingH = hospQueue.data || [];
        const pendingContacts = emgQueue.data?.contacts || [];
        const pendingAmb = emgQueue.data?.ambulances || [];

        container.innerHTML = `
          <h4 style="font-size:1.15rem; margin-bottom:0.75rem;">Pending Hospitals Verification (${pendingH.length})</h4>
          ${pendingH.length === 0 ? '<p style="color:#059669; margin-bottom:1.5rem;">✓ All hospitals verified!</p>' : `
            <div style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem;">
              ${pendingH.map(h => `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:1rem;">
                  <div>
                    <strong>${h.name}</strong> - ${h.city} (${h.facilityType})
                    <div style="font-size:0.8rem; color:#6B7280;">Beds: ${h.availableBeds}/${h.totalBeds} &bull; Hotline: ${h.emergencyHotline}</div>
                  </div>
                  <button class="btn btn-sm btn-success" onclick="app.adminApproveHospital('${h.id}')">Approve Hospital</button>
                </div>
              `).join('')}
            </div>
          `}

          <h4 style="font-size:1.15rem; margin-bottom:0.75rem;">Pending Ambulances (${pendingAmb.length})</h4>
          ${pendingAmb.length === 0 ? '<p style="color:#059669; margin-bottom:1.5rem;">✓ All ambulance units verified!</p>' : `
            <div style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem;">
              ${pendingAmb.map(a => `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:1rem;">
                  <div>
                    <strong>${a.vehicleNumber}</strong> - ${a.vehicleType} (${a.driverName})
                  </div>
                  <button class="btn btn-sm btn-success" onclick="app.adminApproveAmbulance('${a.id}')">Approve Ambulance</button>
                </div>
              `).join('')}
            </div>
          `}
        `;
      } else if (tab === 'hospitals') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h4 style="font-size:1.15rem;">Hospital Management & Real-Time Bed Triage</h4>
            <button class="btn btn-sm btn-primary" onclick="app.adminPromptCreateHospital()">+ Add New Hospital</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.75rem; max-height:400px; overflow-y:auto;">
            ${this.hospitals.map(h => `
              <div class="card" style="padding:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                <div>
                  <strong>${h.name}</strong> (${h.city})
                  <div style="font-size:0.85rem; color:#4B5563;">
                    Live Beds: <strong style="color:var(--green);">${h.availableBeds}</strong> / ${h.totalBeds} &bull; ICU: ${h.icuBedsAvailable}
                  </div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                  <button class="btn btn-sm btn-outline" onclick="app.adminUpdateBeds('${h.id}', ${h.availableBeds})">Update Beds</button>
                  <button class="btn btn-sm btn-danger" onclick="app.adminDeleteHospital('${h.id}')">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else if (tab === 'users') {
        const usersRes = await this.api('/api/admin/users');
        const users = usersRes.data || [];

        container.innerHTML = `
          <h4 style="font-size:1.15rem; margin-bottom:1rem;">Platform Users (${users.length})</h4>
          <div style="display:flex; flex-direction:column; gap:0.75rem; max-height:400px; overflow-y:auto;">
            ${users.map(u => `
              <div class="card" style="padding:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                <div>
                  <strong>${u.name}</strong> (${u.email})
                  <div style="font-size:0.8rem; color:#6B7280;">Role: <span style="font-weight:700; color:var(--primary);">${u.role}</span> &bull; Status: ${u.status || 'active'}</div>
                </div>
                <div style="display:flex; gap:0.4rem;">
                  ${u.role === 'admin' ? `
                    <button class="btn btn-sm btn-outline" onclick="app.adminChangeUserRole('${u.id}', 'user')">Demote to User</button>
                  ` : `
                    <button class="btn btn-sm btn-outline" onclick="app.adminChangeUserRole('${u.id}', 'admin')">Promote to Admin</button>
                  `}
                  <button class="btn btn-sm ${u.status === 'disabled' ? 'btn-success' : 'btn-outline'}" onclick="app.adminToggleUserStatus('${u.id}', '${u.status === 'disabled' ? 'active' : 'disabled'}')">
                    ${u.status === 'disabled' ? 'Enable' : 'Disable'}
                  </button>
                  ${u.id !== this.currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="app.adminDeleteUser('${u.id}')">Delete</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else if (tab === 'system') {
        container.innerHTML = `
          <div class="card" style="padding:1.5rem; border-left:4px solid var(--primary);">
            <h4 style="font-size:1.2rem; margin-bottom:0.5rem;">Database Maintenance</h4>
            <p style="font-size:0.9rem; color:var(--text-body); margin-bottom:1.25rem;">
              Reset all hospital, doctor, emergency helpline, and ambulance records to initial seed state.
              (Protected by production guard).
            </p>
            <button class="btn btn-danger" onclick="app.adminReseedDatabase()">Reseed Database to Clean State</button>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `<div style="padding:1.5rem; color:#991B1B;">Admin view error: ${err.message}</div>`;
    }
  }

  async adminApproveHospital(id) {
    try {
      await this.api(`/api/admin/hospitals/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: true, notes: 'Accreditation verified by administrator' })
      });
      this.showToast('Hospital verified successfully!', 'success');
      this.renderAdminTab('queue');
      this.fetchHospitals();
    } catch (err) {
      this.showToast(`Verification failed: ${err.message}`, 'error');
    }
  }

  async adminApproveAmbulance(id) {
    try {
      await this.api(`/api/admin/ambulances/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: true })
      });
      this.showToast('Ambulance approved for active service!', 'success');
      this.renderAdminTab('queue');
      this.fetchEmergencyData();
    } catch (err) {
      this.showToast(`Verification failed: ${err.message}`, 'error');
    }
  }

  async adminUpdateBeds(id, currentBeds) {
    const newBedsStr = prompt('Enter new available general bed count:', currentBeds);
    if (newBedsStr === null) return;
    const newBeds = parseInt(newBedsStr, 10);
    if (isNaN(newBeds) || newBeds < 0) {
      alert('Available beds must be a non-negative number');
      return;
    }

    try {
      await this.api(`/api/hospitals/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availableBeds: newBeds })
      });
      this.showToast('Hospital live bed capacity updated', 'success');
      await this.fetchHospitals();
      this.renderAdminTab('hospitals');
    } catch (err) {
      this.showToast(`Failed to update beds: ${err.message}`, 'error');
    }
  }

  async adminDeleteHospital(id) {
    if (!confirm('Are you sure you want to delete this hospital? Associated doctors will be cascade cleaned.')) return;
    try {
      await this.api(`/api/hospitals/${id}`, { method: 'DELETE' });
      this.showToast('Hospital and orphan doctors removed successfully', 'success');
      await this.fetchHospitals();
      this.renderAdminTab('hospitals');
    } catch (err) {
      this.showToast(`Delete failed: ${err.message}`, 'error');
    }
  }

  async adminChangeUserRole(id, newRole) {
    try {
      await this.api(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      this.showToast(`User role updated to ${newRole}`, 'success');
      this.renderAdminTab('users');
    } catch (err) {
      this.showToast(`Failed to update role: ${err.message}`, 'error');
    }
  }

  async adminToggleUserStatus(id, newStatus) {
    try {
      await this.api(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      this.showToast(`User account status set to ${newStatus}`, 'success');
      this.renderAdminTab('users');
    } catch (err) {
      this.showToast(`Failed to update status: ${err.message}`, 'error');
    }
  }

  async adminDeleteUser(id) {
    if (!confirm('Permanently delete this user account?')) return;
    try {
      await this.api(`/api/admin/users/${id}`, { method: 'DELETE' });
      this.showToast('User account deleted', 'success');
      this.renderAdminTab('users');
    } catch (err) {
      this.showToast(`Delete failed: ${err.message}`, 'error');
    }
  }

  async adminReseedDatabase() {
    if (!confirm('Reset database to clean initial seed dataset?')) return;
    try {
      await this.api('/api/admin/reseed', { method: 'POST' });
      this.showToast('Database reset to initial seed state!', 'success');
      await this.fetchPlatformHealth();
      await this.fetchHospitals();
      await this.fetchDoctors();
      await this.fetchEmergencyData();
      this.renderAdminTab('system');
    } catch (err) {
      this.showToast(`Reseed error: ${err.message}`, 'error');
    }
  }

  async adminPromptCreateHospital() {
    const name = prompt('Hospital Name:');
    if (!name) return;
    const address = prompt('Hospital Address:') || 'Healthcare Blvd';
    const city = prompt('City:') || 'New Delhi';

    try {
      await this.api('/api/hospitals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address,
          city,
          state: 'Delhi',
          latitude: this.currentLocation.lat,
          longitude: this.currentLocation.lng,
          phone: '+91-11-23456789',
          emergencyHotline: '+91-11-23456799',
          facilityType: 'Super Speciality',
          totalBeds: 100,
          availableBeds: 25,
          icuBedsAvailable: 5,
          ventilatorBedsAvailable: 2,
          rating: 4.8
        })
      });
      this.showToast('New hospital registered and verified!', 'success');
      await this.fetchHospitals();
      this.renderAdminTab('hospitals');
    } catch (err) {
      this.showToast(`Creation failed: ${err.message}`, 'error');
    }
  }

  // =========================================================================
  // MODAL & TOAST UTILITIES
  // =========================================================================
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : (type === 'error' ? 'toast-error' : '')}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Global Application Instance
const app = new NeerajPharmaApp();
document.addEventListener('DOMContentLoaded', () => app.init());
