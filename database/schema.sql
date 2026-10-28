-- ====================================================================
-- BUILDGUARD AI - DATABASE SCHEMA (PostgreSQL 14+ with PostGIS support)
-- AI-Based Building Violation Detection & Spatial Intelligence System
-- ====================================================================

-- Enable PostGIS extension for geospatial operations (if available)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. USERS TABLE
-- Stores officers, municipal administrators, and viewers
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'OFFICER', 'VIEWER')),
    department VARCHAR(150),
    badge_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DATA SOURCES TABLE
-- Tracks authoritative municipal databases, satellite providers, OSM, and their availability
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL CHECK (source_type IN ('AUTHORITATIVE_MUNICIPAL', 'SATELLITE_IMAGERY', 'OPENSTREETMAP', 'AI_ANALYSIS', 'USER_DEMO')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'DEGRADED', 'REQUIRES_VERIFICATION')),
    endpoint_url TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    accuracy_confidence_score NUMERIC(4, 2) DEFAULT 0.00,
    disclaimer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. LOCATIONS TABLE
-- Administrative jurisdictions, wards, zones, and municipal divisions
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(150) NOT NULL,
    state_province VARCHAR(150),
    country VARCHAR(100) DEFAULT 'India',
    ward_number VARCHAR(50),
    zone_name VARCHAR(100),
    center_latitude NUMERIC(10, 7) NOT NULL,
    center_longitude NUMERIC(10, 7) NOT NULL,
    boundary_geojson JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BUILDINGS TABLE
-- Real-world indexed structures with geometry footprints and metadata
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_osm_id VARCHAR(100),
    property_tax_id VARCHAR(100),
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    formatted_address TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    footprint_area_sqm NUMERIC(12, 2),
    footprint_geojson JSONB NOT NULL,
    building_type VARCHAR(100),
    building_levels INTEGER,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    official_data_status VARCHAR(100) DEFAULT 'Data unavailable from connected authoritative source',
    data_confidence NUMERIC(4, 2) DEFAULT 0.85,
    last_inspected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SATELLITE OBSERVATIONS TABLE
-- Geospatial multi-spectral/RGB observations across timestamps
CREATE TABLE IF NOT EXISTS satellite_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    provider_name VARCHAR(100) NOT NULL, -- e.g. Sentinel-2, Landsat, Esri World Imagery, Planet
    resolution_meters NUMERIC(6, 2) NOT NULL,
    cloud_cover_percent NUMERIC(5, 2),
    imagery_bounds JSONB,
    imagery_thumbnail_url TEXT,
    spectral_indices JSONB, -- NDVI, NDBI for built-up index
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. BUILDING OBSERVATIONS TABLE
-- Historical footprint snapshots and level measurements
CREATE TABLE IF NOT EXISTS building_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    observation_year INTEGER NOT NULL,
    observation_type VARCHAR(100) NOT NULL, -- BASELINE_FOOTPRINT, SATELLITE_DETECTION, REGISTERED_PERMIT, FIELD_SURVEY
    source_label VARCHAR(150) NOT NULL,
    measured_footprint_sqm NUMERIC(12, 2),
    detected_levels INTEGER,
    geometry_geojson JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. DETECTED CHANGES TABLE
-- Spatial differentials between temporal observations
CREATE TABLE IF NOT EXISTS detected_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    change_category VARCHAR(100) NOT NULL CHECK (change_category IN ('FOOTPRINT_EXPANSION', 'NEW_CONSTRUCTION', 'DEMOLITION', 'HEIGHT_INCREASE', 'SETBACK_ENCROACHMENT')),
    baseline_observation_id UUID REFERENCES building_observations(id),
    current_observation_id UUID REFERENCES building_observations(id),
    area_delta_sqm NUMERIC(10, 2),
    percentage_change NUMERIC(6, 2),
    detection_method VARCHAR(100) NOT NULL, -- AI_CV_CHANGE_DETECTION, VECTOR_INTERSECTION, SPECTRAL_INDEX
    ai_confidence NUMERIC(4, 2) NOT NULL,
    change_polygon_geojson JSONB,
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. POTENTIAL VIOLATIONS TABLE
-- AI-derived discrepancy records with formal disclaimer & evidence
CREATE TABLE IF NOT EXISTS potential_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    detected_change_id UUID REFERENCES detected_changes(id) ON DELETE SET NULL,
    violation_type VARCHAR(150) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT NOT NULL,
    evidence_items JSONB NOT NULL, -- Array of strings/citations
    legal_disclaimer TEXT DEFAULT 'Potential violation detected — official verification required.',
    data_source VARCHAR(150) NOT NULL,
    ai_confidence NUMERIC(4, 2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'NO_POTENTIAL_DISCREPANCY_DETECTED',
        'POTENTIAL_DISCREPANCY',
        'REQUIRES_VERIFICATION',
        'VERIFIED',
        'RESOLVED'
    )),
    detection_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. VERIFICATION RECORDS TABLE
-- Official municipal officer actions, site visits, and rulings
CREATE TABLE IF NOT EXISTS verification_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_id UUID REFERENCES potential_violations(id) ON DELETE CASCADE,
    officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_taken VARCHAR(100) NOT NULL CHECK (action_taken IN ('SITE_INSPECTION_SCHEDULED', 'NOTICE_ISSUED', 'DISCREPANCY_CONFIRMED', 'DISMISSED_PERMIT_FOUND', 'RESOLVED_PENALTY_PAID')),
    field_notes TEXT NOT NULL,
    official_document_ref VARCHAR(150),
    site_visit_date DATE,
    final_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. REPORTS TABLE
-- Comprehensive municipal building intelligence reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number VARCHAR(100) UNIQUE NOT NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    generated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content_json JSONB NOT NULL,
    verification_status VARCHAR(50) NOT NULL,
    snapshot_coordinates VARCHAR(100),
    is_exported_pdf BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. AUDIT LOGS TABLE
-- Complete immutable audit trail for compliance and officer actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for fast GIS queries and joins
CREATE INDEX IF NOT EXISTS idx_buildings_lat_lng ON buildings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_buildings_osm ON buildings(external_osm_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON potential_violations(status);
CREATE INDEX IF NOT EXISTS idx_reports_building ON reports(building_id);
