/**
 * BUILDGUARD AI - Client API Service
 */

import { Building, BuildingReport, DashboardStats, PotentialViolation, SearchResultLocation, User, UserRole } from '../types/index';

const API_BASE = '/api';

export const api = {
  // Auth
  async login(email: string, role?: UserRole): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    if (!res.ok) throw new Error('Failed to login');
    return res.json();
  },

  async getCurrentUser(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Failed to get current user');
    return res.json();
  },

  async switchRole(role: UserRole): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error('Failed to switch role');
    return res.json();
  },

  // Geospatial Search & Lookup
  async searchLocation(query: string): Promise<SearchResultLocation[]> {
    const res = await fetch(`${API_BASE}/buildings/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  },

  async lookupBuildingByCoords(lat: number, lng: number): Promise<Building> {
    const res = await fetch(`${API_BASE}/buildings/lookup?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error('Failed to lookup building');
    return res.json();
  },

  async getAllBuildings(): Promise<Building[]> {
    const res = await fetch(`${API_BASE}/buildings`);
    if (!res.ok) throw new Error('Failed to fetch buildings');
    return res.json();
  },

  async getBuildingById(id: string): Promise<Building> {
    const res = await fetch(`${API_BASE}/buildings/${id}`);
    if (!res.ok) throw new Error('Failed to fetch building');
    return res.json();
  },

  async analyzeBuilding(id: string): Promise<{ building: Building; assessmentSummary: string; suggestedViolations: PotentialViolation[] }> {
    const res = await fetch(`${API_BASE}/buildings/${id}/analyze`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to analyze building');
    return res.json();
  },

  // Automated Inspection Stepper Pipeline (Operation 1 + Operation 2 + Municipal Compare)
  async autoAnalyzeInspection(buildingId: string): Promise<Building> {
    const res = await fetch(`${API_BASE}/inspection/auto-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to execute automated inspection');
    }
    return res.json();
  },

  // Street View Metadata lookup
  async getStreetViewMetadata(lat: number, lng: number): Promise<{
    available: boolean;
    panoId?: string;
    panoLat?: number;
    panoLng?: number;
    date?: string;
    copyright?: string;
    initialHeading?: number;
  }> {
    const res = await fetch(`${API_BASE}/streetview/metadata?lat=${lat}&lng=${lng}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch Street View metadata');
    }
    return res.json();
  },

  // Analyze Front View (User Selected View or Multi-View)
  async analyzeFrontView(
    buildingId: string,
    params: {
      heading?: number;
      pitch?: number;
      zoom?: number;
      panoId?: string;
      mode?: 'USER_SELECTED' | 'MULTI_VIEW';
    }
  ): Promise<Building> {
    const res = await fetch(`${API_BASE}/buildings/${buildingId}/analyze-front-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to analyze front view');
    }
    return res.json();
  },

  // Human-in-the-loop: Manual Verification Mode
  async manualVerifyInspection(data: { 
    buildingId: string; 
    correctedFootprint?: any; 
    correctedFloors?: number; 
    notes?: string 
  }): Promise<Building> {
    const res = await fetch(`${API_BASE}/inspection/manual-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record manual verification');
    }
    return res.json();
  },

  // Violations
  async getAllViolations(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/violations`);
    if (!res.ok) throw new Error('Failed to fetch violations');
    return res.json();
  },

  async verifyViolation(
    violationId: string, 
    data: { newStatus: string; fieldNotes: string; actionTaken: string; officialDocumentRef?: string }
  ): Promise<{ success: boolean; building: Building; violation: PotentialViolation }> {
    const res = await fetch(`${API_BASE}/violations/${violationId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to verify violation');
    }
    return res.json();
  },

  // Reports
  async getAllReports(): Promise<BuildingReport[]> {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async getReportById(id: string): Promise<BuildingReport> {
    const res = await fetch(`${API_BASE}/reports/${id}`);
    if (!res.ok) throw new Error('Failed to fetch report');
    return res.json();
  },

  async generateReport(data: { buildingId: string; recommendation?: string; executiveSummary?: string }): Promise<BuildingReport> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
  },

  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // AI Assistant
  async askAssistant(buildingId: string, question: string): Promise<{ answer: string }> {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId, question })
    });
    if (!res.ok) throw new Error('AI Assistant request failed');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) return [];
    return res.json();
  },

  // Data Sources
  async getDataSources(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/data-sources`);
    if (!res.ok) return [];
    return res.json();
  },

  // Floor AI: Dataset Manifest & Splits
  async getFloorDataset(): Promise<any> {
    const res = await fetch(`${API_BASE}/floors-ai/dataset`);
    if (!res.ok) throw new Error('Failed to fetch floor dataset');
    return res.json();
  },

  // Floor AI: Evaluation Metrics (Accuracy, MAE, Confusion Matrix)
  async getFloorModelEvaluation(): Promise<any> {
    const res = await fetch(`${API_BASE}/floors-ai/evaluation`);
    if (!res.ok) throw new Error('Failed to fetch floor model evaluation');
    return res.json();
  },

  // Floor AI: Train / Retrain Model with Augmentation
  async trainFloorModel(options: { epochs?: number; useAugmentation?: boolean } = {}): Promise<any> {
    const res = await fetch(`${API_BASE}/floors-ai/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!res.ok) throw new Error('Model training request failed');
    return res.json();
  },

  // Floor AI: Step-by-Step CV Pipeline Tester
  async testFloorCv(params: {
    floorCount?: number;
    style?: string;
    difficulties?: string[];
    visibility?: 'good' | 'partial' | 'poor';
    heading?: number;
    pitch?: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/floors-ai/test-cv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('CV test request failed');
    return res.json();
  }
};
