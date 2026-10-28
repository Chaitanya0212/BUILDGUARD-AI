/**
 * BUILDGUARD AI - Top Navigation Bar
 * Municipal GIS Intelligence Platform
 */

import React from 'react';
import { 
  Building2, 
  Map as MapIcon, 
  LayoutDashboard, 
  AlertTriangle, 
  FileText, 
  ShieldAlert, 
  Users, 
  Search,
  Crosshair,
  ChevronDown,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/index';

interface NavbarProps {
  currentTab: 'map' | 'dashboard' | 'violations' | 'reports' | 'admin' | 'floor-ai';
  setCurrentTab: (tab: 'map' | 'dashboard' | 'violations' | 'reports' | 'admin' | 'floor-ai') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onLocateUser?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onLocateUser
}) => {
  const { user, role, switchRole } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 z-30 sticky top-0 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand & Municipal System Identity */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setCurrentTab('map')}>
            <div className="w-10 h-10 rounded bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base text-white font-mono">BUILDGUARD<span className="text-indigo-400">.AI</span></span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono border-l border-slate-700 pl-2">GIS Vigilance</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[210px] sm:max-w-none">
                Building Violation & Spatial Change Detection System
              </p>
            </div>
          </div>

          {/* Search Bar - Center Input */}
          <form onSubmit={onSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search address, landmark, or lat, lng (e.g. Arilova, Visakhapatnam)..."
                className="w-full bg-slate-950/80 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs rounded px-3 py-2 pl-9 pr-8 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {onLocateUser && (
                <button
                  type="button"
                  onClick={onLocateUser}
                  title="Current GPS Location"
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Navigation Segmented Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('map')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-colors ${
                currentTab === 'map'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map GIS</span>
            </button>

            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('violations')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-colors ${
                currentTab === 'violations'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Violations</span>
            </button>

            <button
              onClick={() => setCurrentTab('reports')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-colors ${
                currentTab === 'reports'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </button>

            <button
              onClick={() => setCurrentTab('floor-ai')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-colors ${
                currentTab === 'floor-ai'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-emerald-400/90 hover:text-emerald-300 hover:bg-slate-800 border border-emerald-800/40'
              }`}
              title="Computer Vision Floor Detection Model & Training Workbench"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Floor AI Lab</span>
            </button>

            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded transition-colors ${
                currentTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden lg:inline">Settings & Audit</span>
            </button>
          </nav>

          {/* User & Role Switcher */}
          <div className="flex items-center gap-3 border-l border-slate-800 pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user?.fullName || 'Municipal Officer'}</div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-end gap-1.5">
                <span>{user?.badgeNumber || 'BG-OFF-104'}</span>
                <span aria-hidden="true">·</span>
                <span className="text-indigo-400 font-semibold">{role}</span>
              </div>
            </div>

            {/* Quick Role Switcher Dropdown */}
            <div className="relative group">
              <select
                value={role}
                onChange={(e) => switchRole(e.target.value as UserRole)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
                title="Switch User Role to test permissions"
              >
                <option value="OFFICER">Role: OFFICER</option>
                <option value="ADMIN">Role: ADMIN</option>
                <option value="VIEWER">Role: VIEWER (Read-Only)</option>
              </select>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
