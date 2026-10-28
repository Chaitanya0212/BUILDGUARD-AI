/**
 * BUILDGUARD AI - GIS Interactive Map Component
 * Satellite & Aerial imagery with building footprint segmentation,
 * Google Street View availability indicators, and Manual Verification Mode
 * (interactive vertex dragging to correct AI building boundaries).
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Crosshair, 
  MapPin, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Eye, 
  Zap, 
  AlertCircle,
  RefreshCw,
  Navigation,
  Edit3,
  Check,
  RotateCcw,
  Camera,
  ShieldCheck,
  Sliders
} from 'lucide-react';
import { Building, BuildingFootprint, LatLng } from '../../types/index';
import { api } from '../../services/api';
import { computePolygonAreaSqm } from '../../utils/geo';

interface GisMapProps {
  buildings: Building[];
  selectedBuilding: Building | null;
  onSelectBuilding: (building: Building) => void;
  onMapClickCoordinates: (latLng: LatLng) => void;
  isLoading: boolean;
  externalFlyTo?: LatLng | null;
  onBuildingUpdated?: (updated: Building) => void;
}

export const PRESET_LOCATIONS = [
  { name: 'Arilova, Visakhapatnam (Sector 3)', lat: 17.765120, lng: 83.325410, zoom: 18 },
  { name: 'Connaught Place, New Delhi', lat: 28.632800, lng: 77.219500, zoom: 17 },
  { name: 'Sector 62, Institutional, Noida', lat: 28.627500, lng: 77.368800, zoom: 17 },
  { name: 'Downtown Seattle, WA', lat: 47.606200, lng: -122.332100, zoom: 17 },
  { name: 'Marina Bay, Singapore', lat: 1.283800, lng: 103.859100, zoom: 17 }
];

export const GisMap: React.FC<GisMapProps> = ({
  buildings,
  selectedBuilding,
  onSelectBuilding,
  onMapClickCoordinates,
  isLoading,
  externalFlyTo,
  onBuildingUpdated
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const editHandlesGroupRef = useRef<L.LayerGroup | null>(null);
  const cursorCoordsRef = useRef<{ lat: number; lng: number }>({ lat: 17.7651, lng: 83.3254 });

  const [activeLayer, setActiveLayer] = useState<'satellite' | 'google' | 'osm' | 'dark'>('satellite');
  const [currentZoom, setCurrentZoom] = useState<number>(17);
  const [cursorDisplay, setCursorDisplay] = useState<string>('17.765120° N, 83.325410° E');
  const [showLayerDropdown, setShowLayerDropdown] = useState<boolean>(false);
  
  // MODULE 3: Manual Verification Mode State
  const [isManualEditMode, setIsManualEditMode] = useState<boolean>(false);
  const isManualEditModeRef = useRef<boolean>(false);
  const [manualTool, setManualTool] = useState<'DRAG' | 'CLICK_POINTS'>('DRAG');
  const manualToolRef = useRef<'DRAG' | 'CLICK_POINTS'>('DRAG');
  const [editableCoords, setEditableCoords] = useState<number[][]>([]);
  const editableCoordsRef = useRef<number[][]>([]);
  const [recalculatedArea, setRecalculatedArea] = useState<number>(0);
  const [isSavingCorrection, setIsSavingCorrection] = useState<boolean>(false);

  useEffect(() => {
    isManualEditModeRef.current = isManualEditMode;
  }, [isManualEditMode]);

  useEffect(() => {
    manualToolRef.current = manualTool;
  }, [manualTool]);

  useEffect(() => {
    editableCoordsRef.current = editableCoords;
  }, [editableCoords]);

  // Sync editable coords when selected building changes
  useEffect(() => {
    if (selectedBuilding) {
      const raw = selectedBuilding.footprint.coordinates[0] as number[][];
      if (raw && raw.length >= 3) {
        setEditableCoords(raw.map(pt => [...pt]));
        setRecalculatedArea(selectedBuilding.footprintAreaSqm);
      }
      setIsManualEditMode(false);
      setManualTool('DRAG');
    }
  }, [selectedBuilding?.id]);

  // Compute high-precision geodesic polygon area helper
  const computeArea = (coords: number[][]): number => {
    return computePolygonAreaSqm(coords);
  };

  // Add a manual point when in CLICK_POINTS mode
  const handleAddManualPoint = (lng: number, lat: number) => {
    setEditableCoords(prev => {
      // If previous points formed a closed polygon, start a fresh polygon with point 1
      let pts = [...prev];
      if (
        pts.length > 3 &&
        pts[0][0] === pts[pts.length - 1][0] &&
        pts[0][1] === pts[pts.length - 1][1] &&
        manualToolRef.current === 'CLICK_POINTS'
      ) {
        pts = [];
      }
      const updated = [...pts, [lng, lat]];
      if (updated.length >= 3) {
        // Calculate provisional closed area
        const closed = [...updated, [...updated[0]]];
        setRecalculatedArea(computeArea(closed));
      }
      return updated;
    });
  };

  const handleCloseManualPolygon = () => {
    setEditableCoords(prev => {
      if (prev.length < 3) return prev;
      const closed = [...prev];
      if (
        closed[0][0] !== closed[closed.length - 1][0] ||
        closed[0][1] !== closed[closed.length - 1][1]
      ) {
        closed.push([...closed[0]]);
      }
      const area = computeArea(closed);
      setRecalculatedArea(area);
      return closed;
    });
    setManualTool('DRAG');
  };

  const handleClearManualPoints = () => {
    setEditableCoords([]);
    setRecalculatedArea(0);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = selectedBuilding ? selectedBuilding.lat : 17.765120;
    const initialLng = selectedBuilding ? selectedBuilding.lng : 83.325410;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    const editHandlesGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;
    editHandlesGroupRef.current = editHandlesGroup;
    mapInstanceRef.current = map;

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      cursorCoordsRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
      setCursorDisplay(`${e.latlng.lat.toFixed(6)}° N, ${e.latlng.lng.toFixed(6)}° E`);
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));

      // If manual editing, check if user is in "Click Points" mode
      if (isManualEditModeRef.current) {
        if (manualToolRef.current === 'CLICK_POINTS') {
          handleAddManualPoint(lng, lat);
        }
        return;
      }

      onMapClickCoordinates({ lat, lng });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (activeLayer === 'satellite' || activeLayer === 'google') {
      // High-resolution satellite tiles
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Satellite Imagery &copy; Esri & Maxar'
      }).addTo(map);

      // Hybrid labels overlay
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        opacity: 0.75
      }).addTo(map);
    } else if (activeLayer === 'osm') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    } else {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; CARTO'
      }).addTo(map);
    }
  }, [activeLayer]);

  // Handle external fly to
  useEffect(() => {
    if (externalFlyTo && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([externalFlyTo.lat, externalFlyTo.lng], 18, {
        duration: 1.2
      });
    }
  }, [externalFlyTo]);

  // Render Building Polygons and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    buildings.forEach((building) => {
      const isSelected = selectedBuilding?.id === building.id;
      const hasVerifiedViolation = building.violations.some(v => v.status === 'VERIFIED');
      const hasPotentialDiscrepancy = building.violations.some(v => v.status === 'POTENTIAL_DISCREPANCY' || v.status === 'REQUIRES_VERIFICATION');

      let strokeColor = '#10b981';
      let fillColor = '#10b981';
      if (hasVerifiedViolation) {
        strokeColor = '#ef4444';
        fillColor = '#ef4444';
      } else if (hasPotentialDiscrepancy) {
        strokeColor = '#f59e0b';
        fillColor = '#f59e0b';
      }

      if (isSelected) {
        strokeColor = '#38bdf8';
        fillColor = '#0284c7';
      }

      // GeoJSON [lng, lat] to Leaflet [lat, lng]
      const coordsToRender = (isSelected && isManualEditMode && editableCoords.length >= 3)
        ? editableCoords
        : building.footprint.coordinates[0];

      if (Array.isArray(coordsToRender) && coordsToRender.length >= 3) {
        const leafletCoords = coordsToRender.map((pt: any) => [pt[1], pt[0]] as [number, number]);

        const polygon = L.polygon(leafletCoords, {
          color: strokeColor,
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 1 : 0.85,
          fillColor,
          fillOpacity: isSelected ? 0.40 : 0.20,
          dashArray: isSelected && !isManualEditMode ? undefined : isManualEditMode ? '4, 4' : '2, 4'
        });

        polygon.on('click', (e) => {
          if (!isManualEditMode) {
            L.DomEvent.stopPropagation(e);
            onSelectBuilding(building);
          }
        });

        polygon.bindTooltip(
          `<div class="text-xs font-sans">
            <div class="font-bold text-slate-900">${building.formattedAddress.split(',')[0]}</div>
            <div class="text-[10px] text-slate-600">Top-View Area: ${building.footprintAreaSqm} m² · Visible Floors: ${building.buildingLevels !== null ? building.buildingLevels : 'Pending'}</div>
            <div class="text-[10px] ${hasVerifiedViolation ? 'text-red-600 font-semibold' : hasPotentialDiscrepancy ? 'text-amber-600 font-semibold' : 'text-emerald-600'}">
              ${hasVerifiedViolation ? 'Verified Violation' : hasPotentialDiscrepancy ? 'Potential Discrepancy' : 'Compliant'}
            </div>
          </div>`,
          { sticky: true, className: 'bg-white shadow-lg rounded border border-slate-200 p-1.5' }
        );

        polygon.addTo(group);
      }

      // Marker icon
      const markerIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="w-4 h-4 rounded-full border-2 ${
          isSelected 
            ? 'bg-sky-400 border-white shadow-[0_0_12px_rgba(56,189,248,0.8)] scale-125' 
            : hasVerifiedViolation 
              ? 'bg-red-500 border-white shadow-sm' 
              : hasPotentialDiscrepancy 
                ? 'bg-amber-400 border-white shadow-sm' 
                : 'bg-emerald-500 border-white shadow-sm'
        } transition-transform"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([building.lat, building.lng], { icon: markerIcon });
      marker.on('click', (e) => {
        if (!isManualEditMode) {
          L.DomEvent.stopPropagation(e);
          onSelectBuilding(building);
        }
      });
      marker.addTo(group);
    });
  }, [buildings, selectedBuilding, isManualEditMode, editableCoords]);

  // MODULE 3: Render Draggable Vertex Handles or Numbered Point Pins in Manual Verification Mode
  useEffect(() => {
    const group = editHandlesGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!isManualEditMode || !selectedBuilding || editableCoords.length === 0) return;

    editableCoords.forEach((pt, index) => {
      const isClosedEndpoint = index === editableCoords.length - 1 && index > 0 &&
        pt[0] === editableCoords[0][0] && pt[1] === editableCoords[0][1];
      if (isClosedEndpoint) return; // Don't double-render the closed point

      if (manualTool === 'CLICK_POINTS') {
        // Render numbered badge for Point 1, Point 2, Point 3...
        const pinIcon = L.divIcon({
          className: 'point-handle',
          html: `<div class="flex items-center justify-center px-1.5 py-0.5 bg-amber-500 border border-slate-950 text-slate-950 font-mono font-bold text-[10px] rounded-full shadow-lg scale-110">
            P${index + 1}
          </div>`,
          iconSize: [24, 20],
          iconAnchor: [12, 10]
        });

        const marker = L.marker([pt[1], pt[0]], { icon: pinIcon });
        marker.bindTooltip(`Point ${index + 1}: ${pt[1].toFixed(6)}° N, ${pt[0].toFixed(6)}° E`, {
          offset: [0, -10]
        });
        marker.addTo(group);
      } else {
        // Create a draggable circle marker for each vertex
        const handleIcon = L.divIcon({
          className: 'vertex-handle',
          html: `<div class="w-3.5 h-3.5 bg-yellow-400 border-2 border-slate-900 rounded-full cursor-move shadow-md hover:scale-125 transition-transform"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([pt[1], pt[0]], {
          icon: handleIcon,
          draggable: true
        });

        marker.on('drag', (e: any) => {
          const newLatLng = e.target.getLatLng();
          setEditableCoords(prev => {
            const updated = prev.map((coord, idx) => {
              if (idx === index) {
                return [Number(newLatLng.lng.toFixed(6)), Number(newLatLng.lat.toFixed(6))];
              }
              return coord;
            });
            // If first point moved, keep last point in sync to close polygon
            if (index === 0 && updated.length > 0) {
              updated[updated.length - 1] = [...updated[0]];
            }
            const newArea = computeArea(updated);
            setRecalculatedArea(newArea);
            return updated;
          });
        });

        marker.addTo(group);
      }
    });
  }, [isManualEditMode, editableCoords, selectedBuilding, manualTool]);

  // Save manual boundary correction
  const handleSaveCorrection = async () => {
    if (!selectedBuilding) return;
    setIsSavingCorrection(true);
    try {
      // Ensure closed polygon loop
      let finalCoords = [...editableCoords];
      if (
        finalCoords.length >= 3 &&
        (finalCoords[0][0] !== finalCoords[finalCoords.length - 1][0] ||
         finalCoords[0][1] !== finalCoords[finalCoords.length - 1][1])
      ) {
        finalCoords.push([...finalCoords[0]]);
      }

      const correctedFootprint: BuildingFootprint = {
        type: 'Polygon',
        coordinates: [finalCoords]
      };

      const updated = await api.manualVerifyInspection({
        buildingId: selectedBuilding.id,
        correctedFootprint,
        notes: `Manual footprint measurement: ${recalculatedArea} m²`
      });

      if (onBuildingUpdated) {
        onBuildingUpdated(updated);
      }
      setIsManualEditMode(false);
    } catch (err: any) {
      alert('Failed to save manual verification: ' + err.message);
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const handleResetToAi = () => {
    if (selectedBuilding) {
      const raw = selectedBuilding.footprint.coordinates[0] as number[][];
      setEditableCoords(raw.map(pt => [...pt]));
      setRecalculatedArea(selectedBuilding.footprintAreaSqm);
      setManualTool('DRAG');
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left Floating HUD: Layer Switcher & Preset Selector */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerDropdown(!showLayerDropdown)}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs px-3 py-2 rounded shadow-lg transition-all"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="capitalize font-medium">{activeLayer === 'google' ? 'Google Satellite' : `${activeLayer} Imagery`}</span>
          </button>

          {showLayerDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 min-w-[175px] z-30">
              <button
                onClick={() => { setActiveLayer('satellite'); setShowLayerDropdown(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 ${
                  activeLayer === 'satellite' ? 'text-indigo-400 font-semibold bg-indigo-950/30' : 'text-slate-300'
                }`}
              >
                <span>Satellite / Aerial Ortho</span>
                {activeLayer === 'satellite' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
              <button
                onClick={() => { setActiveLayer('osm'); setShowLayerDropdown(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 ${
                  activeLayer === 'osm' ? 'text-indigo-400 font-semibold bg-indigo-950/30' : 'text-slate-300'
                }`}
              >
                <span>OpenStreetMap Street</span>
                {activeLayer === 'osm' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
              <button
                onClick={() => { setActiveLayer('dark'); setShowLayerDropdown(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 ${
                  activeLayer === 'dark' ? 'text-indigo-400 font-semibold bg-indigo-950/30' : 'text-slate-300'
                }`}
              >
                <span>Carto Dark Night GIS</span>
                {activeLayer === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Quick Jurisdiction Selector */}
        <select
          onChange={(e) => {
            const selected = PRESET_LOCATIONS.find(p => p.name === e.target.value);
            if (selected && mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([selected.lat, selected.lng], selected.zoom);
              onMapClickCoordinates({ lat: selected.lat, lng: selected.lng });
            }
          }}
          defaultValue={PRESET_LOCATIONS[0].name}
          className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs px-2.5 py-2 rounded shadow-lg focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
        >
          <option disabled>Select Jurisdiction / Preset Area</option>
          {PRESET_LOCATIONS.map(p => (
            <option key={p.name} value={p.name}>📍 {p.name}</option>
          ))}
        </select>

        {/* MODULE 3: Manual Verification Mode Toggle Button */}
        {selectedBuilding && (
          <button
            onClick={() => setIsManualEditMode(!isManualEditMode)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded shadow-lg backdrop-blur-md transition-all border ${
              isManualEditMode
                ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/50'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80'
            }`}
            title="Toggle Manual Verification Mode to adjust building boundary points"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-semibold">{isManualEditMode ? 'Exit Correction' : 'Manual Boundary Mode'}</span>
          </button>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 text-indigo-300 text-xs px-3.5 py-2 rounded shadow-2xl animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span className="font-mono">Extracting Geospatial & Satellite Vectors...</span>
        </div>
      )}

      {/* Prompt Bar when no building selected */}
      {!selectedBuilding && !isLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-300 text-xs px-4 py-2 rounded-md shadow-xl flex items-center gap-2 pointer-events-none">
          <Navigation className="w-4 h-4 text-indigo-400 animate-bounce" />
          <span>Click any building on the map to trigger automated Top-View & Street View inspection</span>
        </div>
      )}

      {/* MODULE 3: Floating Manual Verification Action Drawer */}
      {isManualEditMode && selectedBuilding && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md border-2 border-amber-500 rounded-lg p-3.5 shadow-2xl text-xs flex flex-col gap-3 max-w-xl w-full mx-4">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Manual Footprint Measurement Mode</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 font-mono text-[10px]">
              <button
                onClick={() => setManualTool('DRAG')}
                className={`px-2 py-1 rounded transition-colors ${
                  manualTool === 'DRAG'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Drag Vertices
              </button>
              <button
                onClick={() => setManualTool('CLICK_POINTS')}
                className={`px-2 py-1 rounded transition-colors ${
                  manualTool === 'CLICK_POINTS'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Click Points (P1, P2...)
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {manualTool === 'CLICK_POINTS' ? (
              <span>
                Click consecutive corners around the building (Point 1, Point 2, Point 3...). When all corners are placed, click <strong className="text-amber-400">Close Polygon</strong>.
              </span>
            ) : (
              <span>
                Drag the yellow vertex handles on the map to snap against physical building façade edges. Area recalculates dynamically.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
            {/* Dynamic Calculated Measurement Display */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 font-mono">
                <div className="text-[10px] text-slate-400 font-sans">Manual footprint measurement</div>
                <div className="text-base font-extrabold text-emerald-400">
                  {recalculatedArea} m²
                </div>
              </div>

              {manualTool === 'CLICK_POINTS' && (
                <div className="text-[11px] font-mono text-slate-400">
                  Points Placed: <strong className="text-white">{editableCoords.length}</strong>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {manualTool === 'CLICK_POINTS' && (
                <>
                  <button
                    onClick={handleCloseManualPolygon}
                    disabled={editableCoords.length < 3}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium px-2.5 py-1.5 rounded transition-colors"
                    title="Close loop from last point to Point 1"
                  >
                    <span>Close Polygon</span>
                  </button>

                  <button
                    onClick={handleClearManualPoints}
                    className="text-slate-400 hover:text-red-400 px-2 py-1.5 transition-colors font-mono text-[10px]"
                    title="Clear clicked points and restart"
                  >
                    Clear
                  </button>
                </>
              )}

              <button
                onClick={handleSaveCorrection}
                disabled={isSavingCorrection || recalculatedArea === 0}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded transition-colors shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingCorrection ? 'Saving...' : 'Save Measurement'}</span>
              </button>

              <button
                onClick={handleResetToAi}
                className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1.5 transition-colors font-mono text-[10px]"
                title="Reset boundary to initial AI segmentation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset AI</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Bottom Status Bar & Coordinate HUD */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 text-[11px] font-mono px-3 py-1.5 rounded shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>{cursorDisplay}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div>Zoom: <span className="text-white font-semibold">{currentZoom}</span></div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <Camera className="w-3 h-3 text-sky-400" />
            <span className="text-slate-400">Street View Gateway Active</span>
          </div>
        </div>
      </div>

    </div>
  );
};
