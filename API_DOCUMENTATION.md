# Neerajpharma Healthcare & Emergency Hospital Locator API Documentation

Production-grade RESTful API service developed for the **Responsive Healthcare & Emergency HospitalLocator Website**.

---

## 1. Overview & Architecture
- **Base URL**: `http://localhost:5000/api/v1`
- **Interactive Swagger UI**: `http://localhost:5000/api-docs`
- **Service Health Check**: `http://localhost:5000/health`
- **Authentication**: JWT (JSON Web Tokens) with `Authorization: Bearer <token>`
- **Geospatial Engine**: MongoDB `2dsphere` index with Haversine great-circle distance computation in kilometers.
- **Security Hardening**:
  - `helmet`: Sets HTTP security headers with explicit Content Security Policy (CSP).
  - `express-rate-limit`: Prevents DDoS and brute-force credential stuffing (100 req/15min API general, 20 req/15min on auth endpoints).
  - `bcryptjs`: Password hashing with 10 salt rounds; passwords excluded from queries by default (`select: false`).
  - `cors`: Explicit `CLIENT_URL` origin strictly required in production (wildcard `*` disallowed).
  - `express-validator`: Rigorous input validation and sanitization on all mutating endpoints.
  - `Secret Strength Enforcement`: Fails fast on application startup if `JWT_SECRET` (< 32 chars) or `ADMIN_SECRET` (< 16 chars) are weak or placeholders.
  - `Generic Auth Errors`: Uniform `Invalid credentials` (HTTP 401) returned with no internal error message leakage (`err.message` stripped).
  - `Hospital Ownership Enforcement`: Hospital administrators can only modify their assigned hospital.
  - `Pagination Limits`: Safely capped at a maximum of 100 items per page across all endpoints.

---

## 2. API Endpoints

### 🔐 Authentication & Users (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new patient/user account (hospital_admin self-registration blocked; super_admin requires valid `adminSecret`) |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user and receive JWT (generic 401 error on invalid credentials) |
| `GET` | `/api/v1/auth/me` | Private | Retrieve authenticated user profile |
| `PUT` | `/api/v1/auth/updatedetails` | Private | Update name, phone, emergency contacts |
| `PUT` | `/api/v1/auth/updatepassword` | Private | Update password with old password verification |
| `POST` | `/api/v1/auth/saved-hospitals/:id` | Private | Bookmark emergency hospital to favorites |
| `DELETE` | `/api/v1/auth/saved-hospitals/:id` | Private | Remove hospital bookmark |

#### Sample Register Payload:
```json
{
  "name": "Dr. Aarav Sharma",
  "email": "aarav.sharma@example.com",
  "password": "SecurePassword123!",
  "phone": "+91 98765 43210",
  "role": "user"
}
```

---

### 🏥 Hospital Management & Geolocation (`/api/v1/hospitals`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/hospitals/nearby` | Public | Find hospitals using `lat`, `lng`, `radius` (km) sorted by distance |
| `GET` | `/api/v1/hospitals/search` | Public | Multi-filter search (keyword, city, specialty, facilities, 24x7) |
| `GET` | `/api/v1/hospitals` | Public | Paginated list of all active hospitals |
| `GET` | `/api/v1/hospitals/:id` | Public | Full hospital profile with doctors and ambulances |
| `POST` | `/api/v1/hospitals` | Admin / Hospital Admin | Register a new hospital |
| `PUT` | `/api/v1/hospitals/:id` | Admin / Hospital Admin | Update hospital profile details |
| `DELETE` | `/api/v1/hospitals/:id` | Super Admin | Soft-delete hospital |
| `PATCH` | `/api/v1/hospitals/:id/availability` | Admin / Hospital Admin | Fast real-time update of ICU/general beds |
| `PATCH` | `/api/v1/hospitals/:id/verify` | Super Admin | Verify hospital credentials |

#### Geolocation Query Parameters (`GET /api/v1/hospitals/nearby`):
- `lat` (required, -90 to 90): User latitude (e.g. `28.5672`)
- `lng` (required, -180 to 180): User longitude (e.g. `77.2090`)
- `radius` (optional, default: 15): Search radius in Kilometers
- `hasIcu` (optional, `true`): Must have available ICU beds
- `hasOxygen` (optional, `true`): Must have available Oxygen beds
- `is24x7` (optional, `true`): Must operate 24x7

---

### 🚨 Emergency & Quick SOS (`/api/v1/emergency`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/emergency/quick-sos` | Public | **1-Tap SOS Triage**: Nearest emergency hospital + ambulance + helplines |
| `GET` | `/api/v1/emergency/contacts` | Public | List national and city emergency hotlines (supports pagination) |
| `POST` | `/api/v1/emergency/contacts` | Super Admin | Create verified emergency helpline |
| `PUT` | `/api/v1/emergency/contacts/:id` | Super Admin | Update helpline info |
| `DELETE`| `/api/v1/emergency/contacts/:id` | Super Admin | Delete helpline |
| `GET` | `/api/v1/emergency/ambulances` | Public | Find ambulances (GPS nearby or by city with pagination) |
| `POST` | `/api/v1/emergency/ambulances` | Admin / Hospital Admin | Register new ambulance vehicle |
| `PATCH` | `/api/v1/emergency/ambulances/:id/status` | Admin / Hospital Admin | Update status (`available`, `on_call`, `dispatched`) |

---

### 👨‍⚕️ Doctors Directory (`/api/v1/doctors`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/doctors` | Public | Filter doctors by hospital, specialty, emergency duty, with pagination |
| `GET` | `/api/v1/doctors/:id` | Public | Doctor profile with consultation details |
| `POST` | `/api/v1/doctors` | Admin / Hospital Admin | Add doctor to hospital roster |
| `PUT` | `/api/v1/doctors/:id` | Admin / Hospital Admin | Update doctor details |
| `DELETE`| `/api/v1/doctors/:id` | Admin / Hospital Admin | Remove doctor |

---

### 🛡️ Admin Management (`/api/v1/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard-stats` | Super Admin | System-wide healthcare metrics & bed totals |
| `GET` | `/api/v1/admin/users` | Super Admin | Paginated list of registered users |
| `PATCH` | `/api/v1/admin/users/:id/role` | Super Admin | Update user role (`user`, `hospital_admin`, `super_admin`) |
| `PATCH` | `/api/v1/admin/users/:id/status`| Super Admin | Activate or deactivate user accounts |

---

## 3. Pre-Seeded Default Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@neerajpharma.com` | `AdminPassword123!` |
| **Hospital Admin** | `rajesh.verma@aiims.edu` | `HospitalAdmin123!` |
| **Patient / User** | `priya.patel@gmail.com` | `UserPassword123!` |

---

## 4. Setup & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run tests**:
   ```bash
   # Run Jest automated test suite
   npm test

   # Run integration tests
   npm run test:integration

   # Run all test suites
   npm run test:all
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access Applications**:
   - Web Frontend: `http://localhost:5000`
   - Interactive Swagger Docs: `http://localhost:5000/api-docs`
   - Health Check: `http://localhost:5000/health`
