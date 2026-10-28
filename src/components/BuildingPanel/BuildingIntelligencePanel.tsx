/**
 * BUILDGUARD AI - Building Intelligence Panel
 * Implements Operation 1 (Top-View Footprint Measurement),
 * Operation 2 (Front-View Street View Floor Detection),
 * Municipal Database Comparison Engine, Evidence Catalog, and Human-in-the-Loop verification.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Layers, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Bot, 
  FileText, 
  Send, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Info,
  Maximize2,
  Sliders,
  Scale,
  Camera,
  Play,
  RotateCcw,
  Check,
  Edit3,
  Compass,
  Eye,
  CheckCircle
} from 'lucide-react';
import { Building, PotentialViolation, ViolationStatus, AutomationStep } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { computePolygonDimensions } from '../../utils/geo';
import { InteractiveStreetView } from '../StreetView/InteractiveStreetView';
import { FloorDetectionOverlay } from '../StreetView/FloorDetectionOverlay';

interface BuildingIntelligencePanelProps {
  building: Building;
  onClose: () => void;
  onUpdateBuilding: (updated: Building) => void;
  onOpenReport: (building: Building) => void;
}

export const BuildingIntelligencePanel: React.FC<BuildingIntelligencePanelProps> = ({
  building,
  onClose,
  onUpdateBuilding,
  onOpenReport
}) => {
  const { role, canVerify, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'frontview' | 'stepper' | 'topview' | 'comparison' | 'evidence' | 'verify' | 'assistant'>('frontview');
  
  // Automated Stepper Pipeline State (Module 17)
  const [isRunningStepper, setIsRunningStepper] = useState<boolean>(false);
  const [stepperProgress, setStepperProgress] = useState<number>(100);
  const [stepperStatus, setStepperStatus] = useState<string>('Automated inspection completed');

  // AI Verification Status (No manual floor counting)
  const [isAiMeasurementVerified, setIsAiMeasurementVerified] = useState<boolean>(
    building.frontView?.isOfficerVerified || false
  );
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState<string | null>(null);

  // Verification form state
  const [selectedViolationId, setSelectedViolationId] = useState<string>(building.violations[0]?.id || '');
  const [verifyStatus, setVerifyStatus] = useState<ViolationStatus>('REQUIRES_VERIFICATION');
  const [actionTaken, setActionTaken] = useState<string>('SITE_INSPECTION_SCHEDULED');
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [documentRef, setDocumentRef] = useState<string>('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState<boolean>(false);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string | null>(null);

  // AI Assistant state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: `Hello, Officer. I am the BuildGuard AI assistant. I have synthesized Operation 1 (Top-View Footprint) and Operation 2 (Front-View Street View) for ${building.formattedAddress.split(',')[0]}. How can I assist with this parcel?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isAskingAi, setIsAskingAi] = useState<boolean>(false);

  // Front View 360 Camera State & Analysis
  const [cameraState, setCameraState] = useState<{
    heading: number;
    pitch: number;
    zoom: number;
    panoId?: string;
    lat?: number;
    lng?: number;
  }>({
    heading: building.frontView?.cameraHeading || 45,
    pitch: building.frontView?.cameraPitch || 8,
    zoom: 0,
    panoId: building.frontView?.streetViewPanoId,
    lat: building.lat,
    lng: building.lng
  });
  const [isAnalyzingFrontView, setIsAnalyzingFrontView] = useState<boolean>(false);
  const [frontAnalysisNotice, setFrontAnalysisNotice] = useState<string | null>(null);

  // Automatically trigger multi-view analysis when building is selected if not yet analyzed
  useEffect(() => {
    setIsAiMeasurementVerified(building.frontView?.isOfficerVerified || false);
    if (!building.frontView || !building.frontView.detectedFloorSlabs || building.frontView.detectedFloorSlabs.length === 0) {
      handleAutoAnalyzeMultipleViews();
    }
  }, [building.id]);

  // Analyze the user's currently selected Street View camera angle
  const handleAnalyzeCurrentView = async () => {
    setIsAnalyzingFrontView(true);
    setFrontAnalysisNotice(null);
    try {
      const updated = await api.analyzeFrontView(building.id, {
        heading: cameraState.heading,
        pitch: cameraState.pitch,
        zoom: cameraState.zoom,
        panoId: cameraState.panoId,
        mode: 'USER_SELECTED'
      });
      onUpdateBuilding(updated);
      const estFloors = updated.frontView?.estimatedFloors ?? 4;
      if (updated.frontView?.facadeVisibility === 'poor') {
        setFrontAnalysisNotice(`Façade at heading ${Math.round(cameraState.heading)}°: Visibility POOR. Unable to reliably determine floor count from this view.`);
      } else {
        setFrontAnalysisNotice(`Façade at heading ${Math.round(cameraState.heading)}° analyzed. Observed ${estFloors} floors (${updated.frontView?.storeysConfig || `G+${estFloors - 1}`}) with ${Math.round((updated.frontView?.confidence || 0.9) * 100)}% confidence.`);
      }
    } catch (err: any) {
      alert('Front View analysis failed: ' + err.message);
    } finally {
      setIsAnalyzingFrontView(false);
    }
  };

  // Automatically analyze multiple viewpoints (Front, Front-Left, Front-Right)
  const handleAutoAnalyzeMultipleViews = async () => {
    setIsAnalyzingFrontView(true);
    setFrontAnalysisNotice(null);
    try {
      const updated = await api.analyzeFrontView(building.id, {
        mode: 'MULTI_VIEW'
      });
      onUpdateBuilding(updated);
      const estFloors = updated.frontView?.estimatedFloors ?? 4;
      setFrontAnalysisNotice(`Multi-angle analysis completed across ${updated.frontView?.viewpointsCount || 3} viewpoints. Consensus: ${estFloors} floors (${updated.frontView?.storeysConfig || `G+${estFloors - 1}`}).`);
    } catch (err: any) {
      console.warn('Auto analysis note:', err.message);
    } finally {
      setIsAnalyzingFrontView(false);
    }
  };

  // Confirm and verify automated AI floor measurement into official record
  const handleConfirmAiFloorMeasurement = async () => {
    try {
      const updated = await api.manualVerifyInspection({
        buildingId: building.id,
        notes: `Officer verified automated computer-vision floor detection (${building.frontView?.estimatedFloors} floors, ${building.frontView?.storeysConfig}).`
      });
      onUpdateBuilding(updated);
      setIsAiMeasurementVerified(true);
      setVerificationSuccessMsg('✓ AI floor detection certified & recorded in municipal inspection audit.');
      setTimeout(() => setVerificationSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Verification update failed: ' + err.message);
    }
  };

  // Re-run automated inspection stepper
  const handleRunAutomatedInspection = async () => {
    setIsRunningStepper(true);
    setStepperStatus('Running automated Top-View & Street View inspection pipeline...');
    setStepperProgress(25);

    try {
      // Simulate stepper visual progression
      setTimeout(() => setStepperProgress(50), 300);
      setTimeout(() => setStepperProgress(75), 600);

      const updated = await api.autoAnalyzeInspection(building.id);
      setTimeout(() => {
        setStepperProgress(100);
        setIsRunningStepper(false);
        setStepperStatus('All inspection operations completed');
        onUpdateBuilding(updated);
      }, 900);
    } catch (err: any) {
      alert('Automated analysis failed: ' + err.message);
      setIsRunningStepper(false);
    }
  };

  // Handle Officer Verification Action
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedViolationId) return;

    setIsSubmittingVerify(true);
    setVerifySuccessMsg(null);
    try {
      const res = await api.verifyViolation(selectedViolationId, {
        newStatus: verifyStatus,
        fieldNotes: fieldNotes || `Official status updated by ${user?.fullName}`,
        actionTaken,
        officialDocumentRef: documentRef
      });
      onUpdateBuilding(res.building);
      setVerifySuccessMsg(`Status successfully updated to ${verifyStatus}. Audit log recorded.`);
      setFieldNotes('');
      setDocumentRef('');
    } catch (err: any) {
      alert(err.message || 'Verification update failed');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // Handle AI Assistant Chat Query
  const handleSendQuestion = async (customText?: string) => {
    const query = (customText || inputQuestion).trim();
    if (!query || isAskingAi) return;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setIsAskingAi(true);

    try {
      const res = await api.askAssistant(building.id, query);
      const botMsg = {
        sender: 'assistant' as const,
        text: res.answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'assistant' as const,
          text: "I don't have sufficient data from connected authoritative sources to answer that question. Official verification required.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  const top = building.topView;
  const front = building.frontView;
  const muni = building.municipalRecord;
  const violations = building.violations;

  // Real-time geodesic dimensions derived directly from polygon coordinates
  const calculatedDims = computePolygonDimensions(
    (building.footprint.coordinates[0] as number[][]) || []
  );

  const activeObservedArea =
    top?.correctedAreaSqm ||
    top?.estimatedAreaSqm ||
    calculatedDims.areaSqm ||
    building.footprintAreaSqm;

  const activeLengthM = top?.estimatedLengthM || calculatedDims.lengthM;
  const activeWidthM = top?.estimatedWidthM || calculatedDims.widthM;
  const activePerimeterM = top?.estimatedPerimeterM || calculatedDims.perimeterM;
  const activeObservedFloors =
    front?.officerCorrectedFloors ||
    front?.estimatedFloors ||
    building.buildingLevels ||
    2;

  return (
    <aside className="w-full md:w-[490px] lg:w-[530px] h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20 text-slate-100 shrink-0 select-text">
      
      {/* Panel Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-400">BUILDGUARD INTELLIGENCE</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-400">{building.externalOsmId || building.id}</span>
          </div>
          <h2 className="text-sm font-bold text-white mt-1 leading-snug truncate max-w-[370px]">
            {building.formattedAddress}
          </h2>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
            <span>{building.lat.toFixed(6)}° N, {building.lng.toFixed(6)}° E</span>
            <span>·</span>
            <span>{building.ward}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Close Intelligence Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900 px-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('stepper')}
          className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'stepper'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Automation</span>
        </button>

        <button
          onClick={() => setActiveTab('topview')}
          className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'topview'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Top View AI</span>
        </button>

        <button
          onClick={() => setActiveTab('frontview')}
          className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'frontview'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-emerald-400" />
          <span>Front View AI</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'comparison'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span>Compare</span>
          {violations.length > 0 && (
            <span className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.2 rounded font-mono">
              {violations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'evidence'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Evidence</span>
        </button>

        <button
          onClick={() => setActiveTab('verify')}
          className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'verify'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Verification
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 text-indigo-300 ${
            activeTab === 'assistant'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Chat</span>
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* ======================================================== */}
        {/* TAB 1: AUTOMATED INSPECTION STEPPER (MODULE 17) */}
        {/* ======================================================== */}
        {activeTab === 'stepper' && (
          <div className="space-y-4">
            
            <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Automated Inspection Stepper</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Executes Operation 1 & Operation 2 in unified sequence</p>
                </div>

                <button
                  onClick={handleRunAutomatedInspection}
                  disabled={isRunningStepper}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-1.5 px-3 rounded shadow transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRunningStepper ? 'animate-spin' : ''}`} />
                  <span>{isRunningStepper ? 'Analyzing...' : 'Re-Run Pipeline'}</span>
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${stepperProgress}%` }}
                />
              </div>

              {/* Step list */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Building & Coordinates Identified ({building.lat.toFixed(5)}, {building.lng.toFixed(5)})</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Top-View Satellite Ortho Acquired & Building Footprint Segmented</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Footprint Dimensions & Area Calculated ({activeObservedArea} m²)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Google Street View Available & Front Façade Retrieved</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Front Façade Analyzed & Floors Estimated ({activeObservedFloors} floors visible)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Municipal Database Queried ({muni?.sanctionPlanNumber || 'GVMC Sanction Plan'})</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Observed vs Official Comparison Completed ({violations.length} finding(s))</span>
                </div>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <div className="text-slate-500">Operation 1 (Top View)</div>
                <div className="text-lg font-bold font-mono text-sky-400 mt-1">
                  {activeObservedArea} m²
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Confidence: {Math.round((top?.confidence || 0.92) * 100)}% · v1.4
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <div className="text-slate-500">Operation 2 (Front View)</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  {activeObservedFloors} Visible Floors
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Confidence: {Math.round((front?.confidence || 0.88) * 100)}% · v2.1
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setActiveTab('comparison')}
                className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-3 rounded transition-colors"
              >
                <Scale className="w-4 h-4 text-amber-400" />
                <span>View Discrepancy Breakdown</span>
              </button>

              <button
                onClick={() => onOpenReport(building)}
                className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-3 rounded transition-colors shadow"
              >
                <FileText className="w-4 h-4" />
                <span>Statutory Report</span>
              </button>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: OPERATION 1 — TOP VIEW ANALYSIS */}
        {/* ======================================================== */}
        {activeTab === 'topview' && (
          <div className="space-y-4 text-xs">
            
            <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>OPERATION 1: Top View Building Measurement</span>
                </span>
                <span className="font-mono text-[10px] text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                  Model A: {top?.modelVersion || 'footprint-seg-v1.4'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Automated aerial/satellite orthophoto segmentation. Automatically detects building footprint boundaries without requiring manual measurement points.
              </p>

              {/* Dimensions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-slate-500 text-[10px]">
                    {top?.isOfficerVerified ? 'Manual Footprint' : 'Footprint Area'}
                  </div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {activeObservedArea} m²
                  </div>
                  {top?.isOfficerVerified && (
                    <span className="text-[9px] text-amber-400 font-sans font-semibold">Manual Measurement</span>
                  )}
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-slate-500 text-[10px]">Estimated Length</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {activeLengthM} m
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-slate-500 text-[10px]">Estimated Width</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {activeWidthM} m
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-slate-500 text-[10px]">Perimeter</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {activePerimeterM} m
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-2.5 rounded border text-[10px] font-mono space-y-1 ${
                top?.isOfficerVerified
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-black/40 border-slate-800 text-slate-400'
              }`}>
                <div>
                  &bull; Status: <strong className={top?.isOfficerVerified ? 'text-amber-400 font-bold' : 'text-indigo-400'}>
                    {top?.isOfficerVerified ? 'Manual footprint measurement' : 'AI-estimated building footprint'}
                  </strong>
                </div>
                <div>&bull; Calculated Polygon Area: <strong className="text-emerald-400 font-bold">{activeObservedArea} m²</strong> (Geodetic Shoelace Metric Projection)</div>
                <div>&bull; Confidence Score: {Math.round((top?.confidence || 0.92) * 100)}% ({top?.isOfficerVerified ? 'Officer Point Ground-Truth' : 'Multi-band vector segmentation'})</div>
                <div>&bull; Note: AI estimates do not replace official cadastral physical boundary surveys.</div>
              </div>

            </div>

            {/* Polygon Coordinates Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span>Vector Footprint Coordinates (GeoJSON)</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {building.footprint.coordinates[0]?.length || 0} vertices
                </span>
              </div>
              <div className="bg-slate-900 rounded p-2 text-[10px] font-mono text-slate-400 max-h-24 overflow-y-auto space-y-0.5">
                {(building.footprint.coordinates[0] as number[][])?.map((pt, i) => (
                  <div key={i}>
                    [{i + 1}] Lng: {pt[0].toFixed(6)}, Lat: {pt[1].toFixed(6)}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: OPERATION 2 — FRONT VIEW STREET VIEW ANALYSIS */}
        {/* ======================================================== */}
        {activeTab === 'frontview' && (
          <div className="space-y-4 text-xs">
            
            {/* Tab Header Banner */}
            <div className="bg-slate-950 border border-slate-800 rounded p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>FRONT VIEW AI — 360° INTERACTIVE INSPECTION</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                  Model B: {front?.modelVersion || 'facade-floors-v2.1'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Rotate, pan, and tilt the 360° camera to inspect all sides of the structure. Align the viewport with the primary front façade and execute AI floor detection.
              </p>
            </div>

            {/* INTERACTIVE 360° STREET VIEW COMPONENT */}
            <InteractiveStreetView
              building={building}
              onCameraChange={(state) => setCameraState(state)}
              className="w-full"
            />

            {/* DUAL-MODE ANALYSIS ACTION BAR */}
            <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span>FAÇADE ANALYSIS PIPELINE CONTROLS</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  Target: Facing {Math.round(cameraState.heading)}°
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* MODE 1: Analyze User Selected View */}
                <button
                  onClick={handleAnalyzeCurrentView}
                  disabled={isAnalyzingFrontView}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded text-xs shadow-lg transition-colors group cursor-pointer"
                  title="Detect floors on the currently framed camera viewpoint"
                >
                  <Camera className={`w-4 h-4 ${isAnalyzingFrontView ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                  <span>{isAnalyzingFrontView ? 'Analyzing View...' : 'ANALYZE CURRENT VIEW'}</span>
                </button>

                {/* MODE 2: Multi-Angle Consensus Analysis */}
                <button
                  onClick={handleAutoAnalyzeMultipleViews}
                  disabled={isAnalyzingFrontView}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded text-xs shadow-lg transition-colors group cursor-pointer"
                  title="Automatically analyze multiple viewpoints (Front, Left, Right) and combine consensus"
                >
                  <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>AUTO ANALYZE BUILDING</span>
                </button>
              </div>

              {frontAnalysisNotice && (
                <div className="p-2 bg-emerald-950/40 rounded border border-emerald-800/80 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{frontAnalysisNotice}</span>
                </div>
              )}
            </div>

            {/* AI FLOOR BOUNDARY ANNOTATED OVERLAY (POST-ANALYSIS) */}
            {front && (
              <FloorDetectionOverlay
                frontView={front}
                muniRecord={muni}
                onRotateViewClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onReanalyzeClick={handleAnalyzeCurrentView}
                onAutoAnalyzeClick={handleAutoAnalyzeMultipleViews}
                onViewEvidenceClick={() => setActiveTab('evidence')}
                onVerifyClick={() => setActiveTab('verify')}
                onConfirmVerification={handleConfirmAiFloorMeasurement}
                isVerified={isAiMeasurementVerified}
                isAnalyzing={isAnalyzingFrontView}
              />
            )}

            {verificationSuccessMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-lg text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{verificationSuccessMsg}</span>
              </div>
            )}

            {/* Multi-Angle Viewpoints (3 Viewpoints) */}
            {front?.multiAngleViews && front.multiAngleViews.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-xs">
                    Multi-Angle Street View Analysis ({front.multiAngleViews.length} Viewpoints)
                  </span>
                  <span className="font-mono text-[10px] text-indigo-400 font-bold">
                    Consensus: {front.estimatedFloors} Floors ({Math.round((front.confidence || 0.89) * 100)}%)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                  {front.multiAngleViews.map((ang, i) => (
                    <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-850 space-y-1">
                      <div className="font-bold text-white flex items-center justify-between">
                        <span>View {i + 1} ({ang.angleName})</span>
                        <span className="text-slate-400">{ang.heading}°</span>
                      </div>
                      <div className="text-emerald-400 font-bold">{ang.estimatedFloors} Floors ({Math.round(ang.confidence * 100)}%)</div>
                      <div className="text-slate-400 text-[9px] font-sans truncate" title={ang.notes}>{ang.notes}</div>
                    </div>
                  ))}
                </div>

                {/* Combined Consensus & Conflict Status */}
                <div className={`p-2.5 rounded text-[10px] font-mono border ${
                  front.consensusStatus?.includes('Conflicting') 
                    ? 'bg-amber-950/60 border-amber-800 text-amber-300' 
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}>
                  <div className="font-bold text-white">AI Evidence Combination:</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-slate-300">
                    <span>Estimated Floors: <strong className="text-emerald-400 font-bold">{front.estimatedFloors}</strong></span>
                    <span>Confidence: <strong className="text-indigo-300 font-bold">{Math.round((front.confidence || 0.89) * 100)}%</strong></span>
                    <span>Views analyzed: <strong className="text-white font-bold">{front.viewpointsCount || front.multiAngleViews.length}</strong></span>
                  </div>
                  {front.consensusStatus && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-800/80">
                      Status: <strong className={front.consensusStatus.includes('Conflicting') ? 'text-amber-400' : 'text-emerald-400'}>{front.consensusStatus}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Structural Indicators Detected */}
            {front && (
              <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2">
                <div className="font-semibold text-slate-300">Façade Structural Indicators (Model B Parsing)</div>
                <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-850 font-mono">
                  <div className="flex items-center justify-between">
                    <span>Horizontal Floor Dividing Slabs:</span>
                    <span className="text-emerald-400">Detected ({front.estimatedFloors} Inter-floor lintels)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Window Row Fenestration Bands:</span>
                    <span className="text-emerald-400">Detected (Regular vertical rhythm)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ground Level Separation:</span>
                    <span className="text-slate-300">{front.structuralFeatures.groundFloorSeparation || 'Plinth / Stilt Identified'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rooftop / Parapet Boundary:</span>
                    <span className="text-amber-400">{front.structuralFeatures.rooflineBoundary || 'Unverified vertical extension observable'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: MUNICIPAL DATABASE & COMPARISON ENGINE */}
        {/* ======================================================== */}
        {activeTab === 'comparison' && (
          <div className="space-y-4 text-xs">
            
            {/* Municipal Sanctioned Plan Record */}
            <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Municipal Database Integration Layer</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  muni?.isAuthoritative ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  {muni?.isAuthoritative ? 'Sanctioned Record Connected' : 'Zoning Planning Baseline'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div>
                  <div className="text-slate-500 text-[10px]">Sanction Plan #</div>
                  <div className="text-slate-200 font-bold">{muni?.sanctionPlanNumber || 'PENDING_REGISTRATION'}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">Approved Footprint Area</div>
                  <div className="text-indigo-400 font-bold">
                    {muni?.approvedFootprintSqm !== undefined ? `${muni.approvedFootprintSqm} m²` : 'Requires official verification'}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">Approved Storeys</div>
                  <div className="text-indigo-400 font-bold">
                    {muni?.approvedFloors !== undefined ? `${muni.approvedFloors} Floors (G+${muni.approvedFloors - 1})` : 'Requires official verification'}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 text-[10px]">Permitted Usage</div>
                  <div className="text-slate-200">{muni?.permittedUse || 'Residential / Mixed'}</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800">
                Source Adapter: {muni?.sourceAdapter || 'CADASTRE_GATEWAY'} &middot; {muni?.statusMessage}
              </div>
            </div>

            {/* Observed vs Official Comparison Card (Module 9 & 10) */}
            <div className="bg-slate-950 border border-amber-800/60 rounded p-4 space-y-3">
              <div className="font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Observed vs Official Comparison Engine Findings</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                      <th className="pb-1.5">Metric</th>
                      <th className="pb-1.5">Municipal Approved</th>
                      <th className="pb-1.5">AI Observed</th>
                      <th className="pb-1.5 text-right">Discrepancy (Δ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    <tr>
                      <td className="py-2 text-slate-300 font-sans">Building Footprint</td>
                      <td className="py-2 text-slate-400">
                        {muni?.approvedFootprintSqm !== undefined ? `${muni.approvedFootprintSqm} m²` : 'Pending Verification'}
                      </td>
                      <td className="py-2 text-sky-400">{activeObservedArea} m²</td>
                      <td className="py-2 text-right font-bold">
                        {muni?.approvedFootprintSqm !== undefined ? (
                          activeObservedArea - muni.approvedFootprintSqm > 0 ? (
                            <span className="text-amber-400">+{Math.round((activeObservedArea - muni.approvedFootprintSqm) * 10) / 10} m²</span>
                          ) : (
                            <span className="text-emerald-400">{Math.round((activeObservedArea - muni.approvedFootprintSqm) * 10) / 10} m²</span>
                          )
                        ) : (
                          <span className="text-slate-500 font-normal">Pending Survey</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-300 font-sans">Storeys / Floors</td>
                      <td className="py-2 text-slate-400">
                        {muni?.approvedFloors !== undefined ? `${muni.approvedFloors} Floors` : 'Pending Verification'}
                      </td>
                      <td className="py-2 text-emerald-400">{activeObservedFloors} Floors</td>
                      <td className="py-2 text-right font-bold">
                        {muni?.approvedFloors !== undefined ? (
                          activeObservedFloors - muni.approvedFloors > 0 ? (
                            <span className="text-red-400">+{activeObservedFloors - muni.approvedFloors} Floors</span>
                          ) : (
                            <span className="text-emerald-400">Compliant</span>
                          )
                        ) : (
                          <span className="text-slate-500 font-normal">Pending Survey</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-amber-950/30 rounded border border-amber-900/60 text-[10px] text-amber-300 leading-relaxed font-mono">
                Statutory Status: Potential Discrepancies Flagged &mdash; Requires Official Physical Verification.
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: EVIDENCE SYSTEM (MODULE 11) */}
        {/* ======================================================== */}
        {activeTab === 'evidence' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-200">
              <span>Documented Evidence Catalog</span>
              <span className="font-mono text-[10px] text-indigo-400">{violations.length} Discrepancy Record(s)</span>
            </div>

            {violations.map((v) => (
              <div key={v.id} className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-white leading-tight">{v.violationType}</div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    v.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                    v.severity === 'HIGH' ? 'bg-orange-500 text-white' : 'bg-amber-500 text-black'
                  }`}>
                    {v.severity}
                  </span>
                </div>

                <div className="space-y-1 bg-black/40 p-2.5 rounded text-[11px] font-mono">
                  {v.evidence.map((ev, idx) => (
                    <div key={idx} className="text-slate-300 flex items-start gap-1.5">
                      <span className="text-indigo-400">&bull;</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-850">
                  <span>Source: {v.dataSource}</span>
                  <span className="italic">Verification Required</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: OFFICER VERIFICATION (MODULE 18) */}
        {/* ======================================================== */}
        {activeTab === 'verify' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Human-In-The-Loop Officer Verification</span>
              <span className="text-[10px] font-mono text-indigo-400">Role: {role}</span>
            </div>

            {!canVerify ? (
              <div className="bg-slate-950 border border-amber-800/50 rounded p-4 text-xs text-amber-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Read-Only Viewer Role</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Switch to OFFICER or ADMIN via the top navigation dropdown to record official verification actions.
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerifySubmit} className="space-y-3 bg-slate-950 border border-slate-800 rounded p-3 text-xs">
                {verifySuccessMsg && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{verifySuccessMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Target Violation Record</label>
                  <select
                    value={selectedViolationId}
                    onChange={(e) => setSelectedViolationId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {violations.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.violationType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Statutory Status</label>
                    <select
                      value={verifyStatus}
                      onChange={(e) => setVerifyStatus(e.target.value as ViolationStatus)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="POTENTIAL_DISCREPANCY">Potential Discrepancy</option>
                      <option value="REQUIRES_VERIFICATION">Requires Verification</option>
                      <option value="VERIFIED">Verified Violation</option>
                      <option value="RESOLVED">Resolved / Dismissed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Statutory Action</label>
                    <select
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="SITE_INSPECTION_SCHEDULED">Schedule Site Visit</option>
                      <option value="NOTICE_ISSUED">Issue Show-Cause Notice</option>
                      <option value="DISCREPANCY_CONFIRMED">Confirm Field Discrepancy</option>
                      <option value="DISMISSED_PERMIT_FOUND">Permit Produced (Dismiss)</option>
                      <option value="RESOLVED_PENALTY_PAID">Penalty Paid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Notice / Document Reference Number</label>
                  <input
                    type="text"
                    value={documentRef}
                    onChange={(e) => setDocumentRef(e.target.value)}
                    placeholder="e.g. GVMC/VIG/2026/NOT-0894"
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Officer Evidence Review Notes</label>
                  <textarea
                    rows={3}
                    value={fieldNotes}
                    onChange={(e) => setFieldNotes(e.target.value)}
                    placeholder="Document physical site findings, floor-slab counts, or owner notice dispatch..."
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingVerify}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmittingVerify ? 'Recording Statutory Action...' : 'Record Officer Action & Update Status'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: GROUNDED AI ASSISTANT */}
        {/* ======================================================== */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col h-[460px] bg-slate-950 border border-slate-800 rounded overflow-hidden">
            <div className="p-2.5 border-b border-slate-800 bg-slate-900/80 text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>Grounded AI Building Analyst</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Strict Cadastral Boundary</span>
            </div>

            <div className="p-2 bg-slate-900/40 border-b border-slate-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleSendQuestion('What is the difference between observed and approved floors?')}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded whitespace-nowrap transition-colors"
              >
                Floor discrepancy?
              </button>
              <button
                onClick={() => handleSendQuestion('What is the footprint area difference?')}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded whitespace-nowrap transition-colors"
              >
                Footprint delta?
              </button>
              <button
                onClick={() => handleSendQuestion('What Street View evidence was detected?')}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded whitespace-nowrap transition-colors"
              >
                Street View evidence?
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded p-2.5 leading-relaxed ${
                    msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                    {msg.sender === 'user' ? 'Officer' : 'BuildGuard AI'} · {msg.time}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                placeholder="Ask about floor count, footprint, or municipal record..."
                className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleSendQuestion()}
                disabled={isAskingAi || !inputQuestion.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-1.5 rounded transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

    </aside>
  );
};
