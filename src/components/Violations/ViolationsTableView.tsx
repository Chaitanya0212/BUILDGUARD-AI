/**
 * BUILDGUARD AI - Municipal Violations & Discrepancies Table
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Filter, 
  Search, 
  MapPin, 
  ArrowRight, 
  ExternalLink, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Building, PotentialViolation, ViolationSeverity, ViolationStatus } from '../../types/index';

interface ViolationsTableViewProps {
  buildings: Building[];
  onSelectBuilding: (building: Building) => void;
  onNavigateToMap: () => void;
}

export const ViolationsTableView: React.FC<ViolationsTableViewProps> = ({
  buildings,
  onSelectBuilding,
  onNavigateToMap
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Flatten all violations with parent building reference
  const allEntries = buildings.flatMap(b => 
    b.violations.map(v => ({
      ...v,
      building: b
    }))
  );

  const filteredEntries = allEntries.filter(entry => {
    if (statusFilter !== 'ALL' && entry.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && entry.severity !== severityFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchAddr = entry.building.formattedAddress.toLowerCase().includes(q);
      const matchType = entry.violationType.toLowerCase().includes(q);
      const matchWard = entry.building.ward.toLowerCase().includes(q);
      if (!matchAddr && !matchType && !matchWard) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
            <span>MUNICIPAL CODE ENFORCEMENT</span>
            <span className="text-slate-600">/</span>
            <span>STATUTORY CASES</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1 tracking-tight">
            Potential Violations & Discrepancies Register
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Geospatial evidence catalog for setback encroachments, unauthorized vertical storeys, and footprint anomalies.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search address, violation, ward..."
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="POTENTIAL_DISCREPANCY">Potential Discrepancy</option>
              <option value="REQUIRES_VERIFICATION">Requires Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="RESOLVED">Resolved</option>
              <option value="NO_POTENTIAL_DISCREPANCY_DETECTED">Compliant / Baseline</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-950/60">
                <th className="p-3 font-normal">Violation Finding</th>
                <th className="p-3 font-normal">Severity</th>
                <th className="p-3 font-normal">Parcel Address & Ward</th>
                <th className="p-3 font-normal">Documented Evidence</th>
                <th className="p-3 font-normal">Status</th>
                <th className="p-3 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    No violations found matching the specified filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-850/40 transition-colors">
                    
                    <td className="p-3 font-semibold text-white max-w-[220px]">
                      <div>{entry.violationType}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-normal">
                        Confidence: {Math.round(entry.aiConfidence * 100)}% · {entry.dataSource.split('&')[0]}
                      </div>
                    </td>

                    <td className="p-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        entry.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                        entry.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                        entry.severity === 'MEDIUM' ? 'bg-amber-500 text-black' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {entry.severity}
                      </span>
                    </td>

                    <td className="p-3 text-slate-300 max-w-[240px]">
                      <div className="truncate font-medium">{entry.building.formattedAddress.split(',')[0]}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{entry.building.ward}</div>
                    </td>

                    <td className="p-3 text-slate-400 max-w-[260px] text-[11px]">
                      <div className="truncate">
                        {entry.evidence[0] || 'Multi-temporal footprint comparison'}
                      </div>
                      <div className="text-[10px] text-slate-500 italic mt-0.5">
                        {entry.evidence.length} evidence point(s) recorded
                      </div>
                    </td>

                    <td className="p-3 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.status === 'VERIFIED' ? 'bg-red-950 text-red-400 border border-red-800' :
                        entry.status === 'POTENTIAL_DISCREPANCY' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        entry.status === 'REQUIRES_VERIFICATION' ? 'bg-sky-950 text-sky-400 border border-sky-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {entry.status}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          onSelectBuilding(entry.building);
                          onNavigateToMap();
                        }}
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white px-2.5 py-1.5 rounded text-[11px] transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
