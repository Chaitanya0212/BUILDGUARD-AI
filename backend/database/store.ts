/**
 * BUILDGUARD AI - Backend Data Store
 * In-memory repository with real-world geospatial initial records,
 * user authentication, audit logs, reports, and dynamic OSM cache.
 */

import { Building, BuildingObservation, DetectedChange, PotentialViolation, User, BuildingReport, DataSourceInfo } from '../../src/types/index';

// Pre-seeded standard data sources
export const standardDataSources: DataSourceInfo[] = [
  {
    id: 'src-osm-1',
    sourceCode: 'OSM_OVERPASS',
    name: 'OpenStreetMap Global Vector Database',
    type: 'OPENSTREETMAP',
    status: 'CONNECTED',
    statusMessage: 'Real-time Overpass API gateway active',
    confidence: 0.92,
    lastSync: new Date().toISOString(),
    disclaimer: 'Crowdsourced cadastral geometry subject to community mapping accuracy.'
  },
  {
    id: 'src-sat-1',
    sourceCode: 'ESRI_SENTINEL_SAT',
    name: 'Multi-Spectral Satellite Imagery (Esri / Sentinel-2)',
    type: 'SATELLITE_IMAGERY',
    status: 'CONNECTED',
    statusMessage: 'Multi-resolution temporal composite available',
    confidence: 0.88,
    lastSync: new Date().toISOString(),
    disclaimer: 'Geospatial pixel resolution between 0.5m (commercial) and 10m (Sentinel-2).'
  },
  {
    id: 'src-muni-1',
    sourceCode: 'MUNICIPAL_ERP_GATEWAY',
    name: 'Municipal Urban Planning & Sanctioned Plans DB',
    type: 'AUTHORITATIVE_MUNICIPAL',
    status: 'DISCONNECTED',
    statusMessage: 'Data unavailable from connected authoritative source (Requires official verification)',
    confidence: 0.0,
    disclaimer: 'Authoritative municipal permit gateway is currently disconnected or pending jurisdiction API credentials.'
  },
  {
    id: 'src-ai-1',
    sourceCode: 'BUILDGUARD_CV_ENGINE',
    name: 'BuildGuard AI Change & Morphological Engine',
    type: 'AI_ANALYSIS',
    status: 'CONNECTED',
    statusMessage: 'Gemini 3.8 Flash + Vector Differential active',
    confidence: 0.85,
    lastSync: new Date().toISOString(),
    disclaimer: 'AI-generated estimates are advisory. Official field verification is mandatory before enforcement.'
  }
];

// Initial seeded users with hashed-style tokens
export const initialUsers: User[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@buildguard.gov',
    fullName: 'Director S. Ramanathan',
    role: 'ADMIN',
    department: 'Directorate of Town & Country Planning',
    badgeNumber: 'BG-ADM-001'
  },
  {
    id: 'usr-officer-1',
    email: 'officer@buildguard.gov',
    fullName: 'Inspector Anita Sharma',
    role: 'OFFICER',
    department: 'Municipal Corporation Vigilance Wing',
    badgeNumber: 'BG-OFF-104'
  },
  {
    id: 'usr-viewer-1',
    email: 'citizen@buildguard.gov',
    fullName: 'Rahul Verma (Public Auditor)',
    role: 'VIEWER',
    department: 'Civic Transparency Portal',
    badgeNumber: 'BG-VWR-521'
  }
];

// Pre-seeded realistic buildings:
// 1. Arilova, Visakhapatnam (Explicitly requested by user in brief!)
// Coordinates: 17.7651° N, 83.3254° E
export const initialBuildings: Building[] = [
  {
    id: 'bld-arilova-101',
    externalOsmId: 'way/894102914',
    propertyTaxId: 'GVMC-ARIL-2024-8831',
    formattedAddress: 'Plot 42, Sector 3, Arilova, Visakhapatnam, Andhra Pradesh 530040, India',
    lat: 17.765120,
    lng: 83.325410,
    footprintAreaSqm: 248.5,
    footprint: {
      type: 'Polygon',
      coordinates: [[
        [83.325346, 17.765038],
        [83.325474, 17.765038],
        [83.325474, 17.765202],
        [83.325346, 17.765202],
        [83.325346, 17.765038]
      ]]
    },
    buildingType: 'residential',
    buildingLevels: 4, // Exceeds typical G+2 sanctioned zone
    ward: 'Ward 14 (Arilova)',
    zone: 'Zone II (Madhurawada - Health City)',
    administrativeArea: 'Greater Visakhapatnam Municipal Corporation (GVMC)',
    officialDataStatus: 'Data unavailable from connected authoritative source (Requires official verification)',
    dataConfidence: 0.89,
    lastInspectedAt: '2026-08-12T10:30:00Z',
    dataSources: standardDataSources,
    topView: {
      aiFootprint: {
        type: 'Polygon',
        coordinates: [[
          [83.325346, 17.765038],
          [83.325474, 17.765038],
          [83.325474, 17.765202],
          [83.325346, 17.765202],
          [83.325346, 17.765038]
        ]]
      },
      estimatedAreaSqm: 248.5,
      estimatedLengthM: 18.2,
      estimatedWidthM: 13.6,
      estimatedPerimeterM: 63.6,
      confidence: 0.92,
      modelVersion: 'footprint-seg-v1.4',
      isOfficerVerified: false,
      detectedAt: '2026-03-01T09:00:00Z'
    },
    frontView: {
      hasStreetView: true,
      streetViewPanoId: 'demo-pano-arilova-sec3',
      cameraHeading: 52,
      cameraPitch: 14,
      cameraFov: 75,
      streetViewStaticUrl: 'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=17.765120,83.325410&heading=52&pitch=14&fov=75&key=AIzaSyBf3v6KxTo9aTdkvInA8iBpvpJmDKG7hNQ&solution_id=gmp_git_agentskills_v1',
      estimatedFloors: 4,
      confidence: 0.88,
      modelVersion: 'facade-floors-v2.1',
      viewpointsCount: 3,
      multiAngleViews: [
        {
          angleName: 'Front',
          heading: 52,
          estimatedFloors: 4,
          confidence: 0.91,
          imageUrl: 'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=17.765120,83.325410&heading=52&pitch=14&fov=75&key=AIzaSyBf3v6KxTo9aTdkvInA8iBpvpJmDKG7hNQ&solution_id=gmp_git_agentskills_v1',
          notes: 'Clear frontal façade view. Primary horizontal slab lines and fenestration bands distinct.'
        },
        {
          angleName: 'Front-Left',
          heading: 24,
          estimatedFloors: 4,
          confidence: 0.86,
          imageUrl: 'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=17.765120,83.325410&heading=24&pitch=14&fov=75&key=AIzaSyBf3v6KxTo9aTdkvInA8iBpvpJmDKG7hNQ&solution_id=gmp_git_agentskills_v1',
          notes: 'Oblique view confirms vertical storey rhythm and cantilevered balconies.'
        },
        {
          angleName: 'Front-Right',
          heading: 80,
          estimatedFloors: 4,
          confidence: 0.87,
          imageUrl: 'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=17.765120,83.325410&heading=80&pitch=14&fov=75&key=AIzaSyBf3v6KxTo9aTdkvInA8iBpvpJmDKG7hNQ&solution_id=gmp_git_agentskills_v1',
          notes: 'Right perspective corroborates ground plinth level and rooftop parapet boundary.'
        }
      ],
      structuralFeatures: {
        horizontalSlabsDetected: true,
        windowRowsDetected: true,
        balconiesDetected: true,
        groundFloorSeparation: 'Distinct stilt/parking plinth baseline identified',
        rooflineBoundary: 'Continuous parapet with observable unverified vertical extension'
      },
      isOfficerVerified: false,
      detectedAt: '2026-03-01T09:05:00Z'
    },
    municipalRecord: {
      sanctionPlanNumber: 'GVMC/TP/2019/BA-0491',
      approvedFloors: 2,
      approvedFootprintSqm: 180.0,
      approvedTotalAreaSqm: 360.0,
      permittedUse: 'Residential (Individual Villa)',
      propertyTaxId: 'GVMC-ARIL-2024-8831',
      approvalDate: '2019-03-15',
      isAuthoritative: true,
      statusMessage: 'Sanctioned Plan BA-0491 verified in GVMC Urban Planning Database',
      sourceAdapter: 'POSTGRES_CADASTRE'
    },
    observations: [
      {
        id: 'obs-ari-1',
        buildingId: 'bld-arilova-101',
        year: 2019,
        date: '2019-04-10',
        type: 'BASELINE_FOOTPRINT',
        sourceLabel: 'Baseline Cadastral Satellite Survey',
        footprintSqm: 165.0,
        detectedLevels: 2,
        notes: 'Sanctioned baseline footprint G+1 structure observed.'
      },
      {
        id: 'obs-ari-2',
        buildingId: 'bld-arilova-101',
        year: 2021,
        date: '2021-11-20',
        type: 'SATELLITE_DETECTION',
        sourceLabel: 'High-Res Optical Satellite Composite',
        footprintSqm: 168.2,
        detectedLevels: 2,
        notes: 'Structure stable. Minor perimeter wall addition.'
      },
      {
        id: 'obs-ari-3',
        buildingId: 'bld-arilova-101',
        year: 2023,
        date: '2023-09-15',
        type: 'SATELLITE_DETECTION',
        sourceLabel: 'Sentinel-2 & High-Res Orthophoto',
        footprintSqm: 215.0,
        detectedLevels: 3,
        notes: 'Visible structural roof extension into rear setback boundary.'
      },
      {
        id: 'obs-ari-4',
        buildingId: 'bld-arilova-101',
        year: 2026,
        date: '2026-03-01',
        type: 'CURRENT_OBSERVATION',
        sourceLabel: 'Current Multispectral Observation',
        footprintSqm: 248.5,
        detectedLevels: 4,
        notes: 'Current observation shows G+3 structure with rooftop cantilever encroachment.'
      }
    ],
    detectedChanges: [
      {
        id: 'chg-ari-1',
        buildingId: 'bld-arilova-101',
        category: 'FOOTPRINT_EXPANSION',
        baselineYear: 2019,
        currentYear: 2026,
        baselineAreaSqm: 165.0,
        currentAreaSqm: 248.5,
        areaDeltaSqm: 83.5,
        percentageChange: 50.6,
        detectionMethod: 'AI_CV_CHANGE_DETECTION',
        aiConfidence: 0.91,
        description: 'Lateral expansion of 83.5 m² detected extending across rear setback boundary towards road reserve.',
        detectedAt: '2026-03-02T09:15:00Z',
        changePolygon: {
          type: 'Polygon',
          coordinates: [[
            [83.32545, 17.76501],
            [83.32555, 17.76502],
            [83.32558, 17.76525],
            [83.32548, 17.76524],
            [83.32545, 17.76501]
          ]]
        }
      },
      {
        id: 'chg-ari-2',
        buildingId: 'bld-arilova-101',
        category: 'HEIGHT_INCREASE',
        baselineYear: 2019,
        currentYear: 2026,
        baselineAreaSqm: 165.0,
        currentAreaSqm: 248.5,
        areaDeltaSqm: 0,
        percentageChange: 100.0,
        detectionMethod: 'AI_CV_CHANGE_DETECTION',
        aiConfidence: 0.88,
        description: 'Observed vertical addition from 2 storeys (G+1) to 4 storeys (G+3).',
        detectedAt: '2026-03-02T09:15:00Z'
      }
    ],
    violations: [
      {
        id: 'vio-ari-1',
        buildingId: 'bld-arilova-101',
        violationType: 'Possible Unauthorized Lateral Expansion (Setback Encroachment)',
        severity: 'HIGH',
        description: 'Geospatial multi-temporal comparison reveals 50.6% footprint increase beyond 2019 baseline into designated rear setback.',
        evidence: [
          '2019 Baseline footprint measured 165.0 m²',
          '2026 Multi-spectral satellite observation measures 248.5 m² (+83.5 m² delta)',
          'Rear setback clearance reduced from statutory 3.0m to < 0.6m',
          'Official permit for structural expansion: Data unavailable from connected authoritative source'
        ],
        dataSource: 'BuildGuard Geospatial Differential Engine & Satellite Imagery',
        aiConfidence: 0.91,
        legalDisclaimer: 'Potential violation detected — official verification required.',
        status: 'POTENTIAL_DISCREPANCY',
        detectionDate: '2026-03-02T09:20:00Z'
      },
      {
        id: 'vio-ari-2',
        buildingId: 'bld-arilova-101',
        violationType: 'Possible Unauthorized Additional Storeys (Floor Area Discrepancy)',
        severity: 'CRITICAL',
        description: 'Shadow and stereoscopic profile analysis detects 2 additional floors constructed without verified sanction.',
        evidence: [
          'Initial observation recorded 2 levels (G+1)',
          'Current 2026 imagery indicates 4 levels (G+3)',
          'Exceeds permissible Floor Space Index (FSI) for residential zone sector 3'
        ],
        dataSource: 'Stereoscopic Shadow & Morphological AI Analysis',
        aiConfidence: 0.86,
        legalDisclaimer: 'Potential violation detected — official verification required.',
        status: 'REQUIRES_VERIFICATION',
        detectionDate: '2026-03-02T09:20:00Z'
      }
    ]
  },
  // 2. Connaught Place, New Delhi (Heritage & Commercial Zone)
  {
    id: 'bld-delhi-202',
    externalOsmId: 'way/24819033',
    propertyTaxId: 'NDMC-CP-BLK-B-014',
    formattedAddress: 'Block B, Radial Road 2, Connaught Place, New Delhi 110001, India',
    lat: 28.632800,
    lng: 77.219500,
    footprintAreaSqm: 512.0,
    footprint: {
      type: 'Polygon',
      coordinates: [[
        [77.2192, 28.6326],
        [77.2198, 28.6327],
        [77.2197, 28.6330],
        [77.2191, 28.6329],
        [77.2192, 28.6326]
      ]]
    },
    buildingType: 'commercial',
    buildingLevels: 3,
    ward: 'Ward 23 (Heritage Core)',
    zone: 'NDMC Special Commercial Zone',
    administrativeArea: 'New Delhi Municipal Council (NDMC)',
    officialDataStatus: 'Data unavailable from connected authoritative source (Requires official verification)',
    dataConfidence: 0.94,
    lastInspectedAt: '2026-07-20T14:15:00Z',
    dataSources: standardDataSources,
    observations: [
      {
        id: 'obs-del-1',
        buildingId: 'bld-delhi-202',
        year: 2018,
        date: '2018-05-12',
        type: 'BASELINE_FOOTPRINT',
        sourceLabel: 'NDMC Heritage Cadastre Survey',
        footprintSqm: 508.0,
        detectedLevels: 3,
        notes: 'Heritage protected colonnaded facade documented.'
      },
      {
        id: 'obs-del-2',
        buildingId: 'bld-delhi-202',
        year: 2026,
        date: '2026-01-15',
        type: 'CURRENT_OBSERVATION',
        sourceLabel: 'High-Res Optical Satellite Composite',
        footprintSqm: 512.0,
        detectedLevels: 3,
        notes: 'Minor rooftop HVAC installation detected. Colonnade footprint preserved.'
      }
    ],
    detectedChanges: [
      {
        id: 'chg-del-1',
        buildingId: 'bld-delhi-202',
        category: 'NO_SIGNIFICANT_CHANGE',
        baselineYear: 2018,
        currentYear: 2026,
        baselineAreaSqm: 508.0,
        currentAreaSqm: 512.0,
        areaDeltaSqm: 4.0,
        percentageChange: 0.78,
        detectionMethod: 'VECTOR_INTERSECTION',
        aiConfidence: 0.96,
        description: 'Footprint consistent within 1% sensor tolerance margin. No structural violation indicated.',
        detectedAt: '2026-01-16T11:00:00Z'
      }
    ],
    violations: [
      {
        id: 'vio-del-1',
        buildingId: 'bld-delhi-202',
        violationType: 'No Significant Discrepancy Detected',
        severity: 'LOW',
        description: 'Building envelope matches historical heritage boundary baseline.',
        evidence: [
          'Historical footprint 508.0 m² vs Current 512.0 m² (Δ 0.78% within measurement error)',
          'Rooftop HVAC plant within permitted commercial guidelines'
        ],
        dataSource: 'BuildGuard Change Engine & OpenStreetMap',
        aiConfidence: 0.95,
        legalDisclaimer: 'Potential violation detected — official verification required.',
        status: 'NO_POTENTIAL_DISCREPANCY_DETECTED',
        detectionDate: '2026-01-16T11:05:00Z'
      }
    ]
  },
  // 3. Sector 62, Noida (IT Corridor / Commercial Expansion)
  {
    id: 'bld-noida-303',
    externalOsmId: 'way/192837465',
    propertyTaxId: 'NOIDA-SEC62-CORP-401',
    formattedAddress: 'Plot C-56, Institutional Area, Sector 62, Noida, Uttar Pradesh 201309, India',
    lat: 28.627500,
    lng: 77.368800,
    footprintAreaSqm: 1420.0,
    footprint: {
      type: 'Polygon',
      coordinates: [[
        [77.3683, 28.6271],
        [77.3693, 28.6272],
        [77.3692, 28.6279],
        [77.3682, 28.6278],
        [77.3683, 28.6271]
      ]]
    },
    buildingType: 'commercial',
    buildingLevels: 8,
    ward: 'Sector 62 Commercial Grid',
    zone: 'Noida Authority Institutional Zone',
    administrativeArea: 'New Okhla Industrial Development Authority (NOIDA)',
    officialDataStatus: 'Data unavailable from connected authoritative source (Requires official verification)',
    dataConfidence: 0.92,
    lastInspectedAt: '2026-05-19T09:00:00Z',
    dataSources: standardDataSources,
    observations: [
      {
        id: 'obs-noi-1',
        buildingId: 'bld-noida-303',
        year: 2020,
        date: '2020-02-18',
        type: 'BASELINE_FOOTPRINT',
        sourceLabel: 'Master Plan Spatial Baseline',
        footprintSqm: 1050.0,
        detectedLevels: 6,
        notes: 'Sanctioned IT building shell.'
      },
      {
        id: 'obs-noi-2',
        buildingId: 'bld-noida-303',
        year: 2026,
        date: '2026-02-10',
        type: 'CURRENT_OBSERVATION',
        sourceLabel: 'Sentinel-2 & High Resolution Ortho',
        footprintSqm: 1420.0,
        detectedLevels: 8,
        notes: 'Substantial side wing constructed encroaching internal service driveway.'
      }
    ],
    detectedChanges: [
      {
        id: 'chg-noi-1',
        buildingId: 'bld-noida-303',
        category: 'FOOTPRINT_EXPANSION',
        baselineYear: 2020,
        currentYear: 2026,
        baselineAreaSqm: 1050.0,
        currentAreaSqm: 1420.0,
        areaDeltaSqm: 370.0,
        percentageChange: 35.2,
        detectionMethod: 'AI_CV_CHANGE_DETECTION',
        aiConfidence: 0.93,
        description: 'Lateral building expansion of 370.0 m² over designated internal fire-tender lane.',
        detectedAt: '2026-02-12T14:00:00Z'
      }
    ],
    violations: [
      {
        id: 'vio-noi-1',
        buildingId: 'bld-noida-303',
        violationType: 'Possible Unauthorized Expansion over Fire Safety Corridor',
        severity: 'CRITICAL',
        description: '35.2% footprint extension obstructs mandated 6-meter peripheral fire vehicle driveway.',
        evidence: [
          'Baseline 2020 footprint: 1050.0 m²',
          'Current 2026 footprint: 1420.0 m² (+370.0 m²)',
          'Driveway clearance reduced below National Building Code fire safety threshold',
          'Approval certificate: Requires official verification from Noida Authority'
        ],
        dataSource: 'BuildGuard AI Engine & Multi-Temporal Cadastral Overlay',
        aiConfidence: 0.93,
        legalDisclaimer: 'Potential violation detected — official verification required.',
        status: 'VERIFIED',
        detectionDate: '2026-02-12T14:15:00Z'
      }
    ]
  }
];

// In-memory store state
class DataStore {
  private buildings: Map<string, Building> = new Map();
  private users: Map<string, User> = new Map();
  private reports: Map<string, BuildingReport> = new Map();
  private auditLogs: Array<{
    id: string;
    userId: string;
    action: string;
    target: string;
    timestamp: string;
    details?: any;
  }> = [];

  constructor() {
    // Seed initial records
    initialBuildings.forEach(b => this.buildings.set(b.id, b));
    initialUsers.forEach(u => this.users.set(u.id, u));

    // Seed one report
    const r1: BuildingReport = {
      id: 'rep-arilova-2026-001',
      reportNumber: 'BG-REP-2026-0491',
      buildingId: 'bld-arilova-101',
      generatedBy: 'Inspector Anita Sharma',
      generatedAt: '2026-08-14T11:20:00Z',
      buildingSnapshot: initialBuildings[0],
      overallStatus: 'POTENTIAL_DISCREPANCY',
      executiveSummary: 'AI multi-temporal change detection flagged Plot 42, Arilova for potential unauthorized lateral expansion (+83.5 m² delta) and 2 additional unverified vertical storeys.',
      aiDetailedAssessment: 'Spectral built-up index (NDBI) between 2019 and 2026 indicates a continuous footprint growth of 50.6%. Orthophoto stereoscopy indicates G+3 levels in comparison to baseline G+1 records. Official municipal approval data remains disconnected.',
      officerRecommendation: 'Schedule mandatory on-site physical measurement by GVMC Town Planning Inspector. Request sanctioned plan copy from owner.'
    };
    this.reports.set(r1.id, r1);
  }

  // Building methods
  getAllBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }

  getBuildingById(id: string): Building | undefined {
    return this.buildings.get(id);
  }

  saveBuilding(building: Building): Building {
    this.buildings.set(building.id, building);
    return building;
  }

  findNearbyBuilding(lat: number, lng: number, thresholdDegrees = 0.00010): Building | undefined {
    for (const b of this.buildings.values()) {
      // 1. Check if the coordinate falls directly within the building footprint polygon
      const coords = b.footprint.coordinates[0] as number[][];
      if (coords && coords.length >= 3) {
        let inside = false;
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
          const xi = coords[i][0], yi = coords[i][1];
          const xj = coords[j][0], yj = coords[j][1];
          const intersect =
            yi > lat !== yj > lat &&
            lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        if (inside) return b;
      }

      // 2. Strict centroid proximity (~10-12 meters)
      const dLat = Math.abs(b.lat - lat);
      const dLng = Math.abs(b.lng - lng);
      if (dLat <= thresholdDegrees && dLng <= thresholdDegrees) {
        return b;
      }
    }
    return undefined;
  }

  // Violation verification
  updateViolationStatus(
    violationId: string, 
    newStatus: Building['violations'][0]['status'],
    officer: User,
    fieldNotes: string,
    actionTaken: string
  ): { building: Building; violation: PotentialViolation } | null {
    for (const building of this.buildings.values()) {
      const vio = building.violations.find(v => v.id === violationId);
      if (vio) {
        vio.status = newStatus;
        vio.lastUpdated = new Date().toISOString();
        building.lastInspectedAt = new Date().toISOString();

        this.logAudit(officer.id, `VERIFY_VIOLATION_${actionTaken}`, `violation:${violationId}`, {
          newStatus,
          fieldNotes,
          officer: officer.fullName
        });

        return { building, violation: vio };
      }
    }
    return null;
  }

  // Reports
  saveReport(report: BuildingReport): BuildingReport {
    this.reports.set(report.id, report);
    return report;
  }

  getReportById(id: string): BuildingReport | undefined {
    return this.reports.get(id);
  }

  getAllReports(): BuildingReport[] {
    return Array.from(this.reports.values()).sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  // Audit
  logAudit(userId: string, action: string, target: string, details?: any) {
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      action,
      target,
      timestamp: new Date().toISOString(),
      details
    });
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
  }

  getAuditLogs() {
    return this.auditLogs;
  }
}

export const dataStore = new DataStore();
