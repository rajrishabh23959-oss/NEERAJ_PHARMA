# Neeraj Pharma Healthcare & Emergency Hospital Locator Platform

A full-stack healthcare and emergency hospital locator platform built with **Node.js, Express.js, MongoDB (Mongoose) / PostgreSQL (`pg`)**, real-time operating-hours availability computation, Haversine geolocation search, emergency ambulance dispatch, JWT role-based access control, and a responsive Leaflet map frontend.

---

## 🏗️ Technical Architecture & Stack

| Layer | Technology | Implementation |
|---|---|---|
| **Runtime & API Framework** | Node.js & Express.js (`^4.19.2`) | Modular `express.Router()` routes in `src/routes/`, centralized error handling in `src/middleware/errorHandler.js` |
| **Database Layer** | MongoDB (`mongoose`) & PostgreSQL (`pg`) | Mongoose schemas in `src/models/*.js`, PostgreSQL DDL in `src/config/schema.sql` & `src/config/postgres.js`, and unified repository in `src/config/db.js` |
| **Authentication & RBAC** | `jsonwebtoken` & `bcryptjs` | HMAC-SHA256 JWT authentication, password hashing, role self-assignment prevention, and account status (`active`/`disabled`/`suspended`) enforcement |
| **Geolocation & Real-Time Availability** | Haversine Formula & Operating Hours Parser | Great-circle distance calculation in `src/services/geoService.js` and live operating-hours / shift parser in `src/services/availabilityService.js` |
| **Testing & Documentation** | Node Test Runner (`node:test`) & Postman v2.1 | 45 automated integration tests in `tests/api.test.js` + 59 Postman requests (including 12 negative/edge-case tests) with `pm.test()` scripts |

---

## 📂 Project Folder Structure

```text
neeraj-pharma-hospital-locator/
├── server.js                      # Express.js application entry point
├── package.json                   # Dependencies (express, mongoose, pg, jsonwebtoken, bcryptjs, dotenv, cors)
├── .env.example                   # Environment variables template (copy to .env)
├── .gitignore                     # Excludes .env, node_modules/, and runtime data files
├── .github/                       # GitHub Actions CI & Pull Request template
├── src/
│   ├── config/
│   │   ├── env.js                 # dotenv loader (no hardcoded secret fallback)
│   │   ├── schema.sql             # PostgreSQL relational schema & indexes
│   │   ├── postgres.js            # PostgreSQL Pool connection & migration runner
│   │   ├── mongodb.js             # MongoDB Mongoose connection manager
│   │   ├── db.js                  # Unified Database Engine
│   │   └── seedData.js            # Seed dataset (12 hospitals, 12 doctors, 6 locations, 6 helplines, 7 ambulances)
│   ├── models/
│   │   ├── Hospital.js            # Mongoose Hospital Schema
│   │   ├── Doctor.js              # Mongoose Doctor Schema
│   │   ├── EmergencyContact.js    # Mongoose EmergencyContact Schema
│   │   ├── Ambulance.js           # Mongoose Ambulance Schema
│   │   ├── Location.js            # Mongoose Location Schema
│   │   ├── User.js                # Mongoose User Schema
│   │   ├── Dispatch.js            # Mongoose Dispatch Schema
│   │   └── schemas.js             # Strict request & query validation rules
│   ├── services/
│   │   ├── geoService.js          # Haversine distance & multi-filter hospital search
│   │   ├── availabilityService.js # Dynamic real-time operating hours & shift availability engine
│   │   └── ambulanceService.js    # Nearest ambulance finder & dispatch engine
│   ├── middleware/
│   │   ├── auth.js                # JWT verification & active user status check
│   │   ├── rbac.js                # Role-based access control (admin vs user)
│   │   ├── validate.js            # Query and request body validation middleware
│   │   └── errorHandler.js        # Centralized Express 404 & error handling middleware
│   ├── controllers/
│   │   ├── authController.js      # Register (blocks admin self-assignment), login, profile CRUD
│   │   ├── hospitalController.js  # Hospital CRUD, nearby search, real-time availability, contacts update
│   │   ├── doctorController.js    # Doctor CRUD & real-time shift availability
│   │   ├── locationController.js  # Locations entity CRUD & proximity mapping
│   │   ├── emergencyController.js # Emergency contacts CRUD, ambulances CRUD, dispatch & tracking
│   │   └── adminController.js     # Hospital & emergency verification workflows, full user lifecycle management
│   └── routes/                    # Express router definitions (47 endpoints)
├── public/                        # Responsive Web Frontend (HTML5, CSS3, JS, Leaflet Map)
├── tests/
│   └── api.test.js                # Automated integration test suite
├── postman/
│   ├── neeraj_pharma_hospital_locator.postman_collection.json
│   └── neeraj_pharma.postman_environment.json
└── docs/
    └── API_DOCUMENTATION.md       # Complete 47-endpoint REST API reference
```

---

## ⚡ Quick Start

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
2. **Start Server:**
   ```bash
   npm start
   ```
   Server starts at `http://localhost:5000`.
3. **Run Automated Tests:**
   ```bash
   npm test
   ```
