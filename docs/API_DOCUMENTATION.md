# Neeraj Pharma Healthcare & Emergency Hospital Locator — Complete REST API Documentation

## Overview
- **Base URL:** `http://localhost:5000/api`
- **Framework:** Node.js & Express.js (`express.Router()`)
- **Database Support:** MongoDB (Mongoose ODM schemas in `src/models/`), PostgreSQL (`src/config/schema.sql` & `src/config/postgres.js`), and Embedded Document Engine (`src/config/db.js`)
- **Authentication:** JWT Bearer Token (`Authorization: Bearer <token>`)
- **Response Envelope:**
  ```json
  {
    "success": true,
    "message": "Operation description",
    "data": {},
    "meta": {}
  }
  ```

---

## Complete Endpoint Reference Table (47 Endpoints)

| # | Method | Endpoint | Auth Requirement | Purpose |
|---|---|---|---|---|
| 1 | `GET` | `/api` | Public | API routing directory and endpoint index |
| 2 | `GET` | `/api/health` | Public | System health, uptime, and verified entity counts |
| 3 | `POST` | `/api/auth/register` | Public | Register citizen user (`role` strictly `'user'`; blocks self-assigned `'admin'` with `403`) |
| 4 | `POST` | `/api/auth/login` | Public | Authenticate user and receive signed JWT |
| 5 | `GET` | `/api/auth/me` | Bearer Token | Retrieve current authenticated user profile |
| 6 | `PUT` | `/api/auth/me` | Bearer Token | Update current user profile (`name`, `phoneNumber`, `department`, `password`) |
| 7 | `GET` | `/api/hospitals` | Public / Optional JWT | Geolocation Haversine search & multi-filter (`lat`, `lng`, `radius`, `facility`, `specialty`, `open24x7`, `openNow`, `availableNow`, `hasEmergency`, `minBeds`, `search`, `sortBy`) |
| 8 | `GET` | `/api/hospitals/:id` | Public | Retrieve full hospital profile, real-time availability, affiliated doctors, ambulances, and location |
| 9 | `GET` | `/api/hospitals/:id/availability` | Public | Compute real-time open/closed status from `operatingHours` and live bed capacity |
| 10 | `PATCH` | `/api/hospitals/:id/availability` | Admin JWT | Update hospital real-time bed counts (`availableBeds`, `icuBedsAvailable`, `ventilatorBedsAvailable`) & hours |
| 11 | `PATCH` | `/api/hospitals/:id/contacts` | Admin JWT | Manage hospital contact details (`phone`, `emergencyHotline`, `email`, `website`, `address`) |
| 12 | `POST` | `/api/hospitals` | Bearer Token | Create hospital record (Admin auto-verified; user submission enters pending queue) |
| 13 | `PUT` | `/api/hospitals/:id` | Admin JWT | Update hospital record (validates coordinates, bed counts, and rating `0–5`) |
| 14 | `DELETE` | `/api/hospitals/:id` | Admin JWT | Delete hospital record |
| 15 | `GET` | `/api/doctors` | Public | List doctors with real-time shift availability (`hospitalId`, `specialty`, `emergencyOnCall`, `availableNow`) |
| 16 | `GET` | `/api/doctors/:id` | Public | Retrieve single doctor profile, shift schedule, and associated hospital |
| 17 | `POST` | `/api/doctors` | Admin JWT | Add new specialist doctor associated with a hospital |
| 18 | `PUT` | `/api/doctors/:id` | Admin JWT | Update doctor profile, qualifications, shift availability, or fee |
| 19 | `DELETE` | `/api/doctors/:id` | Admin JWT | Delete doctor record |
| 20 | `GET` | `/api/locations` | Public | List mapped geographical zones/hubs with live hospital counts and optional proximity distance |
| 21 | `GET` | `/api/locations/:id` | Public | Retrieve location details and all verified hospitals in that zone |
| 22 | `POST` | `/api/locations` | Admin JWT | Create new geographical location mapping |
| 23 | `PUT` | `/api/locations/:id` | Admin JWT | Update location mapping |
| 24 | `DELETE` | `/api/locations/:id` | Admin JWT | Delete location mapping |
| 25 | `GET` | `/api/emergency/contacts` | Public / Optional JWT | Retrieve national emergency helplines (112, 102, 108) and verified hospital emergency desks |
| 26 | `POST` | `/api/emergency/contacts` | Admin JWT | Add new emergency contact / helpline service |
| 27 | `PUT` | `/api/emergency/contacts/:id` | Admin JWT | Update emergency contact details or response time |
| 28 | `DELETE` | `/api/emergency/contacts/:id` | Admin JWT | Delete emergency contact record |
| 29 | `GET` | `/api/emergency/ambulances` | Public / Optional JWT | Search nearby active ambulances sorted by Haversine distance and ETA |
| 30 | `POST` | `/api/emergency/ambulances` | Admin JWT | Register new ambulance unit |
| 31 | `PUT` | `/api/emergency/ambulances/:id` | Admin JWT | Update ambulance status (`Available`, `Dispatched`, `Maintenance`), GPS coordinates, or driver |
| 32 | `DELETE` | `/api/emergency/ambulances/:id` | Admin JWT | Remove ambulance unit |
| 33 | `POST` | `/api/emergency/dispatch` | Public | Dispatch closest available ambulance with calculated ETA and tracking ID |
| 34 | `GET` | `/api/emergency/dispatch/:trackingId` | Public | Track live ambulance dispatch status by tracking ID |
| 35 | `GET` | `/api/admin/stats` | Admin JWT | Retrieve platform KPI metrics and system health |
| 36 | `GET` | `/api/admin/hospitals/pending` | Admin JWT | List unverified hospitals awaiting admin approval |
| 37 | `PATCH` | `/api/admin/hospitals/:id/verify` | Admin JWT | Approve (`verified: true`) or reject (`verified: false`) a hospital |
| 38 | `GET` | `/api/admin/emergency/pending` | Admin JWT | List unverified emergency contacts and ambulance units |
| 39 | `PATCH` | `/api/admin/emergency-contacts/:id/verify` | Admin JWT | Verify or reject an emergency contact service |
| 40 | `PATCH` | `/api/admin/ambulances/:id/verify` | Admin JWT | Verify or reject an ambulance unit |
| 41 | `GET` | `/api/admin/users` | Admin JWT | List all users (filter by `role`, `status`, `search`) |
| 42 | `GET` | `/api/admin/users/:id` | Admin JWT | Retrieve single user details |
| 43 | `PUT` | `/api/admin/users/:id` | Admin JWT | Edit user profile, email, phone, department, role, or status |
| 44 | `PATCH` | `/api/admin/users/:id/role` | Admin JWT | Change user role (`user` or `admin`) |
| 45 | `PATCH` | `/api/admin/users/:id/status` | Admin JWT | Enable, disable, or suspend user account (`active`, `disabled`, `suspended`) |
| 46 | `DELETE` | `/api/admin/users/:id` | Admin JWT | Delete user account |
| 47 | `POST` | `/api/admin/reseed` | Admin JWT | Reset database to initial seed dataset |

---

## Detailed Endpoint Specifications

### Module 1: Authentication & Profile (`/api/auth`)

#### `POST /api/auth/register`
- **Auth:** Public
- **Security Note:** Role self-assignment is strictly prohibited. Passing `"role": "admin"` returns `403 Forbidden`.
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
- **Responses:** `201 Created`, `400 Bad Request` (invalid input), `403 Forbidden` (attempted role self-assignment), `409 Conflict` (duplicate email).

#### `POST /api/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "admin@neerajpharma.com",
    "password": "Admin@12345"
  }
  ```
- **Responses:** `200 OK` (returns `user` and `token`), `401 Unauthorized` (invalid credentials), `403 Forbidden` (account disabled/suspended).

#### `GET /api/auth/me` & `PUT /api/auth/me`
- **Auth:** `Authorization: Bearer <token>`
- **`PUT` Request Body:**
  ```json
  {
    "name": "Rohan Patel Updated",
    "phoneNumber": "+91-9811009988",
    "department": "Patient Community"
  }
  ```
- **Responses:** `200 OK`, `400 Bad Request`, `401 Unauthorized`.

---

### Module 2: Hospitals, Geolocation & Real-Time Availability (`/api/hospitals`)

#### `GET /api/hospitals`
- **Query Parameters:**
  - `lat` & `lng`: Coordinates (`-90..90`, `-180..180`). Both required together when searching by location; returns `400 Bad Request` if non-numeric or out of range.
  - `radius`: Search radius in km (`0 < radius <= MAX_SEARCH_RADIUS_KM (100)`). Returns `400 Bad Request` if exceeded.
  - `openNow`: `true` to dynamically filter hospitals currently open based on parsed `operatingHours`.
  - `availableNow`: `true` to filter hospitals currently open AND having `availableBeds > 0`.
  - `open24x7`: `true` to filter 24/7 hospitals.
  - `hasEmergency`: `true` to filter hospitals with emergency departments.
  - `facility`: Facility type substring (e.g. `Super Speciality`, `Trauma`).
  - `specialty`: Medical specialty (e.g. `Cardiology`, `Pediatrics`).
  - `minBeds`: Minimum available beds (non-negative integer).

#### `GET /api/hospitals/:id/availability` & `PATCH /api/hospitals/:id/availability`
- **`GET`:** Computes real-time open/closed status from `operatingHours`, active days of week, and bed occupancy rate.
- **`PATCH` (Admin JWT):**
  ```json
  {
    "availableBeds": 60,
    "icuBedsAvailable": 12,
    "ventilatorBedsAvailable": 5,
    "open24x7": true,
    "operatingHours": "24 Hours / 7 Days"
  }
  ```

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

#### `POST /api/hospitals`, `PUT /api/hospitals/:id`, `DELETE /api/hospitals/:id`
- Validates all coordinates, phone formats, bed counts (`0 <= availableBeds <= totalBeds`), and ratings (`0 <= rating <= 5`).

---

### Module 3: Doctors (`/api/doctors`) & Locations (`/api/locations`)

#### `GET /api/doctors`, `GET /api/doctors/:id`, `POST /api/doctors`, `PUT /api/doctors/:id`, `DELETE /api/doctors/:id`
- Every doctor returned includes dynamically computed `realTimeAvailability` (`isAvailableNow`, `onRegularShift`, `dutyStatus`).
- `POST`, `PUT`, `DELETE` require Admin JWT.

#### `GET /api/locations`, `GET /api/locations/:id`, `POST /api/locations`, `PUT /api/locations/:id`, `DELETE /api/locations/:id`
- Manages geographical zones/hubs, coordinates, postal codes, and associated hospital mappings.

---

### Module 4: Emergency Contacts, Ambulances & Dispatch (`/api/emergency`)

#### Emergency Contacts CRUD:
- `GET /api/emergency/contacts`
- `POST /api/emergency/contacts` (Admin JWT)
- `PUT /api/emergency/contacts/:id` (Admin JWT)
- `DELETE /api/emergency/contacts/:id` (Admin JWT)

#### Ambulances CRUD:
- `GET /api/emergency/ambulances?lat={lat}&lng={lng}&radius={km}`
- `POST /api/emergency/ambulances` (Admin JWT)
- `PUT /api/emergency/ambulances/:id` (Admin JWT)
- `DELETE /api/emergency/ambulances/:id` (Admin JWT)

#### Dispatch & Tracking:
- `POST /api/emergency/dispatch` — Allocates closest verified ambulance and returns `trackingId` and `estimatedArrivalMinutes`.
- `GET /api/emergency/dispatch/:trackingId` — Retrieves live dispatch status.

---

### Module 5: Admin Verification & User Lifecycle Management (`/api/admin`)

- `GET /api/admin/stats` — Platform metrics.
- `GET /api/admin/hospitals/pending` & `PATCH /api/admin/hospitals/:id/verify` — Hospital verification workflow.
- `GET /api/admin/emergency/pending`, `PATCH /api/admin/emergency-contacts/:id/verify`, `PATCH /api/admin/ambulances/:id/verify` — Emergency services & ambulance verification workflow.
- `GET /api/admin/users`, `GET /api/admin/users/:id`, `PUT /api/admin/users/:id`, `PATCH /api/admin/users/:id/role`, `PATCH /api/admin/users/:id/status`, `DELETE /api/admin/users/:id` — Complete user lifecycle management.
- `POST /api/admin/reseed` — Reset database to initial seed state.
