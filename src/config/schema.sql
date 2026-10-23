-- PostgreSQL Database Schema for Neeraj Pharma Healthcare & Emergency Hospital Locator Platform

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  phone_number VARCHAR(30),
  department VARCHAR(100) DEFAULT 'Public User',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(64) PRIMARY KEY,
  city_name VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  key_area VARCHAR(200),
  zone_type VARCHAR(50) DEFAULT 'Urban Medical Hub',
  hospital_count INTEGER DEFAULT 0 CHECK (hospital_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations (latitude, longitude);

CREATE TABLE IF NOT EXISTS hospitals (
  id VARCHAR(64) PRIMARY KEY,
  location_id VARCHAR(64) REFERENCES locations(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  phone VARCHAR(40) NOT NULL,
  emergency_hotline VARCHAR(40) NOT NULL,
  email VARCHAR(160),
  facility_type VARCHAR(100) NOT NULL,
  operating_hours VARCHAR(120) NOT NULL,
  open_time VARCHAR(10) DEFAULT '00:00',
  close_time VARCHAR(10) DEFAULT '23:59',
  open_24x7 BOOLEAN NOT NULL DEFAULT TRUE,
  has_emergency BOOLEAN NOT NULL DEFAULT TRUE,
  total_beds INTEGER NOT NULL DEFAULT 100 CHECK (total_beds >= 0),
  available_beds INTEGER NOT NULL DEFAULT 20 CHECK (available_beds >= 0 AND available_beds <= total_beds),
  icu_beds_available INTEGER NOT NULL DEFAULT 5 CHECK (icu_beds_available >= 0),
  ventilator_beds_available INTEGER NOT NULL DEFAULT 2 CHECK (ventilator_beds_available >= 0),
  specialties JSONB NOT NULL DEFAULT '[]',
  services JSONB NOT NULL DEFAULT '[]',
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.50 CHECK (rating BETWEEN 0 AND 5),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(64),
  verification_notes TEXT,
  website VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hospitals_coords ON hospitals (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hospitals_verified ON hospitals (verified);

CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(64) PRIMARY KEY,
  hospital_id VARCHAR(64) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  qualifications VARCHAR(200) NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 1 CHECK (experience_years >= 0),
  contact VARCHAR(40) NOT NULL,
  email VARCHAR(160),
  availability VARCHAR(150) NOT NULL,
  shift_start VARCHAR(10) DEFAULT '09:00',
  shift_end VARCHAR(10) DEFAULT '17:00',
  working_days JSONB DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat"]',
  emergency_on_call BOOLEAN NOT NULL DEFAULT FALSE,
  consultation_fee INTEGER NOT NULL DEFAULT 1000 CHECK (consultation_fee >= 0),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors (hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors (specialty);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id VARCHAR(64) PRIMARY KEY,
  hospital_id VARCHAR(64) REFERENCES hospitals(id) ON DELETE SET NULL,
  name VARCHAR(180) NOT NULL,
  type VARCHAR(80) NOT NULL,
  phone_number VARCHAR(40) NOT NULL,
  secondary_phone VARCHAR(40),
  service_scope VARCHAR(255) NOT NULL,
  availability VARCHAR(100) NOT NULL DEFAULT '24x7 Free Service',
  average_response_time_minutes INTEGER NOT NULL DEFAULT 10 CHECK (average_response_time_minutes >= 0),
  description TEXT,
  verified BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(64),
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ambulances (
  id VARCHAR(64) PRIMARY KEY,
  vehicle_number VARCHAR(40) UNIQUE NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  driver_name VARCHAR(120) NOT NULL,
  contact_number VARCHAR(40) NOT NULL,
  current_latitude DOUBLE PRECISION NOT NULL CHECK (current_latitude BETWEEN -90 AND 90),
  current_longitude DOUBLE PRECISION NOT NULL CHECK (current_longitude BETWEEN -180 AND 180),
  hospital_affiliation VARCHAR(200),
  hospital_id VARCHAR(64) REFERENCES hospitals(id) ON DELETE SET NULL,
  equipment JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(30) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Dispatched', 'Maintenance')),
  base_city VARCHAR(100),
  verified BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS emergency_dispatches (
  id VARCHAR(64) PRIMARY KEY,
  tracking_id VARCHAR(64) UNIQUE NOT NULL,
  patient_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(40) NOT NULL,
  emergency_type VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  assigned_ambulance_id VARCHAR(64) REFERENCES ambulances(id) ON DELETE SET NULL,
  user_latitude DOUBLE PRECISION NOT NULL,
  user_longitude DOUBLE PRECISION NOT NULL,
  destination_hospital_id VARCHAR(64) REFERENCES hospitals(id) ON DELETE SET NULL,
  distance_km NUMERIC(6, 2),
  estimated_arrival_minutes INTEGER NOT NULL,
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Dispatched',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
