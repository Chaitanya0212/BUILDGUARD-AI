/**
 * BUILDGUARD AI - Municipal Executive Dashboard
 * High-density metrics, case breakdown, priority alert feed, and recent inspections.
 */

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Layers, 
  TrendingUp, 
  ShieldAlert, 
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { Building, DashboardStats } from '../../types/index';
import { api } from '../../services/api';

interface DashboardViewProps {
  onSelectBuilding: (building: Building) => void;
  onNavigateToMap: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectBuilding,
  onNavigateToMap
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats(),
      api.getAllBuildings()
    ])
      .then(([statsData, buildingsData]) => {
        setStats(statsData);
        setBuildings(buildingsData);
      })
      .catch(err => console.error('Failed to load dashboard:', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="font-mono text-xs">Aggregating Municipal Cadastral Intelligence...</span>
        </div>
      </div>
    );
  }

  const potentialDiscrepancies = stats?.potentialDiscrepancies || 0;
  const verifiedCases = stats?.verifiedCases || 0;
  const pendingCases = stats?.casesRequiringVerification || 0;
  const resolvedCases = stats?.resolvedCases || 0;
  const totalAnalyzed = stats?.totalAnalyzed || 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-6 space-y-6">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
            <span>MUNICIPAL VIGILANCE WING</span>
            <span className="text-slate-600">/</span>
            <span>SPATIAL AUDIT OVERVIEW</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1 tracking-tight">
            Building Cadastre & Violation Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time geospatial change monitoring, multi-temporal discrepancy tracking, and statutory enforcement.
          </p>
        </div>

        <button
          onClick={onNavigateToMap}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded transition-colors shadow-lg self-start sm:self-auto"
        >
          <Layers className="w-4 h-4" />
          <span>Launch Interactive GIS Map</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Analyzed</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-2">
            {totalAnalyzed}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Real vector structures
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Potential Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-2">
            {potentialDiscrepancies}
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1">
            Footprint / levels flagged
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Verified Violations</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400 font-mono mt-2">
            {verifiedCases}
          </div>
          <div className="text-[11px] text-red-500/80 mt-1">
            Official notice / action
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Requires Verification</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono mt-2">
            {pendingCases}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pending field site survey
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Jurisdiction Coverage</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-2">
            {stats?.totalAreaCoveredSqKm || 4.2} <span className="text-sm font-normal">km²</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Multi-spectral monitored
          </div>
        </div>

      </div>

      {/* Main Content Split: Discrepancy Breakdown & Priority Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Case Status Breakdown & Inspection Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Spatial Status Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Cadastral Verification Status Distribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">Summary of all evaluated structures across connected municipal zones</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Total: {totalAnalyzed} Parcels</span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-4 rounded-full bg-slate-950 overflow-hidden flex">
              <div 
                style={{ width: `${totalAnalyzed ? (verifiedCases / totalAnalyzed) * 100 : 0}%` }}
                className="bg-red-500" 
                title={`Verified: ${verifiedCases}`}
              />
              <div 
                style={{ width: `${totalAnalyzed ? (potentialDiscrepancies / totalAnalyzed) * 100 : 0}%` }}
                className="bg-amber-500" 
                title={`Potential Discrepancy: ${potentialDiscrepancies}`}
              />
              <div 
                style={{ width: `${totalAnalyzed ? (pendingCases / totalAnalyzed) * 100 : 0}%` }}
                className="bg-sky-500" 
                title={`Requires Verification: ${pendingCases}`}
              />
              <div 
                style={{ width: `${totalAnalyzed ? ((totalAnalyzed - verifiedCases - potentialDiscrepancies - pendingCases) / totalAnalyzed) * 100 : 100}%` }}
                className="bg-emerald-500" 
                title="Compliant Baseline"
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span className="text-slate-300">Verified ({verifiedCases})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-slate-300">Discrepancy ({potentialDiscrepancies})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-sky-500" />
                <span className="text-slate-300">Pending Review ({pendingCases})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-300">Compliant ({Math.max(0, totalAnalyzed - verifiedCases - potentialDiscrepancies - pendingCases)})</span>
              </div>
            </div>
          </div>

          {/* Recent Officer Inspections Table */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Recent Statutory Field Inspections</h3>
              <span className="text-xs text-slate-400 font-mono">Immutable Audit Log</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="pb-2 font-normal">Location & Parcel</th>
                    <th className="pb-2 font-normal">Inspecting Officer</th>
                    <th className="pb-2 font-normal">Action Recorded</th>
                    <th className="pb-2 font-normal">Date</th>
                    <th className="pb-2 font-normal text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {stats?.recentInspections.map((insp, i) => (
                    <tr key={i} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-2.5 font-medium text-slate-200">
                        {insp.address}
                      </td>
                      <td className="py-2.5 text-slate-300">
                        {insp.officer}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {insp.action}
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                        {insp.date}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          insp.status === 'VERIFIED' ? 'bg-red-950 text-red-400 border border-red-800' :
                          insp.status === 'POTENTIAL_DISCREPANCY' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {insp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Col: High Priority Alerts & Recently Monitored Buildings */}
        <div className="space-y-6">
          
          {/* Priority Alerts Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Priority Discrepancy Alerts</span>
              </h3>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                Action Required
              </span>
            </div>

            <div className="space-y-2.5">
              {stats?.alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    const b = buildings.find(x => x.id === alert.buildingId);
                    if (b) {
                      onSelectBuilding(b);
                      onNavigateToMap();
                    }
                  }}
                  className="p-3 rounded bg-slate-950 border border-slate-800 hover:border-indigo-500 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white leading-tight">{alert.violationType}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      alert.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {alert.address}
                  </div>
                  <div className="text-[10px] text-indigo-400 font-mono flex items-center gap-1 pt-1">
                    <span>Inspect on GIS Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Indexed Buildings Jump */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Indexed Municipal Parcels</h3>
            <div className="space-y-2">
              {buildings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBuilding(b);
                    onNavigateToMap();
                  }}
                  className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-200 truncate max-w-[220px]">
                      {b.formattedAddress.split(',')[0]}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {b.ward} · {b.footprintAreaSqm} m²
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
