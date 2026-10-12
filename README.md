# Neerajpharma - Responsive Healthcare & Emergency HospitalLocator Backend

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://mongoosejs.com/)
[![JWT](https://img.shields.io/badge/Authentication-JWT-orange.svg)](https://jwt.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

Backend service for the **Responsive Healthcare & Emergency HospitalLocator Website** built for **Neerajpharma**. This platform delivers mission-critical, real-time location-based healthcare services, fast emergency SOS routing, live hospital bed/ICU availability tracking, and ambulance dispatch.

---

## 🌟 Key Responsibilities & Capabilities

1. **Database Architecture**:
   - Schemas for Hospitals, Doctors, Ambulances, Emergency Helplines, and Users.
   - Geospatial `2dsphere` indexes on coordinates `[longitude, latitude]`.
2. **Hospital Management APIs**:
   - Full CRUD operations with facilities, specialties, operating hours, ratings, and bed counts.
3. **Location-Based Services**:
   - Discover nearby emergency facilities using latitude, longitude, and radius filtering with Haversine distance calculations.
4. **Emergency & Quick SOS Services**:
   - **1-Tap Quick SOS** triage endpoint aggregating nearest emergency hospitals with ICU availability, nearby ambulances, and national dispatch helplines (112, 108).
5. **Search & Multi-Filter**:
   - Multi-criteria queries matching keywords, city, facilities, specialties, and 24x7 emergency acceptance.
6. **User Authentication & RBAC**:
   - JWT tokens, password hashing with `bcryptjs`, and role-based access control (`user`, `hospital_admin`, `super_admin`).
7. **Admin Management**:
   - Healthcare system metrics, hospital verification, and user management.
8. **Documentation & Testing**:
   - Interactive Swagger documentation at `/api-docs`.
   - Complete Postman collection (`Neerajpharma_HospitalLocator.postman_collection.json`).
   - Automated test suite covering all core requirements.
9. **Frontend Integration Showcase**:
   - Responsive web application served at `http://localhost:5000` demonstrating full integration with the backend REST APIs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### Installation
```bash
# Clone the repository
git clone <YOUR_REPO_URL>
cd "NEERAJ PHARMA"

# Install dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
> Note: If no external MongoDB URI is specified in `.env`, the server automatically starts an embedded in-memory MongoDB instance for zero-configuration testing.

### Running Automated Tests
```bash
# Run comprehensive Jest & Supertest test suite (31 tests)
npm test

# Run standalone integration test suite (22 tests)
npm run test:integration

# Run all test suites
npm run test:all
```

### Starting the Server
```bash
# Production mode
npm start

# Development mode with hot-reload
npm run dev
```

### Seeding Demo Data
```bash
npm run seed
```

---

## 📱 Pre-Configured Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@neerajpharma.com` | `AdminPassword123!` |
| **Hospital Admin** | `rajesh.verma@aiims.edu` | `HospitalAdmin123!` |
| **General User** | `priya.patel@gmail.com` | `UserPassword123!` |

---

## 🧭 API Documentation & Postman
- Interactive Swagger UI: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- Comprehensive Markdown Guide: [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)
- Postman Collection: [`Neerajpharma_HospitalLocator.postman_collection.json`](./Neerajpharma_HospitalLocator.postman_collection.json)
