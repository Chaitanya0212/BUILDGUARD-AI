/**
 * BUILDGUARD AI - Main Application Entry
 * AI-Based Building Violation Detection & Spatial Intelligence System
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { GisMap } from './components/Map/GisMap';
import { BuildingIntelligencePanel } from './components/BuildingPanel/BuildingIntelligencePanel';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ViolationsTableView } from './components/Violations/ViolationsTableView';
import { ReportsView } from './components/Reports/ReportsView';
import { UsersAndSettingsView } from './components/Admin/UsersAndSettingsView';
import { FloorModelStudio } from './components/FloorModel/FloorModelStudio';
import { Building, LatLng } from './types/index';
import { api } from './services/api';

function MainLayout() {
  const [currentTab, setCurrentTab] = useState<'map' | 'dashboard' | 'violations' | 'reports' | 'admin' | 'floor-ai'>('map');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isLoadingBuilding, setIsLoadingBuilding] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [flyToCoords, setFlyToCoords] = useState<LatLng | null>(null);
  const [reportBuildingTarget, setReportBuildingTarget] = useState<Building | null>(null);

  // Load all initial indexed buildings
  useEffect(() => {
    api.getAllBuildings()
      .then(data => {
        setBuildings(data);
        // Default select the Arilova, Visakhapatnam building for an instant rich experience!
        const arilova = data.find(b => b.id === 'bld-arilova-101');
        if (arilova) {
          setSelectedBuilding(arilova);
        }
      })
      .catch(err => console.error('Error fetching buildings:', err));
  }, []);

  // Handle click on Map coordinates (Primary Input Mechanism)
  const handleMapClickCoordinates = async (coords: LatLng) => {
    setIsLoadingBuilding(true);
    try {
      const building = await api.lookupBuildingByCoords(coords.lat, coords.lng);
      
      // Update or append in local state
      setBuildings(prev => {
        const idx = prev.findIndex(b => b.id === building.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = building;
          return copy;
        }
        return [building, ...prev];
      });

      setSelectedBuilding(building);
    } catch (err: any) {
      console.error('Failed to lookup building for coordinates:', err);
    } finally {
      setIsLoadingBuilding(false);
    }
  };

  // Handle Search Submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoadingBuilding(true);
    try {
      const results = await api.searchLocation(searchQuery);
      if (results.length > 0) {
        const top = results[0];
        const target: LatLng = { lat: top.lat, lng: top.lng };
        setFlyToCoords(target);
        setCurrentTab('map');

        // Automatically trigger building lookup for searched location
        const building = await api.lookupBuildingByCoords(top.lat, top.lng);
        setBuildings(prev => {
          const idx = prev.findIndex(b => b.id === building.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = building;
            return copy;
          }
          return [building, ...prev];
        });
        setSelectedBuilding(building);
      } else {
        alert('Location not found. Please enter a valid address, landmark, or coordinates (e.g. 17.7651, 83.3254)');
      }
    } catch (err: any) {
      alert('Search failed: ' + err.message);
    } finally {
      setIsLoadingBuilding(false);
    }
  };

  const handleUpdateBuilding = (updated: Building) => {
    setSelectedBuilding(updated);
    setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const handleOpenReport = (building: Building) => {
    setReportBuildingTarget(building);
    setCurrentTab('reports');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      
      {/* Top Municipal Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onLocateUser={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
              const target = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setFlyToCoords(target);
              setCurrentTab('map');
              handleMapClickCoordinates(target);
            });
          }
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* VIEW 1: MAP (PRIMARY INTERACTION) */}
        {currentTab === 'map' && (
          <div className="flex-1 flex w-full h-full relative">
            <GisMap
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={(b) => setSelectedBuilding(b)}
              onMapClickCoordinates={handleMapClickCoordinates}
              isLoading={isLoadingBuilding}
              externalFlyTo={flyToCoords}
            />

            {/* Slide-over Right Intelligence Panel */}
            {selectedBuilding && (
              <BuildingIntelligencePanel
                building={selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
                onUpdateBuilding={handleUpdateBuilding}
                onOpenReport={handleOpenReport}
              />
            )}
          </div>
        )}

        {/* VIEW 2: MUNICIPAL DASHBOARD */}
        {currentTab === 'dashboard' && (
          <DashboardView
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            onNavigateToMap={() => setCurrentTab('map')}
          />
        )}

        {/* VIEW 3: VIOLATIONS TABLE */}
        {currentTab === 'violations' && (
          <ViolationsTableView
            buildings={buildings}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            onNavigateToMap={() => setCurrentTab('map')}
          />
        )}

        {/* VIEW 4: STATUTORY REPORTS */}
        {currentTab === 'reports' && (
          <ReportsView
            initialReportBuilding={reportBuildingTarget}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            onNavigateToMap={() => setCurrentTab('map')}
          />
        )}

        {/* VIEW 5: SETTINGS & AUDIT */}
        {currentTab === 'admin' && (
          <UsersAndSettingsView />
        )}

        {/* VIEW 6: FLOOR DETECTION MODEL TRAINING & EVALUATION STUDIO */}
        {currentTab === 'floor-ai' && (
          <FloorModelStudio />
        )}

      </main>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
