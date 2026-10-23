# Neeraj Pharma Healthcare & Emergency Hospital Locator — Complete REST API Documentation

## Overview
- **Base URL:** `http://localhost:5000/api`
- **Framework:** Node.js & Express.js (`express.Router()`)
- **Database Support:** Embedded Document Engine (`src/config/db.js` — default zero-config mode), MongoDB (`src/config/mongodb.js` & `src/models/*.js`), and PostgreSQL (`src/config/postgres.js` & `src/config/schema.sql`)
- **Authentication:** JWT Bearer Token (`Authorization: Bearer <token>`)
- **Standard Response Envelope:**
  ```json
  {
    "success": true,
    "message": "Operation description",
    "data": {},
    "meta": {}
  }
  ```

> [!CAUTION]
> **Security Notice regarding Demo Credentials:**
> The default administrator credentials (`admin@neerajpharma.com` / `Admin@12345`) and test coordinator account (`coordinator@neerajpharma.com` / `Admin@12345`) are pre-seeded solely for local evaluation, CI testing, and evaluation demonstration. They **MUST** be rotated or changed immediately prior to any production deployment.

---

## Complete Endpoint Summary Table (47 Endpoints)

| # | Method | Endpoint | Auth Requirement | Purpose |
|---|---|---|---|---|
| 1 | `GET` | `/api` | Public | API routing directory and catalog |
| 2 | `GET` | `/api/health` | Public | Platform health, uptime, and verified entity counts |
| 3 | `POST` | `/api/auth/register` | Public | Register citizen user (blocks `'role': 'admin'` with `403`) |
| 4 | `POST` | `/api/auth/login` | Public (Rate Limited) | Authenticate user and receive signed JWT |
| 5 | `GET` | `/api/auth/me` | Bearer Token | Retrieve authenticated user profile |
| 6 | `PUT` | `/api/auth/me` | Bearer Token | Update user profile (`name`, `phoneNumber`, `department`, `password`) |
| 7 | `GET` | `/api/hospitals` | Public | Haversine geolocation search & multi-filter |
| 8 | `GET` | `/api/hospitals/:id` | Public | Full hospital profile with doctors, ambulances, and location |
| 9 | `GET` | `/api/hospitals/:id/availability` | Public | Real-time open/closed status from `operatingHours` and bed count |
| 10 | `PATCH` | `/api/hospitals/:id/availability` | Admin JWT | Update real-time bed capacity and schedule |
| 11 | `PATCH` | `/api/hospitals/:id/contacts` | Admin JWT | Update hospital contact numbers, hotline, email, and website |
| 12 | `POST` | `/api/hospitals` | Bearer Token | Create new hospital record |
| 13 | `PUT` | `/api/hospitals/:id` | Admin JWT | Update hospital information |
| 14 | `DELETE` | `/api/hospitals/:id` | Admin JWT | Delete hospital record & cascade clean orphan doctors/ambulances |
| 15 | `GET` | `/api/doctors` | Public | List doctors with real-time shift availability |
| 16 | `GET` | `/api/doctors/:id` | Public | Retrieve single doctor details, schedule, and affiliated hospital |
| 17 | `POST` | `/api/doctors` | Admin JWT | Add new specialist doctor affiliated with a hospital |
| 18 | `PUT` | `/api/doctors/:id` | Admin JWT | Update doctor details, fee, shift schedule, or availability |
| 19 | `DELETE` | `/api/doctors/:id` | Admin JWT | Delete doctor record |
| 20 | `GET` | `/api/locations` | Public | List mapped geographical zones/hubs with live hospital counts |
| 21 | `GET` | `/api/locations/:id` | Public | Retrieve location details and verified hospitals in that zone |
| 22 | `POST` | `/api/locations` | Admin JWT | Create new geographical location hub |
| 23 | `PUT` | `/api/locations/:id` | Admin JWT | Update geographical location hub |
| 24 | `DELETE` | `/api/locations/:id` | Admin JWT | Delete geographical location hub |
| 25 | `GET` | `/api/emergency/contacts` | Public | List verified national helplines and hospital emergency desks |
| 26 | `POST` | `/api/emergency/contacts` | Admin JWT | Register new emergency helpline service |
| 27 | `PUT` | `/api/emergency/contacts/:id` | Admin JWT | Update emergency helpline service details |
| 28 | `DELETE` | `/api/emergency/contacts/:id` | Admin JWT | Delete emergency helpline record |
| 29 | `GET` | `/api/emergency/ambulances` | Public | Search nearby ambulances sorted by distance and ETA |
| 30 | `POST` | `/api/emergency/ambulances` | Admin JWT | Register new ambulance vehicle unit |
| 31 | `PUT` | `/api/emergency/ambulances/:id` | Admin JWT | Update ambulance unit location, status, or driver |
| 32 | `DELETE` | `/api/emergency/ambulances/:id` | Admin JWT | Delete ambulance unit record |
| 33 | `POST` | `/api/emergency/dispatch` | Public (Rate Limited) | Dispatch closest ambulance with calculated ETA and tracking ID |
| 34 | `GET` | `/api/emergency/dispatch/:trackingId` | Public | Live tracking of ambulance dispatch |
| 35 | `GET` | `/api/admin/stats` | Admin JWT | Platform metrics, entity counts, and verification backlog |
| 36 | `GET` | `/api/admin/hospitals/pending` | Admin JWT | List unverified hospitals awaiting approval |
| 37 | `PATCH` | `/api/admin/hospitals/:id/verify` | Admin JWT | Approve or reject pending hospital |
| 38 | `GET` | `/api/admin/emergency/pending` | Admin JWT | List unverified emergency contacts & ambulances |
| 39 | `PATCH` | `/api/admin/emergency-contacts/:id/verify` | Admin JWT | Verify or reject emergency contact |
| 40 | `PATCH` | `/api/admin/ambulances/:id/verify` | Admin JWT | Verify or reject ambulance vehicle |
| 41 | `GET` | `/api/admin/users` | Admin JWT | List registered users with optional filtering |
| 42 | `GET` | `/api/admin/users/:id` | Admin JWT | Retrieve single user details |
| 43 | `PUT` | `/api/admin/users/:id` | Admin JWT | Update user account profile and role/status |
| 44 | `PATCH` | `/api/admin/users/:id/role` | Admin JWT | Change user role (`user` or `admin`) |
| 45 | `PATCH` | `/api/admin/users/:id/status` | Admin JWT | Enable or disable user account (`active`, `disabled`, `suspended`) |
| 46 | `DELETE` | `/api/admin/users/:id` | Admin JWT | Delete user account |
| 47 | `POST` | `/api/admin/reseed` | Admin JWT | Reset database state (disabled in production with `403`) |

---

## Detailed Specifications by Module

### 1. System Health & Directory

#### `GET /api`
- **Auth:** Public
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "name": "Neeraj Pharma Healthcare & Emergency Hospital Locator REST API",
    "version": "2.0.0",
    "documentation": "/docs",
    "endpoints": { ... }
  }
  ```

#### `GET /api/health`
- **Auth:** Public
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "platform": "Neeraj Pharma Healthcare & Emergency Hospital Locator API",
    "status": "online",
    "timestamp": "2026-10-24T00:38:21.651Z",
    "version": "2.0.0",
    "totalVerifiedHospitals": 10,
    "totalLocations": 6,
    "activeAmbulances": 6
  }
  ```

---

### 2. Authentication & Profile Management (`/api/auth`)

#### `POST /api/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "name": "Ananya Sen",
    "email": "ananya.sen@example.com",
    "password": "Password@123",
    "phoneNumber": "+91-9871122334",
    "department": "Public User"
  }
  ```
- **Validation Rules:**
  - `name`: String, minimum 2 characters.
  - `email`: Valid RFC 5322 email string (must be unique).
  - `password`: String, minimum 8 characters, containing at least one letter and at least one number.
  - `role`: Self-assignment of `"role": "admin"` is strictly blocked (`403 Forbidden`).
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "user_1729790000000_123",
        "name": "Ananya Sen",
        "email": "ananya.sen@example.com",
        "role": "user",
        "phoneNumber": "+91-9871122334",
        "department": "Public User",
        "status": "active"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{ "success": false, "message": "Validation failed", "errors": ["Password must be at least 8 characters long and contain both letters and numbers"] }`
  - `403 Forbidden`: `{ "success": false, "message": "Self-assignment of the 'admin' role is prohibited during registration." }`
  - `409 Conflict`: `{ "success": false, "message": "A user with email 'ananya.sen@example.com' already exists" }`

#### `POST /api/auth/login`
- **Auth:** Public (Rate limited to 15 attempts / 15 minutes per IP)
- **Request Body:**
  ```json
  {
    "email": "admin@neerajpharma.com",
    "password": "Admin@12345"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "usr_admin_001",
        "name": "Neeraj Pharma Administrator",
        "email": "admin@neerajpharma.com",
        "role": "admin",
        "status": "active"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{ "success": false, "message": "Invalid email or password" }`
  - `403 Forbidden`: `{ "success": false, "message": "Your account has been disabled. Please contact the administrator." }`
  - `429 Too Many Requests`: `{ "success": false, "message": "Too many login attempts from this IP. Please try again after 15 minutes." }`

#### `GET /api/auth/me`
- **Auth:** Bearer Token
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
      "id": "usr_admin_001",
      "name": "Neeraj Pharma Administrator",
      "email": "admin@neerajpharma.com",
      "role": "admin",
      "phoneNumber": "+91-9811000001",
      "department": "Healthcare Verification Board",
      "status": "active"
    }
  }
  ```

#### `PUT /api/auth/me`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "name": "Administrator Updated",
    "phoneNumber": "+91-9811000099",
    "department": "Executive Board"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": {
      "id": "usr_admin_001",
      "name": "Administrator Updated",
      "email": "admin@neerajpharma.com",
      "role": "admin",
      "phoneNumber": "+91-9811000099",
      "department": "Executive Board",
      "status": "active"
    }
  }
  ```

---

### 3. Hospitals, Geolocation & Real-Time Availability (`/api/hospitals`)

#### `GET /api/hospitals`
- **Auth:** Public
- **Query Parameters:** `lat`, `lng`, `radius` (max 100km), `facility`, `specialty`, `openNow`, `availableNow`, `hasEmergency`, `sortBy`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Found 10 hospitals matching search criteria",
    "data": [
      {
        "id": "hosp_001",
        "name": "Neeraj Pharma Apex Super Speciality Hospital",
        "address": "Plot 12, Healthcare Boulevard, Sector 44, New Delhi",
        "city": "New Delhi",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "availableBeds": 34,
        "totalBeds": 150,
        "hasEmergency": true,
        "distanceKm": 0,
        "estimatedDriveTimeMinutes": 0,
        "realTimeAvailability": {
          "isOpenNow": true,
          "open24x7": true,
          "statusText": "Open 24/7"
        }
      }
    ]
  }
  ```

#### `GET /api/hospitals/:id`
- **Auth:** Public
- **Success Response (`200 OK`):** Returns hospital details along with populated `doctors`, `ambulances`, `location`, and `realTimeAvailability`.

#### `PATCH /api/hospitals/:id/availability`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "availableBeds": 45,
    "icuBedsAvailable": 8,
    "ventilatorBedsAvailable": 3,
    "open24x7": true,
    "operatingHours": "24 Hours / 7 Days"
  }
  ```
- **Success Response (`200 OK`):** Returns updated hospital record with recalculated availability metrics.

#### `PATCH /api/hospitals/:id/contacts`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "phone": "+91-11-45678900",
    "emergencyHotline": "+91-11-45678911",
    "email": "emergency@neerajpharmahospital.com",
    "website": "https://hospital.neerajpharma.com"
  }
  ```
- **Success Response (`200 OK`):** Returns updated hospital contacts.

#### `POST /api/hospitals`
- **Auth:** Bearer Token (Admin submissions are verified automatically; user submissions enter pending queue)
- **Request Body:**
  ```json
  {
    "name": "East Delhi Metro Trauma Center",
    "address": "12 Vikas Marg, Preet Vihar, Delhi",
    "city": "New Delhi",
    "state": "Delhi",
    "postalCode": "110092",
    "latitude": 28.6369,
    "longitude": 77.2925,
    "phone": "+91-11-22446688",
    "emergencyHotline": "+91-11-22446699",
    "facilityType": "Super Speciality",
    "operatingHours": "24 Hours / 7 Days",
    "totalBeds": 120,
    "availableBeds": 30,
    "icuBedsAvailable": 6,
    "ventilatorBedsAvailable": 2,
    "specialties": ["Trauma", "Cardiology", "Orthopedics"],
    "rating": 4.6
  }
  ```
- **Success Response (`201 Created`):** Returns created hospital record.

#### `PUT /api/hospitals/:id`
- **Auth:** Admin JWT
- **Request Body:** Partial or complete hospital fields to update.
- **Success Response (`200 OK`):** Returns updated hospital record.

#### `DELETE /api/hospitals/:id`
- **Auth:** Admin JWT
- **Cascade Behavior:** Associated doctors are cascade deleted to prevent orphan records. Associated ambulances are cleanly unassigned (`hospitalId: null`).
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Hospital record deleted successfully",
    "data": {
      "id": "hosp_001",
      "cascadeDeletedDoctors": 2
    }
  }
  ```

---

### 4. Doctors & Specialist Roster (`/api/doctors`)

#### `GET /api/doctors`
- **Auth:** Public
- **Query Parameters:** `hospitalId`, `specialty`, `availableNow`, `emergencyOnCall`, `search`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Found 12 registered doctors",
    "data": [
      {
        "id": "doc_001",
        "hospitalId": "hosp_001",
        "hospitalName": "Neeraj Pharma Apex Super Speciality Hospital",
        "name": "Dr. Rajeshwar Sharma",
        "specialty": "Cardiology & Interventional Care",
        "qualifications": "MBBS, MD, DM (Cardiology), FACC",
        "experienceYears": 18,
        "contact": "+91-9811223344",
        "email": "dr.sharma@neerajpharmahospital.com",
        "availability": "Mon-Fri (09:00 - 17:00)",
        "shiftStart": "09:00",
        "shiftEnd": "17:00",
        "workingDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "emergencyOnCall": true,
        "consultationFee": 1500,
        "realTimeAvailability": {
          "isAvailableNow": true,
          "onRegularShift": true,
          "dutyStatus": "On Active Duty"
        }
      }
    ]
  }
  ```

#### `GET /api/doctors/:id`
- **Auth:** Public
- **Success Response (`200 OK`):** Returns single doctor profile with `hospital` details and calculated `realTimeAvailability`.

#### `POST /api/doctors`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "hospitalId": "hosp_001",
    "name": "Dr. Priya Nair",
    "specialty": "Neurology & Stroke Care",
    "qualifications": "MBBS, MD, DM (Neurology)",
    "experienceYears": 12,
    "contact": "+91-9811445566",
    "email": "dr.nair@neerajpharmahospital.com",
    "availability": "Mon-Sat (10:00 - 18:00)",
    "shiftStart": "10:00",
    "shiftEnd": "18:00",
    "workingDays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    "emergencyOnCall": true,
    "consultationFee": 1800,
    "bio": "Senior Consultant Neurologist specializing in acute stroke intervention."
  }
  ```
- **Success Response (`201 Created`):** Returns created doctor profile.

#### `PUT /api/doctors/:id`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "consultationFee": 2000,
    "emergencyOnCall": true
  }
  ```
- **Success Response (`200 OK`):** Returns updated doctor profile.

#### `DELETE /api/doctors/:id`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Doctor record deleted successfully",
    "data": { "id": "doc_001" }
  }
  ```

---

### 5. Locations & Geographical Mapping (`/api/locations`)

#### `GET /api/locations`
- **Auth:** Public
- **Query Parameters:** `city`, `state`, `lat`, `lng`, `search`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Found 6 location hubs",
    "data": [
      {
        "id": "loc_001",
        "cityName": "New Delhi (Central)",
        "state": "Delhi",
        "address": "Connaught Place Inner Circle, New Delhi",
        "postalCode": "110001",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "keyArea": "Connaught Place / Karol Bagh",
        "zoneType": "Primary Metro Emergency Zone",
        "hospitalCount": 4
      }
    ]
  }
  ```

#### `GET /api/locations/:id`
- **Auth:** Public
- **Success Response (`200 OK`):** Returns location details and all affiliated hospitals in that zone.

#### `POST /api/locations`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "cityName": "Bengaluru (Central)",
    "state": "Karnataka",
    "address": "MG Road / Brigade Road Junction, Bengaluru",
    "postalCode": "560001",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "keyArea": "MG Road / Indiranagar",
    "zoneType": "Metro Trauma Hub"
  }
  ```
- **Success Response (`201 Created`):** Returns created location hub.

#### `PUT /api/locations/:id`
- **Auth:** Admin JWT
- **Request Body:** Partial fields to update.
- **Success Response (`200 OK`):** Returns updated location hub.

#### `DELETE /api/locations/:id`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):** Returns `{ "id": "loc_001" }`.

---

### 6. Emergency Contacts, Ambulances & Dispatch (`/api/emergency`)

#### `GET /api/emergency/contacts`
- **Auth:** Public
- **Success Response (`200 OK`):** Returns active helplines (112, 102, 108) and verified hospital desks.

#### `POST /api/emergency/contacts`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "name": "National Disaster Response Triage Desk",
    "type": "National Disaster Hotline",
    "phoneNumber": "1078",
    "secondaryPhone": "+91-11-26701728",
    "serviceScope": "Nationwide",
    "availability": "24 Hours / 7 Days",
    "averageResponseTimeMinutes": 5,
    "description": "Direct disaster and triage escalation line."
  }
  ```
- **Success Response (`201 Created`):** Returns created contact.

#### `PUT /api/emergency/contacts/:id`
- **Auth:** Admin JWT
- **Request Body:** Partial fields to update.
- **Success Response (`200 OK`):** Returns updated contact.

#### `DELETE /api/emergency/contacts/:id`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):** Returns `{ "id": "emg_001" }`.

#### `GET /api/emergency/ambulances`
- **Auth:** Public
- **Query Parameters:** `lat`, `lng`, `radius`, `status`, `vehicleType`
- **Success Response (`200 OK`):** Returns nearby ambulances sorted by Haversine distance and computed ETA.

#### `POST /api/emergency/ambulances`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "vehicleNumber": "DL-01-EQ-9922",
    "vehicleType": "Advanced Life Support (ALS)",
    "driverName": "Sunil Kumar",
    "contactNumber": "+91-9810998877",
    "currentLatitude": 28.6139,
    "currentLongitude": 77.2090,
    "hospitalAffiliation": "Neeraj Pharma Apex Hospital",
    "hospitalId": "hosp_001",
    "equipment": ["Ventilator", "Defibrillator", "Oxygen", "Multipara Monitor"],
    "status": "Available",
    "baseCity": "New Delhi"
  }
  ```
- **Success Response (`201 Created`):** Returns registered ambulance.

#### `PUT /api/emergency/ambulances/:id`
- **Auth:** Admin JWT
- **Request Body:** Partial updates (`status`: `"Available"` | `"Dispatched"` | `"Maintenance"`, GPS coordinates, driver).
- **Success Response (`200 OK`):** Returns updated ambulance record.

#### `DELETE /api/emergency/ambulances/:id`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):** Returns `{ "id": "amb_001" }`.

#### `POST /api/emergency/dispatch`
- **Auth:** Public (Rate limited to 15 dispatches / 15 minutes per IP)
- **Request Body:**
  ```json
  {
    "patientName": "Ramesh Gupta",
    "contactPhone": "+91-9811998877",
    "emergencyType": "Cardiac Arrest",
    "vehicleType": "Advanced Life Support (ALS)",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "notes": "Patient experiencing severe chest pain on 2nd floor."
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Ambulance dispatched successfully",
    "data": {
      "trackingId": "SOS-20261024-4821",
      "patientName": "Ramesh Gupta",
      "emergencyType": "Cardiac Arrest",
      "vehicleType": "Advanced Life Support (ALS)",
      "assignedAmbulance": {
        "id": "amb_001",
        "vehicleNumber": "DL-01-EQ-4412",
        "driverName": "Ramesh Kumar",
        "contactNumber": "+91-9810112233"
      },
      "destinationHospital": {
        "id": "hosp_001",
        "name": "Neeraj Pharma Apex Super Speciality Hospital",
        "phone": "+91-11-45678900"
      },
      "distanceKm": 1.45,
      "estimatedArrivalMinutes": 5,
      "status": "Dispatched"
    }
  }
  ```

#### `GET /api/emergency/dispatch/:trackingId`
- **Auth:** Public
- **Success Response (`200 OK`):** Returns live dispatch record and arrival status.

---

### 7. Admin Verification & User Lifecycle Management (`/api/admin`)

#### `GET /api/admin/stats`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Admin dashboard metrics retrieved successfully",
    "data": {
      "hospitals": { "total": 12, "verified": 10, "pending": 2 },
      "doctors": { "total": 12 },
      "locations": { "total": 6 },
      "ambulances": { "total": 7, "available": 6, "dispatched": 1 },
      "users": { "total": 3, "active": 3, "disabled": 0 }
    }
  }
  ```

#### `GET /api/admin/hospitals/pending`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):** Returns array of hospitals where `verified: false`.

#### `PATCH /api/admin/hospitals/:id/verify`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "verified": true,
    "notes": "NABH accreditation and fire safety certificates verified on site."
  }
  ```
- **Success Response (`200 OK`):** Returns verified hospital record.

#### `GET /api/admin/emergency/pending`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):** Returns pending unverified emergency contacts and ambulance units.

#### `PATCH /api/admin/emergency-contacts/:id/verify`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "verified": true,
    "notes": "Government emergency response license confirmed."
  }
  ```
- **Success Response (`200 OK`):** Returns verified emergency contact.

#### `PATCH /api/admin/ambulances/:id/verify`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "verified": true
  }
  ```
- **Success Response (`200 OK`):** Returns verified ambulance unit.

#### `GET /api/admin/users`
- **Auth:** Admin JWT
- **Query Parameters:** `role`, `status`, `search`
- **Success Response (`200 OK`):** Returns sanitized array of users (excluding `passwordHash`).

#### `GET /api/admin/users/:id`
- **Auth:** Admin JWT
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "User details retrieved successfully",
    "data": {
      "id": "usr_staff_001",
      "name": "Dr. Vikas Mehra (Hospital Coordinator)",
      "email": "coordinator@neerajpharma.com",
      "role": "user",
      "phoneNumber": "+91-9811000002",
      "department": "Emergency Operations",
      "status": "active",
      "createdAt": "2026-09-14T08:30:00.000Z"
    }
  }
  ```

#### `PUT /api/admin/users/:id`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "name": "Dr. Vikas Mehra (Senior Coordinator)",
    "department": "Regional Emergency Command",
    "phoneNumber": "+91-9811000022"
  }
  ```
- **Success Response (`200 OK`):** Returns updated user record.

#### `PATCH /api/admin/users/:id/role`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "role": "admin"
  }
  ```
- **Validation Rules:** Role must be either `'user'` or `'admin'`.
- **Success Response (`200 OK`):** Returns updated user with new role.

#### `PATCH /api/admin/users/:id/status`
- **Auth:** Admin JWT
- **Request Body:**
  ```json
  {
    "status": "disabled"
  }
  ```
- **Validation Rules:** Status must be one of: `'active'`, `'disabled'`, `'suspended'`. Administrators cannot disable their own active account (`400 Bad Request`).
- **Success Response (`200 OK`):** Returns updated user with modified status.

#### `DELETE /api/admin/users/:id`
- **Auth:** Admin JWT
- **Validation Rules:** Administrators cannot delete their own active account (`400 Bad Request`).
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "User account deleted successfully",
    "data": { "id": "usr_staff_001" }
  }
  ```

#### `POST /api/admin/reseed`
- **Auth:** Admin JWT
- **Production Guard:** If `NODE_ENV=production`, returns `403 Forbidden` (`{ "success": false, "message": "Database reseed is disabled in production" }`).
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Database reset to initial seed state",
    "data": {
      "hospitalsCount": 12,
      "doctorsCount": 12,
      "locationsCount": 6,
      "emergencyContactsCount": 6,
      "ambulancesCount": 7,
      "usersCount": 3
    }
  }
  ```
