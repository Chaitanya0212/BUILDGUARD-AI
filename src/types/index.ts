/**
 * BUILDGUARD AI - Core Type Definitions
 * Automated Building Inspection & Municipal Violation Detection System
 */

export type UserRole = 'ADMIN' | 'OFFICER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  badgeNumber: string;
}

export type DataSourceType = 
  | 'AUTHORITATIVE_MUNICIPAL'
  | 'GOOGLE_MAPS_PLATFORM'
  | 'STREET_VIEW'
  | 'SATELLITE_IMAGERY'
  | 'OPENSTREETMAP'
  | 'AI_ANALYSIS'
  | 'USER_DEMO';

export type DataSourceStatus = 
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'DEGRADED'
  | 'REQUIRES_VERIFICATION';

export interface DataSourceInfo {
  id: string;
  sourceCode: string;
  name: string;
  type: DataSourceType;
  status: DataSourceStatus;
  statusMessage: string;
  confidence: number;
  lastSync?: string;
  disclaimer: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BuildingFootprint {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][]; // GeoJSON format [lng, lat]
}

export interface BuildingObservation {
  id: string;
  buildingId: string;
  year: number;
  date: string;
  type: 'BASELINE_FOOTPRINT' | 'SATELLITE_DETECTION' | 'REGISTERED_PERMIT' | 'FIELD_SURVEY' | 'CURRENT_OBSERVATION';
  sourceLabel: string;
  footprintSqm: number | null;
  detectedLevels: number | null;
  satelliteProvider?: string;
  spectralIndexBuiltUp?: number; // e.g. NDBI
  notes: string;
}

export type ChangeCategory = 
  | 'FOOTPRINT_EXPANSION'
  | 'NEW_CONSTRUCTION'
  | 'DEMOLITION'
  | 'HEIGHT_INCREASE'
  | 'SETBACK_ENCROACHMENT'
  | 'NO_SIGNIFICANT_CHANGE';

export interface DetectedChange {
  id: string;
  buildingId: string;
  category: ChangeCategory;
  baselineYear: number;
  currentYear: number;
  baselineAreaSqm: number;
  currentAreaSqm: number;
  areaDeltaSqm: number;
  percentageChange: number;
  detectionMethod: 'AI_CV_CHANGE_DETECTION' | 'VECTOR_INTERSECTION' | 'SPECTRAL_INDEX_DIFF';
  aiConfidence: number;
  description: string;
  detectedAt: string;
  changePolygon?: BuildingFootprint;
}

export type ViolationStatus = 
  | 'NO_POTENTIAL_DISCREPANCY_DETECTED'
  | 'POTENTIAL_DISCREPANCY'
  | 'REQUIRES_VERIFICATION'
  | 'VERIFIED'
  | 'RESOLVED';

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PotentialViolation {
  id: string;
  buildingId: string;
  violationType: string;
  severity: ViolationSeverity;
  description: string;
  evidence: string[];
  dataSource: string;
  aiConfidence: number;
  legalDisclaimer: string;
  status: ViolationStatus;
  detectionDate: string;
  lastUpdated?: string;
}

export interface VerificationRecord {
  id: string;
  violationId: string;
  buildingId: string;
  officerId: string;
  officerName: string;
  actionTaken: 'SITE_INSPECTION_SCHEDULED' | 'NOTICE_ISSUED' | 'DISCREPANCY_CONFIRMED' | 'DISMISSED_PERMIT_FOUND' | 'RESOLVED_PENALTY_PAID';
  fieldNotes: string;
  officialDocumentRef?: string;
  siteVisitDate?: string;
  newStatus: ViolationStatus;
  createdAt: string;
}

/**
 * OPERATION 1: Top View Building Measurement
 */
export interface TopViewMeasurement {
  aiFootprint: BuildingFootprint;
  officerCorrectedFootprint?: BuildingFootprint;
  estimatedAreaSqm: number;
  correctedAreaSqm?: number;
  estimatedLengthM: number;
  estimatedWidthM: number;
  estimatedPerimeterM: number;
  confidence: number;
  modelVersion: string; // e.g. "footprint-seg-v1.4"
  isOfficerVerified: boolean;
  isManualMeasurement?: boolean;
  measurementNotes?: string;
  detectedAt: string;
}

/**
 * OPERATION 2: Front View Floor Detection
 */
export interface FrontViewMeasurement {
  hasStreetView: boolean;
  streetViewPanoId?: string;
  cameraHeading?: number;
  cameraPitch?: number;
  cameraFov?: number;
  streetViewStaticUrl?: string;
  estimatedFloors: number;
  officerCorrectedFloors?: number;
  confidence: number;
  modelVersion: string; // e.g. "facade-cv-v3.0"
  viewpointsCount: number;
  consensusStatus?: string; // e.g. "Consensus Verified" or "Conflicting observations — manual verification required."
  storeysConfig?: string; // e.g. "G+3" or "Ground Floor (G)"
  facadeVisibility?: 'good' | 'partial' | 'poor';
  facadeQualityStatus?: string;
  diagnostics?: string[];
  cvMetrics?: {
    meanSpacingPx: number;
    spacingVariance: number;
    dominantFrequencyHz: number;
  };
  multiAngleViews: Array<{
    angleName: 'Front' | 'Front-Left' | 'Front-Right';
    heading: number;
    estimatedFloors: number;
    confidence: number;
    imageUrl?: string;
    notes: string;
  }>;
  structuralFeatures: {
    horizontalSlabsDetected: boolean;
    windowRowsDetected: boolean;
    balconiesDetected: boolean;
    groundFloorSeparation: string;
    rooflineBoundary: string;
    interFloorHeightConsistency?: number;
  };
  detectedFloorSlabs?: Array<{
    floorNumber: number;
    label: string;
    relativeY: number;
    confidence: number;
  }>;
  analyzedViewLabel?: string;
  analysisMode?: 'USER_SELECTED' | 'MULTI_VIEW';
  userSelectedHeading?: number;
  userSelectedPitch?: number;
  userSelectedZoom?: number;
  isOfficerVerified: boolean;
  detectedAt: string;
}

/**
 * Municipal Sanctioned Information
 */
export interface MunicipalRecord {
  sanctionPlanNumber: string;
  approvedFloors: number;
  approvedFootprintSqm: number;
  approvedTotalAreaSqm: number;
  permittedUse: string; // "Residential", "Commercial", "Mixed-Use"
  propertyTaxId?: string;
  approvalDate?: string;
  isAuthoritative: boolean;
  statusMessage: string;
  sourceAdapter: 'POSTGRES_CADASTRE' | 'MUNICIPAL_ERP_API' | 'DISCONNECTED_FALLBACK' | 'ZONING_BYLAW_BASELINE';
}

/**
 * Full Building Intelligence Entity
 */
export interface Building {
  id: string;
  externalOsmId?: string;
  propertyTaxId?: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  footprintAreaSqm: number;
  footprint: BuildingFootprint;
  buildingType: string | null; // e.g. "residential", or null = "Not available"
  buildingLevels: number | null; // e.g. 3, or null = "Not available"
  ward: string;
  zone: string;
  administrativeArea: string;
  officialDataStatus: string;
  dataConfidence: number;
  lastInspectedAt?: string;
  observations: BuildingObservation[];
  detectedChanges: DetectedChange[];
  violations: PotentialViolation[];
  dataSources: DataSourceInfo[];
  
  // Automated Operations
  topView?: TopViewMeasurement;
  frontView?: FrontViewMeasurement;
  municipalRecord?: MunicipalRecord;
}

export interface AutomationStep {
  id: number;
  title: string;
  status: 'idle' | 'running' | 'completed' | 'warning' | 'error';
  detail?: string;
}

export interface BuildingReport {
  id: string;
  reportNumber: string;
  buildingId: string;
  generatedBy: string;
  generatedAt: string;
  buildingSnapshot: Building;
  overallStatus: ViolationStatus;
  executiveSummary: string;
  aiDetailedAssessment: string;
  officerRecommendation: string;
  topViewSummary?: string;
  frontViewSummary?: string;
  municipalComparisonSummary?: string;
}

export interface SearchResultLocation {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  boundingBox?: [number, number, number, number];
}

export interface DashboardStats {
  totalAnalyzed: number;
  potentialDiscrepancies: number;
  verifiedCases: number;
  casesRequiringVerification: number;
  resolvedCases: number;
  totalAreaCoveredSqKm: number;
  recentInspections: Array<{
    buildingId: string;
    address: string;
    officer: string;
    action: string;
    date: string;
    status: ViolationStatus;
  }>;
  alerts: Array<{
    id: string;
    buildingId: string;
    address: string;
    severity: ViolationSeverity;
    violationType: string;
    date: string;
  }>;
}

/**
 * Floor Detection Model & Dataset Types
 */
export interface FloorAnnotation {
  id: string;
  image: string;
  floor_count: number;
  storeys_config: string;
  style: string;
  visibility: 'good' | 'partial' | 'poor';
  difficulties: string[];
  building_bbox: { x: number; y: number; width: number; height: number };
  floor_boundaries: number[];
  ground_level: number;
  roof_level: number;
  split: 'train' | 'validation' | 'test';
  building_id: string;
  camera_angle_deg?: number;
}

export interface FloorModelEvaluationMetrics {
  totalEvaluated: number;
  accuracyPct: number;
  meanAbsoluteError: number;
  perClassAccuracy: Record<number, { total: number; correct: number; accuracyPct: number }>;
  confusionMatrix: number[][];
  errorDistribution: {
    exactMatch: number;
    offByOne: number;
    offByTwoOrMore: number;
  };
  trainedAt: string;
  datasetCounts: {
    train: number;
    validation: number;
    test: number;
  };
}

