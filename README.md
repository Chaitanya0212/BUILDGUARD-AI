# BUILDGUARD AI: AI-Based Building Violation Detection & Spatial Intelligence System

BUILDGUARD AI is an enterprise municipal GIS platform where the **MAP itself is the primary input**. Municipal vigilance officers, town planners, and citizens can navigate anywhere on Earth, click or search any parcel (such as Arilova, Visakhapatnam), and retrieve authoritative cadastral geometries, multi-temporal satellite observations, vector differentials, and AI-assisted violation assessments.

---

## 1. Core Workflow & Architectural Principles

```
Login / Role Selection (ADMIN / OFFICER / VIEWER)
   ↓
Municipal Dashboard (Live KPIs, Discrepancy Breakdown, Alerts)
   ↓
Interactive GIS Map (Esri Satellite, OSM Vector, Night Carto)
   ↓
Search / Navigate (Coordinates, Address, or Preset e.g. "Arilova, Visakhapatnam")
   ↓
Select Building / Area (Map Click or Polygon Selection)
   ↓
Get Coordinates & Vector Footprint (Real Overpass API + Spherical Math)
   ↓
Retrieve Available Real Data (Transparent Provenance Attribution)
   ↓
Building Information Panel (Cadastral Attributes, Ward, Levels, Usage)
   ↓
Satellite / Geospatial Analysis (Temporal Split Slider 2019 vs 2026, NDBI/NDVI)
   ↓
AI Change & Violation Analysis (Gemini 3.8 Flash + Morphological Differentials)
   ↓
Potential Violation Classification ("Potential violation detected — official verification required")
   ↓
Officer Statutory Verification (Field notes, Document Ref #, Status update)
   ↓
13-Section Official Municipal Intelligence Report (Print & PDF Export)
```

### Real Data Transparency Principle
BuildGuard AI **never fabricates official government records**. If an authoritative database is not connected, the system explicitly displays:
> `Data unavailable from connected authoritative source (Requires official verification)`

Data provenance is partitioned into 4 distinct layers:
1. **Official / Authoritative Data**: Municipal ERP / Cadastral registries
2. **Satellite / Geospatial Data**: High-resolution imagery (Esri World Imagery, Sentinel-2)
3. **OpenStreetMap Vector Data**: Real-time Overpass API queries
4. **AI-Derived Estimates**: Advisory morphological inferences via Gemini 3.8 Flash

---

## 2. System Architecture

```
buildguard-ai/
├── backend/
│   ├── database/
│   │   └── store.ts              # In-memory store + initial Arilova & CP parcels
│   └── services/
│       ├── geminiService.ts      # Gemini 3.8 Flash violation reasoning & grounded assistant
│       └── geospatialService.ts  # Overpass API, Nominatim geocoding, spherical polygon math
├── database/
│   └── schema.sql                # Full PostgreSQL 14+ / PostGIS DDL (11 tables)
├── src/
│   ├── components/
│   │   ├── Admin/                # Settings, RBAC & compliance audit logs
│   │   ├── BuildingPanel/        # Right-side Building Intelligence drawer & slider
│   │   ├── Dashboard/            # Municipal stats, charts, priority alert feed
│   │   ├── Map/                  # Leaflet GIS map, vector overlays, layer switchers
│   │   ├── Reports/              # 13-Section printable building intelligence report
│   │   ├── Violations/           # Filterable violations register
│   │   └── Navbar.tsx            # Header, search bar & user role switcher
│   ├── context/
│   │   └── AuthContext.tsx       # RBAC state (ADMIN, OFFICER, VIEWER)
│   ├── services/
│   │   └── api.ts                # Client API wrapper
│   ├── types/
│   │   └── index.ts              # Canonical TypeScript interfaces
│   ├── App.tsx                   # Main SPA router & state orchestrator
│   ├── index.css                 # Tailwind CSS, Leaflet styles, Print media rules
│   └── main.tsx                  # React DOM root
├── server.ts                     # Full-stack Express server with Vite middleware
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

---

## 3. Database Schema (PostgreSQL)

Located in `/database/schema.sql`:
1. `users`: Municipal officers, administrators, and public viewers
2. `data_sources`: Provenance records for connected & disconnected APIs
3. `locations`: Administrative wards, zones, municipal corporations
4. `buildings`: Real-world indexed structures and GeoJSON footprints
5. `satellite_observations`: Multi-temporal optical & spectral composites
6. `building_observations`: Cadastral historical snapshots across years
7. `detected_changes`: Area delta ($\Delta m^2$), percentage changes, categories
8. `potential_violations`: Statutory discrepancy records with disclaimers
9. `verification_records`: Officer inspection field notes and official rulings
10. `reports`: 13-section formal municipal reports
11. `audit_logs`: Immutable compliance audit trail

---

## 4. API Endpoints

### Authentication & RBAC
- `POST /api/auth/login`: User session initialization
- `POST /api/auth/register`: Officer account onboarding
- `GET /api/auth/me`: Current session profile
- `POST /api/auth/switch-role`: Instant RBAC testing (`ADMIN`, `OFFICER`, `VIEWER`)

### Geospatial & Map (Primary Input)
- `GET /api/buildings/search?q=...`: Nominatim forward geocoding
- `GET /api/buildings/lookup?lat=...&lng=...`: Coordinate lookup & live Overpass building extraction
- `GET /api/buildings`: Retrieve all indexed parcels
- `GET /api/buildings/:id`: Full building intelligence record

### Violations & Verification
- `GET /api/violations`: Municipal violations register
- `POST /api/violations/:id/verify`: Officer statutory verification action

### Intelligence Reports & AI
- `GET /api/reports`: Report catalog
- `POST /api/reports`: Generate 13-section municipal report
- `POST /api/assistant/chat`: Grounded AI assistant via Gemini 3.8 Flash
- `GET /api/stats`: Dashboard KPIs and alerts

---

## 5. Environment Variables

Create `.env` using `.env.example`:
```bash
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
VITE_MAP_API_KEY=""
VITE_GOOGLE_MAPS_API_KEY=""
BACKEND_API_URL="/api"
```

---

## 6. How to Run & Test

```bash
# Install dependencies
npm install

# Start development full-stack server
npm run dev

# Or build for production
npm run build
npm start
```

### Verification Test Steps
1. Navigate to http://localhost:3000.
2. Select **Arilova, Visakhapatnam** or type coordinates in the search bar.
3. Observe the right-side **Building Intelligence Panel** opening with real OpenStreetMap vector footprints.
4. Toggle to the **Satellite & Change** tab and drag the temporal slider comparing 2019 baseline against 2026 satellite imagery.
5. Review the **Violations** tab for documented evidence items and non-guilt legal disclaimers.
6. Test **Officer Verification** with field notes and status transition to `VERIFIED`.
7. Ask the embedded **AI Assistant** questions ("What changes were detected?").
8. Click **Generate Municipal Intelligence Report** to view and print the 13 statutory sections.
