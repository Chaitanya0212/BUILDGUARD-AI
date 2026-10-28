/**
 * BUILDGUARD AI - Settings, User Administration & Audit Trail
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Database, 
  Key, 
  FileCode2, 
  History, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const UsersAndSettingsView: React.FC = () => {
  const { role, user, switchRole } = useAuth();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.getAuditLogs(),
      api.getDataSources()
    ])
      .then(([logs, sources]) => {
        setAuditLogs(logs);
        setDataSources(sources);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
            <span>PLATFORM ADMINISTRATION</span>
            <span className="text-slate-600">/</span>
            <span>AUDIT & GOVERNANCE</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1 tracking-tight">
            System Settings, Providers & Security Audit
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage user roles, configure external GIS data adapters, and review statutory compliance audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Current Role:</span>
          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2 py-1 rounded border border-indigo-800">
            {role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Data Provider Architecture & Status */}
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Geospatial Data Provider Architecture</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Provider Mesh</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              BuildGuard AI isolates data sources to guarantee transparent attribution. If an authoritative municipal database is disconnected, the system explicitly requires official field verification rather than generating synthetic approvals.
            </p>

            <div className="space-y-3 pt-2">
              {dataSources.map(ds => (
                <div key={ds.id} className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ds.name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      ds.status === 'CONNECTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {ds.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Type: {ds.type} &middot; Confidence Weight: {Math.round(ds.confidence * 100)}%
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {ds.statusMessage}
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    Disclaimer: {ds.disclaimer}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Roles & Permissions Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Role-Based Access Control (RBAC)</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
                <div className="font-bold text-indigo-400 font-mono">ADMIN</div>
                <div className="text-[11px] text-slate-300">
                  Full system access. Manage users, view audit logs, adjust GIS provider connections.
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
                <div className="font-bold text-sky-400 font-mono">OFFICER</div>
                <div className="text-[11px] text-slate-300">
                  Analyze building footprints, verify discrepancies, record field notes, generate reports.
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
                <div className="font-bold text-slate-400 font-mono">VIEWER</div>
                <div className="text-[11px] text-slate-300">
                  Public auditor mode. Read-only access to published municipal reports and maps.
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs text-slate-400">Quick Test Switch:</span>
              <button
                onClick={() => switchRole('OFFICER')}
                className={`px-2.5 py-1 text-xs rounded font-mono ${role === 'OFFICER' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Officer
              </button>
              <button
                onClick={() => switchRole('ADMIN')}
                className={`px-2.5 py-1 text-xs rounded font-mono ${role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Admin
              </button>
              <button
                onClick={() => switchRole('VIEWER')}
                className={`px-2.5 py-1 text-xs rounded font-mono ${role === 'VIEWER' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Viewer
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Statutory Audit Trail & Environment Config */}
        <div className="space-y-6">
          
          {/* Statutory Immutable Audit Trail */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Statutory Compliance Audit Log</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">Immutable Ledger</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-4">No audit logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-indigo-300">{log.action}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Target: <span className="font-mono text-slate-300">{log.target}</span>
                    </div>
                    {log.details && (
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Environment Variables & API Adapters Review */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Configured System Environment</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400">GEMINI_API_KEY</span>
                <span className="text-emerald-400">Configured (Server-Side)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400">VITE_MAP_API_KEY</span>
                <span className="text-slate-500">Optional / Standard GIS Active</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400">VITE_GOOGLE_MAPS_API_KEY</span>
                <span className="text-slate-500">Optional (Public OSM Active)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400">BACKEND_API_URL</span>
                <span className="text-emerald-400">/api (Express Proxy)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
