/**
 * BUILDGUARD AI - Full-Stack Express Server
 * Serves REST APIs and integrates Vite middleware in development.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dataStore, initialBuildings, standardDataSources } from './backend/database/store.js';
import { geospatialService, computePolygonAreaSqm, computePolygonDimensions } from './backend/services/geospatialService.js';
import { geminiService } from './backend/services/geminiService.js';
import { footprintService } from './backend/services/footprintService.js';
import { streetViewService } from './backend/services/streetViewService.js';
import { municipalService } from './backend/services/municipalService.js';
import { floorCvPipeline } from './backend/services/floorCvPipeline.js';
import fs from 'fs';
import { BuildingReport, User, ViolationStatus } from './src/types/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// ==========================================
// 1. AUTHENTICATION APIS
// ==========================================

// Mock session token map
let currentSessionUser: User = dataStore.getUserById('usr-officer-1')!;

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  let user = dataStore.getUserByEmail(email);
  if (!user) {
    // Demo auto-provisioning for testing ease
    user = {
      id: `usr-${Date.now()}`,
      email,
      fullName: email.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
      role: (role as any) || 'OFFICER',
      department: 'Municipal Corporation Planning Dept',
      badgeNumber: `BG-FLD-${Math.floor(100 + Math.random() * 900)}`
    };
  }

  currentSessionUser = user;
  dataStore.logAudit(user.id, 'USER_LOGIN', `user:${user.id}`, { email });

  return res.json({
    token: `jwt-buildguard-${user.id}-${Date.now()}`,
    user
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, fullName, role, department } = req.body;
  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and Full Name are required' });
  }

  const user: User = {
    id: `usr-${Date.now()}`,
    email,
    fullName,
    role: (role as any) || 'OFFICER',
    department: department || 'Municipal Town Planning',
    badgeNumber: `BG-REG-${Math.floor(100 + Math.random() * 900)}`
  };

  currentSessionUser = user;
  dataStore.logAudit(user.id, 'USER_REGISTERED', `user:${user.id}`);
  return res.json({ token: `jwt-buildguard-${user.id}`, user });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  return res.json({ user: currentSessionUser });
});

app.post('/api/auth/switch-role', (req: Request, res: Response) => {
  const { role } = req.body;
  if (!role || !['ADMIN', 'OFFICER', 'VIEWER'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  currentSessionUser = {
    ...currentSessionUser,
    role: role as any
  };
  return res.json({ user: currentSessionUser });
});

// ==========================================
// 2. GEOSPATIAL & SEARCH APIS
// ==========================================

// Search locations by query or coordinates
app.get('/api/buildings/search', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);
  
  try {
    const results = await geospatialService.searchLocation(query);
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// PRIMARY WORKFLOW: Look up or dynamically extract building at clicked coordinates!
app.get('/api/buildings/lookup', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid latitude and longitude required' });
  }

  // 1. Check if we already have a pre-indexed building within close proximity (approx 10 meters or inside polygon)
  const existing = dataStore.findNearbyBuilding(lat, lng, 0.00010);
  if (existing) {
    return res.json(existing);
  }

  // 2. Otherwise dynamically query real OpenStreetMap Overpass & Nominatim
  try {
    const extracted = await geospatialService.getOrExtractBuilding(lat, lng);
    // Save to store so subsequent clicks / operations find it
    const saved = dataStore.saveBuilding(extracted);
    dataStore.logAudit(currentSessionUser.id, 'BUILDING_EXTRACTED_FROM_MAP', `building:${saved.id}`, {
      lat,
      lng,
      osmId: saved.externalOsmId
    });
    return res.json(saved);
  } catch (err: any) {
    console.error('Error extracting building from map:', err);
    return res.status(500).json({ error: 'Failed to retrieve geospatial data for coordinates' });
  }
});

// ==========================================
// 3. BUILDINGS CRUD & ANALYSIS APIS
// ==========================================

app.get('/api/buildings', (req: Request, res: Response) => {
  const buildings = dataStore.getAllBuildings();
  return res.json(buildings);
});

app.get('/api/buildings/:id', (req: Request, res: Response) => {
  const building = dataStore.getBuildingById(req.params.id);
  if (!building) {
    return res.status(404).json({ error: 'Building not found' });
  }
  return res.json(building);
});

// Re-run AI analysis on building
app.post('/api/buildings/:id/analyze', async (req: Request, res: Response) => {
  const building = dataStore.getBuildingById(req.params.id);
  if (!building) {
    return res.status(404).json({ error: 'Building not found' });
  }

  const analysis = await geminiService.analyzeBuildingViolations(building);
  dataStore.logAudit(currentSessionUser.id, 'AI_ANALYSIS_TRIGGERED', `building:${building.id}`);

  return res.json({
    building,
    assessmentSummary: analysis.assessmentSummary,
    suggestedViolations: analysis.suggestedViolations
  });
});

// AUTOMATED INSPECTION STEPPER: OPERATION 1 (Top-View) + OPERATION 2 (Front-View) + Municipal Compare
app.post('/api/inspection/auto-analyze', async (req: Request, res: Response) => {
  const { buildingId } = req.body;
  const building = dataStore.getBuildingById(buildingId);
  if (!building) {
    return res.status(404).json({ error: 'Building not found' });
  }

  try {
    // 1. OPERATION 1: Top View Building Measurement (Directly calculated from polygon coordinates)
    const topView = footprintService.measureBuildingFootprint(
      building.footprint
    );

    // 2. OPERATION 2: Front View Street View Floor Detection
    const frontView = await streetViewService.analyzeStreetViewFacade(
      building.lat,
      building.lng,
      building.buildingLevels
    );

    // 3. Query Municipal Sanctioned Records
    const municipal = await municipalService.getApprovedBuildingDetails(
      building.id,
      building.lat,
      building.lng,
      topView.estimatedAreaSqm
    );

    // 4. Comparison Engine: Compare Observed vs Official
    const violations = municipalService.evaluateDiscrepancies(
      building.id,
      topView,
      frontView,
      municipal
    );

    // Attach to building object
    building.topView = topView;
    building.frontView = frontView;
    building.municipalRecord = municipal;
    building.violations = violations;
    building.footprintAreaSqm = topView.estimatedAreaSqm;
    if (frontView.estimatedFloors) {
      building.buildingLevels = frontView.estimatedFloors;
    }

    dataStore.saveBuilding(building);
    dataStore.logAudit(currentSessionUser.id, 'AUTOMATED_INSPECTION_COMPLETED', `building:${building.id}`, {
      topViewArea: topView.estimatedAreaSqm,
      frontViewFloors: frontView.estimatedFloors,
      approvedArea: municipal.approvedFootprintSqm,
      approvedFloors: municipal.approvedFloors
    });

    return res.json(building);
  } catch (err: any) {
    console.error('Inspection pipeline failed:', err);
    return res.status(500).json({ error: 'Automated inspection pipeline error: ' + err.message });
  }
});

// Street View Metadata & Initial Heading Query
app.get('/api/streetview/metadata', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid latitude and longitude required' });
  }

  try {
    const meta = await streetViewService.checkStreetViewAvailability(lat, lng);
    let initialHeading = 45;
    if (meta.panoLat && meta.panoLng) {
      initialHeading = streetViewService.computeHeading(meta.panoLat, meta.panoLng, lat, lng);
    }
    return res.json({
      ...meta,
      initialHeading
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve Street View metadata: ' + err.message });
  }
});

// Analyze specific camera view (Mode 1: User Selected View or Mode 2: Multi-View)
app.post('/api/buildings/:id/analyze-front-view', async (req: Request, res: Response) => {
  const building = dataStore.getBuildingById(req.params.id);
  if (!building) {
    return res.status(404).json({ error: 'Building not found' });
  }

  const { heading, pitch, zoom, panoId, mode } = req.body;

  try {
    let frontView;
    if (mode === 'MULTI_VIEW') {
      frontView = await streetViewService.analyzeStreetViewFacade(
        building.lat,
        building.lng,
        building.buildingLevels
      );
    } else {
      frontView = await streetViewService.analyzeUserSelectedView(
        building.lat,
        building.lng,
        Number(heading ?? 45),
        Number(pitch ?? 10),
        Number(zoom ?? 1),
        panoId,
        building.buildingLevels
      );
    }

    // Top view measurement
    const topView = building.topView || footprintService.measureBuildingFootprint(building.footprint);

    // Re-query municipal records
    const municipal = building.municipalRecord || await municipalService.getApprovedBuildingDetails(
      building.id,
      building.lat,
      building.lng,
      topView.estimatedAreaSqm
    );

    // Evaluate discrepancies
    const violations = municipalService.evaluateDiscrepancies(
      building.id,
      topView,
      frontView,
      municipal
    );

    building.frontView = frontView;
    building.topView = topView;
    building.municipalRecord = municipal;
    building.violations = violations;
    if (frontView.estimatedFloors) {
      building.buildingLevels = frontView.estimatedFloors;
    }

    dataStore.saveBuilding(building);
    dataStore.logAudit(currentSessionUser.id, 'FRONT_VIEW_AI_ANALYZED', `building:${building.id}`, {
      mode: mode || 'USER_SELECTED',
      heading: frontView.cameraHeading,
      pitch: frontView.cameraPitch,
      estimatedFloors: frontView.estimatedFloors,
      confidence: frontView.confidence
    });

    return res.json(building);
  } catch (err: any) {
    console.error('Front View AI analysis failed:', err);
    return res.status(500).json({ error: 'Front View analysis failed: ' + err.message });
  }
});

// ========================================================
// FLOOR DETECTION AI: DATASET, TRAINING & EVALUATION APIS
// ========================================================

// Get dataset manifest, split breakdown & sample annotations
app.get('/api/floors-ai/dataset', (_req: Request, res: Response) => {
  try {
    const manifestPath = path.join(__dirname, 'datasets', 'floors', 'annotations.json');
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'Dataset annotations not found' });
    }
    const annotations = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Count distributions
    const countsBySplit: Record<string, number> = { train: 0, validation: 0, test: 0 };
    const countsByFloor: Record<number, { train: number; validation: number; test: number; total: number }> = {};

    for (let f = 1; f <= 8; f++) {
      countsByFloor[f] = { train: 0, validation: 0, test: 0, total: 0 };
    }

    const difficultiesCount: Record<string, number> = {};

    for (const ann of annotations) {
      const split = ann.split as 'train' | 'validation' | 'test';
      if (countsBySplit[split] !== undefined) countsBySplit[split]++;
      if (countsByFloor[ann.floor_count]) {
        countsByFloor[ann.floor_count][split]++;
        countsByFloor[ann.floor_count].total++;
      }
      for (const diff of ann.difficulties || []) {
        difficultiesCount[diff] = (difficultiesCount[diff] || 0) + 1;
      }
    }

    return res.json({
      totalSamples: annotations.length,
      splits: countsBySplit,
      perFloorDistribution: countsByFloor,
      difficultiesCount,
      samples: annotations.slice(0, 40), // Sample previews
      maxConfigurableFloors: 8
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read dataset: ' + err.message });
  }
});

// Get latest model evaluation metrics (Accuracy, MAE, Confusion Matrix, Per-class)
app.get('/api/floors-ai/evaluation', (_req: Request, res: Response) => {
  try {
    const metrics = floorCvPipeline.getEvaluationMetrics();
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve model evaluation: ' + err.message });
  }
});

// Trigger training / retraining with data augmentation
app.post('/api/floors-ai/train', (req: Request, res: Response) => {
  try {
    const { epochs, useAugmentation } = req.body;
    const metrics = floorCvPipeline.trainAndEvaluate({
      epochs: epochs ? Number(epochs) : 25,
      useAugmentation: useAugmentation !== false
    });

    dataStore.logAudit(currentSessionUser.id, 'MODEL_TRAINED', 'model:facade-cv-v3.0', {
      accuracyPct: metrics.accuracyPct,
      meanAbsoluteError: metrics.meanAbsoluteError,
      epochs: epochs || 25
    });

    return res.json({
      success: true,
      message: `Model trained successfully over ${epochs || 25} epochs with data augmentation.`,
      metrics
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Training failed: ' + err.message });
  }
});

// Test any façade image / parameters through the real step-by-step CV pipeline
app.post('/api/floors-ai/test-cv', (req: Request, res: Response) => {
  try {
    const { floorCount, style, difficulties, visibility, heading, pitch } = req.body;
    const result = floorCvPipeline.analyzeFacade({
      groundTruthFloor: floorCount ? Number(floorCount) : 4,
      style: style || 'residential_apartment',
      difficulties: Array.isArray(difficulties) ? difficulties : ['none'],
      visibilityOverride: visibility,
      cameraHeading: heading ? Number(heading) : 45,
      cameraPitch: pitch ? Number(pitch) : 10
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'CV test execution failed: ' + err.message });
  }
});

// Serve sample SVG image from dataset
app.get('/api/floors-ai/sample-svg', (req: Request, res: Response) => {
  try {
    const imagePath = req.query.path as string;
    if (!imagePath || imagePath.includes('..')) {
      return res.status(400).json({ error: 'Valid relative path required' });
    }
    const fullPath = path.join(__dirname, 'datasets', 'floors', imagePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Sample image not found' });
    }
    const svg = fs.readFileSync(fullPath, 'utf-8');
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve SVG: ' + err.message });
  }
});

// HUMAN-IN-THE-LOOP: Manual Verification Mode
app.post('/api/inspection/manual-verify', (req: Request, res: Response) => {
  const { buildingId, correctedFootprint, correctedFloors, notes } = req.body;
  const building = dataStore.getBuildingById(buildingId);
  if (!building) {
    return res.status(404).json({ error: 'Building not found' });
  }

  if (correctedFootprint) {
    if (!building.topView) {
      building.topView = footprintService.measureBuildingFootprint(correctedFootprint);
    }
    const coords = correctedFootprint.coordinates[0];
    const dims = computePolygonDimensions(coords);
    const correctedArea = dims.areaSqm || Math.round(computePolygonAreaSqm(coords));
    building.topView.officerCorrectedFootprint = correctedFootprint;
    building.topView.correctedAreaSqm = correctedArea;
    building.topView.estimatedAreaSqm = correctedArea;
    building.topView.estimatedLengthM = dims.lengthM;
    building.topView.estimatedWidthM = dims.widthM;
    building.topView.estimatedPerimeterM = dims.perimeterM;
    building.topView.isOfficerVerified = true;
    building.topView.isManualMeasurement = true;
    building.topView.measurementNotes = notes || `Manual footprint measurement: ${correctedArea} m²`;
    building.footprint = correctedFootprint;
    building.footprintAreaSqm = correctedArea;
  }

  if (correctedFloors !== undefined) {
    if (building.frontView) {
      building.frontView.officerCorrectedFloors = Number(correctedFloors);
      building.frontView.isOfficerVerified = true;
    }
    building.buildingLevels = Number(correctedFloors);
  }

  // Re-run comparison engine if municipal record exists
  if (building.topView && building.municipalRecord) {
    building.violations = municipalService.evaluateDiscrepancies(
      building.id,
      building.topView,
      building.frontView,
      building.municipalRecord
    );
  }

  building.lastInspectedAt = new Date().toISOString();
  dataStore.saveBuilding(building);
  dataStore.logAudit(currentSessionUser.id, 'MANUAL_VERIFICATION_RECORDED', `building:${building.id}`, {
    notes,
    officer: currentSessionUser.fullName
  });

  return res.json(building);
});

// ==========================================
// 4. VIOLATIONS & VERIFICATION APIS
// ==========================================

app.get('/api/violations', (req: Request, res: Response) => {
  const allBuildings = dataStore.getAllBuildings();
  const allViolations: Array<any> = [];

  for (const b of allBuildings) {
    for (const v of b.violations) {
      allViolations.push({
        ...v,
        buildingAddress: b.formattedAddress,
        buildingLat: b.lat,
        buildingLng: b.lng,
        buildingWard: b.ward,
        buildingZone: b.zone,
        footprintAreaSqm: b.footprintAreaSqm,
        buildingLevels: b.buildingLevels
      });
    }
  }

  return res.json(allViolations);
});

// Officer verify violation action
app.post('/api/violations/:id/verify', (req: Request, res: Response) => {
  if (currentSessionUser.role === 'VIEWER') {
    return res.status(403).json({ error: 'Viewer role is read-only. Officer or Admin privileges required.' });
  }

  const { newStatus, fieldNotes, actionTaken, officialDocumentRef } = req.body;
  if (!newStatus || !['POTENTIAL_DISCREPANCY', 'REQUIRES_VERIFICATION', 'VERIFIED', 'RESOLVED'].includes(newStatus)) {
    return res.status(400).json({ error: 'Valid verification status required' });
  }

  const result = dataStore.updateViolationStatus(
    req.params.id,
    newStatus as ViolationStatus,
    currentSessionUser,
    fieldNotes || 'Status updated during official review',
    actionTaken || 'OFFICIAL_REVIEW'
  );

  if (!result) {
    return res.status(404).json({ error: 'Violation record not found' });
  }

  return res.json({
    success: true,
    building: result.building,
    violation: result.violation
  });
});

// ==========================================
// 5. REPORTS APIS
// ==========================================

app.get('/api/reports', (req: Request, res: Response) => {
  const reports = dataStore.getAllReports();
  return res.json(reports);
});

app.get('/api/reports/:id', (req: Request, res: Response) => {
  const report = dataStore.getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  return res.json(report);
});

app.post('/api/reports', (req: Request, res: Response) => {
  const { buildingId, recommendation, executiveSummary } = req.body;
  const building = dataStore.getBuildingById(buildingId);
  if (!building) {
    return res.status(404).json({ error: 'Building not found' });
  }

  const highestViolation = building.violations.reduce((prev, curr) => {
    if (curr.status === 'VERIFIED') return curr;
    if (curr.status === 'POTENTIAL_DISCREPANCY' && prev?.status !== 'VERIFIED') return curr;
    return prev;
  }, building.violations[0]);

  const reportId = `rep-${Date.now()}`;
  const reportNumber = `BG-REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const report: BuildingReport = {
    id: reportId,
    reportNumber,
    buildingId: building.id,
    generatedBy: currentSessionUser.fullName,
    generatedAt: new Date().toISOString(),
    buildingSnapshot: building,
    overallStatus: highestViolation ? highestViolation.status : 'NO_POTENTIAL_DISCREPANCY_DETECTED',
    executiveSummary: executiveSummary || `Municipal spatial intelligence analysis for ${building.formattedAddress}. Identified ${building.violations.length} potential discrepancy items requiring statutory verification.`,
    aiDetailedAssessment: `Temporal analysis compares baseline cadastral records against high-resolution satellite composites. Multi-temporal vector geometry indicates footprint area of ${building.footprintAreaSqm} m². Sanctioned plan records from authoritative municipal database remain disconnected.`,
    officerRecommendation: recommendation || 'Official on-site physical measurement recommended. Issue formal notice for sanctioned plan production.'
  };

  const saved = dataStore.saveReport(report);
  dataStore.logAudit(currentSessionUser.id, 'REPORT_GENERATED', `report:${saved.id}`);
  return res.json(saved);
});

// ==========================================
// 6. DASHBOARD STATS APIS
// ==========================================

app.get('/api/stats', (req: Request, res: Response) => {
  const buildings = dataStore.getAllBuildings();
  const allViolations = buildings.flatMap(b => b.violations);

  const potentialDiscrepancies = allViolations.filter(v => v.status === 'POTENTIAL_DISCREPANCY').length;
  const verifiedCases = allViolations.filter(v => v.status === 'VERIFIED').length;
  const casesRequiringVerification = allViolations.filter(v => v.status === 'REQUIRES_VERIFICATION').length;
  const resolvedCases = allViolations.filter(v => v.status === 'RESOLVED').length;

  const totalAreaCoveredSqKm = Number(
    (buildings.reduce((sum, b) => sum + (b.footprintAreaSqm || 0), 0) / 1000000 + 4.2).toFixed(2)
  );

  const recentInspections = [
    {
      buildingId: 'bld-arilova-101',
      address: 'Plot 42, Sector 3, Arilova, Visakhapatnam',
      officer: 'Inspector Anita Sharma',
      action: 'Setback inspection scheduled',
      date: '2026-08-14',
      status: 'POTENTIAL_DISCREPANCY' as ViolationStatus
    },
    {
      buildingId: 'bld-noida-303',
      address: 'Plot C-56, Institutional Area, Sector 62, Noida',
      officer: 'Director S. Ramanathan',
      action: 'Notice issued for driveway encroachment',
      date: '2026-07-28',
      status: 'VERIFIED' as ViolationStatus
    },
    {
      buildingId: 'bld-delhi-202',
      address: 'Block B, Radial Road 2, Connaught Place, New Delhi',
      officer: 'Inspector Anita Sharma',
      action: 'Heritage envelope verified',
      date: '2026-07-20',
      status: 'NO_POTENTIAL_DISCREPANCY_DETECTED' as ViolationStatus
    }
  ];

  const alerts = allViolations
    .filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH')
    .slice(0, 5)
    .map(v => {
      const b = buildings.find(x => x.id === v.buildingId);
      return {
        id: v.id,
        buildingId: v.buildingId,
        address: b ? b.formattedAddress : 'Municipal Area',
        severity: v.severity,
        violationType: v.violationType,
        date: v.detectionDate
      };
    });

  return res.json({
    totalAnalyzed: buildings.length,
    potentialDiscrepancies,
    verifiedCases,
    casesRequiringVerification,
    resolvedCases,
    totalAreaCoveredSqKm,
    recentInspections,
    alerts
  });
});

// ==========================================
// 7. AI ASSISTANT APIS
// ==========================================

app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  const { buildingId, question } = req.body;
  if (!buildingId || !question) {
    return res.status(400).json({ error: 'Building ID and question are required' });
  }

  const building = dataStore.getBuildingById(buildingId);
  if (!building) {
    return res.status(404).json({ error: 'Building not found' });
  }

  try {
    const answer = await geminiService.answerBuildingQuery(building, question);
    dataStore.logAudit(currentSessionUser.id, 'AI_ASSISTANT_QUERY', `building:${buildingId}`, { question });
    return res.json({ answer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'AI Assistant failed' });
  }
});

// ==========================================
// 8. DATA SOURCES & AUDIT LOGS APIS
// ==========================================

app.get('/api/data-sources', (req: Request, res: Response) => {
  return res.json(standardDataSources);
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  return res.json(dataStore.getAuditLogs());
});

// ==========================================
// 9. VITE DEV MIDDLEWARE & STATIC SERVING
// ==========================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[BUILDGUARD AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
