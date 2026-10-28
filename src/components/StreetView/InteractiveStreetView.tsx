/**
 * BUILDGUARD AI - Interactive 360° Street View Viewer Component
 * Uses official Google Maps JavaScript API StreetViewPanorama.
 * Supports free 360° camera rotation, pitch/zoom gestures, on-screen controls,
 * metadata tracking, and automatic initial heading calculation toward the building.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { 
  Compass, 
  RotateCw, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Minus, 
  RefreshCw, 
  AlertCircle,
  Eye,
  Camera,
  Layers,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { Building, LatLng } from '../../types/index';

declare const google: any;

// Configurable Default Front View Zoom setting
// Zoom 0 in Google Maps JavaScript API Street View provides the widest field-of-view (~180°),
// ensuring the entire building from ground street plinth to rooftop parapet is visible.
export const DEFAULT_FRONT_VIEW_ZOOM = 0;

interface InteractiveStreetViewProps {
  building: Building;
  onCameraChange?: (state: {
    heading: number;
    pitch: number;
    zoom: number;
    panoId?: string;
    lat?: number;
    lng?: number;
  }) => void;
  className?: string;
}

export const InteractiveStreetView: React.FC<InteractiveStreetViewProps> = ({
  building,
  onCameraChange,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const streetViewServiceRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Camera HUD State - starts wide (zoom 0) with pitch 8 to capture ground-to-roof
  const [currentHeading, setCurrentHeading] = useState<number>(45);
  const [currentPitch, setCurrentPitch] = useState<number>(8);
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_FRONT_VIEW_ZOOM);
  const [currentPanoId, setCurrentPanoId] = useState<string>('Initializing...');
  const [cameraPosition, setCameraPosition] = useState<LatLng>({ lat: building.lat, lng: building.lng });
  const [captureDate, setCaptureDate] = useState<string>('Recent');
  const [copyrightNotice, setCopyrightNotice] = useState<string>('© Google');
  const [initialHeading, setInitialHeading] = useState<number>(45);

  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Calculate bearing from camera point to building centroid
  const calculateBearing = (fromLat: number, fromLng: number, toLat: number, toLng: number): number => {
    const lat1 = (fromLat * Math.PI) / 180;
    const lat2 = (toLat * Math.PI) / 180;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  // Initialize or update Street View when building changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const initViewer = async () => {
      if (!containerRef.current) return;

      try {
        setOptions({
          key: apiKey,
          v: 'weekly'
        });

        await Promise.all([
          importLibrary('streetView'),
          importLibrary('maps')
        ]);
        if (isCancelled) return;

        if (!streetViewServiceRef.current) {
          streetViewServiceRef.current = new google.maps.StreetViewService();
        }

        const svService = streetViewServiceRef.current;
        const targetPos = new google.maps.LatLng(building.lat, building.lng);

        // 1. Search for nearest panorama within 65 meters
        svService.getPanorama(
          {
            location: targetPos,
            radius: 65,
            preference: google.maps.StreetViewPreference.NEAREST,
            source: google.maps.StreetViewSource.DEFAULT
          },
          (data: any, status: any) => {
            if (isCancelled) return;

            if (status === google.maps.StreetViewStatus.OK && data && data.location?.latLng) {
              setIsAvailable(true);
              setIsLoading(false);

              const panoLatLng = data.location.latLng;
              const panoLat = panoLatLng.lat();
              const panoLng = panoLatLng.lng();
              const panoId = data.location.pano || 'pano-live';

              // 2. Compute initial heading toward building centroid
              const computedHeading = Math.round(
                calculateBearing(panoLat, panoLng, building.lat, building.lng)
              );

              setInitialHeading(computedHeading);
              setCurrentHeading(computedHeading);
              setCurrentPitch(8);
              setCurrentZoom(DEFAULT_FRONT_VIEW_ZOOM);
              setCurrentPanoId(panoId);
              setCameraPosition({ lat: panoLat, lng: panoLng });
              setCaptureDate(data.imageDate || 'Recent');
              setCopyrightNotice(data.copyright || '© Google');

              // 3. Create or update StreetViewPanorama instance with wide zoom
              if (!panoramaRef.current && containerRef.current) {
                const pano = new google.maps.StreetViewPanorama(containerRef.current, {
                  pano: panoId,
                  pov: { heading: computedHeading, pitch: 8 },
                  zoom: DEFAULT_FRONT_VIEW_ZOOM,
                  visible: true,
                  enableCloseButton: false,
                  addressControl: false,
                  linksControl: true,
                  panControl: false, // We provide high-density UI buttons
                  zoomControl: false,
                  motionTracking: false,
                  motionTrackingControl: false,
                  // Mandatory Attribution Snippet Enforcement
                  internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio']
                });

                // Attach Event Listeners to capture user 360° interaction
                pano.addListener('pov_changed', () => {
                  const pov = pano.getPov();
                  const h = Math.round(((pov.heading % 360) + 360) % 360);
                  const p = Math.round(pov.pitch);
                  const z = pano.getZoom() ?? DEFAULT_FRONT_VIEW_ZOOM;

                  setCurrentHeading(h);
                  setCurrentPitch(p);
                  setCurrentZoom(z);

                  if (onCameraChange) {
                    onCameraChange({
                      heading: h,
                      pitch: p,
                      zoom: z,
                      panoId: pano.getPano(),
                      lat: pano.getPosition()?.lat(),
                      lng: pano.getPosition()?.lng()
                    });
                  }
                });

                pano.addListener('pano_changed', () => {
                  const newPano = pano.getPano();
                  setCurrentPanoId(newPano);
                });

                pano.addListener('position_changed', () => {
                  const pos = pano.getPosition();
                  if (pos) {
                    setCameraPosition({ lat: pos.lat(), lng: pos.lng() });
                  }
                });

                panoramaRef.current = pano;
              } else if (panoramaRef.current) {
                // Re-center existing panorama on the newly selected building with wide view
                panoramaRef.current.setPano(panoId);
                panoramaRef.current.setPov({ heading: computedHeading, pitch: 8 });
                panoramaRef.current.setZoom(DEFAULT_FRONT_VIEW_ZOOM);
              }

              if (onCameraChange) {
                onCameraChange({
                  heading: computedHeading,
                  pitch: 8,
                  zoom: DEFAULT_FRONT_VIEW_ZOOM,
                  panoId,
                  lat: panoLat,
                  lng: panoLng
                });
              }
            } else {
              // Street View not available for this exact cadastral coordinate
              setIsAvailable(false);
              setIsLoading(false);
              setErrorMsg('Street View unavailable for this location.');
            }
          }
        );
      } catch (err: any) {
        if (!isCancelled) {
          setIsLoading(false);
          setIsAvailable(false);
          setErrorMsg(err.message || 'Failed to initialize Google Street View viewer');
        }
      }
    };

    initViewer();

    return () => {
      isCancelled = true;
    };
  }, [building.id, building.lat, building.lng, apiKey]);

  // Manual Camera Control Handlers
  const handleRotate = useCallback((deltaHeading: number) => {
    if (!panoramaRef.current) return;
    const currentPov = panoramaRef.current.getPov();
    const newHeading = (((currentPov.heading + deltaHeading) % 360) + 360) % 360;
    panoramaRef.current.setPov({
      heading: newHeading,
      pitch: currentPov.pitch
    });
  }, []);

  const handlePitch = useCallback((deltaPitch: number) => {
    if (!panoramaRef.current) return;
    const currentPov = panoramaRef.current.getPov();
    const newPitch = Math.max(-85, Math.min(85, currentPov.pitch + deltaPitch));
    panoramaRef.current.setPov({
      heading: currentPov.heading,
      pitch: newPitch
    });
  }, []);

  const handleZoom = useCallback((deltaZoom: number) => {
    if (!panoramaRef.current) return;
    const currentZ = panoramaRef.current.getZoom() ?? DEFAULT_FRONT_VIEW_ZOOM;
    const newZ = Math.max(0, Math.min(4, currentZ + deltaZoom));
    panoramaRef.current.setZoom(newZ);
  }, []);

  const handleSetZoomLevel = useCallback((zoomLevel: number) => {
    if (!panoramaRef.current) return;
    panoramaRef.current.setZoom(zoomLevel);
  }, []);

  const handleResetView = useCallback(() => {
    if (!panoramaRef.current) return;
    panoramaRef.current.setPov({
      heading: initialHeading,
      pitch: 8
    });
    panoramaRef.current.setZoom(DEFAULT_FRONT_VIEW_ZOOM);
  }, [initialHeading]);

  const handleLookBehind = useCallback(() => {
    if (!panoramaRef.current) return;
    const currentPov = panoramaRef.current.getPov();
    const newHeading = (((currentPov.heading + 180) % 360) + 360) % 360;
    panoramaRef.current.setPov({
      heading: newHeading,
      pitch: currentPov.pitch
    });
  }, []);

  const handleSetHeading = useCallback((targetHeading: number) => {
    if (!panoramaRef.current) return;
    const currentPov = panoramaRef.current.getPov();
    panoramaRef.current.setPov({
      heading: (targetHeading + 360) % 360,
      pitch: currentPov.pitch
    });
  }, []);

  return (
    <div className={`flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl ${className}`}>
      
      {/* Top Street View Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-white tracking-wide">360° INTERACTIVE STREET VIEW</span>
          <span className="text-slate-600">·</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            isAvailable === true 
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
              : isAvailable === false 
                ? 'bg-red-950 text-red-400 border border-red-800'
                : 'bg-slate-800 text-slate-400'
          }`}>
            {isAvailable === true ? 'Street View Available' : isAvailable === false ? 'Street View Unavailable' : 'Checking Panorama...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>{currentHeading}°</span>
        </div>
      </div>

      {/* Panorama Container & Interactive Canvas */}
      <div className="relative w-full h-80 sm:h-96 bg-black flex items-center justify-center overflow-hidden">
        
        {/* Actual Google Street View DOM mount target */}
        <div 
          ref={containerRef} 
          className="w-full h-full"
          tabIndex={0}
          aria-label="Google Street View 360 Panorama"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-xs text-slate-300 z-20">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="font-mono">Connecting to Google Street View Panorama...</span>
          </div>
        )}

        {/* Unavailable Fallback Notice */}
        {isAvailable === false && !isLoading && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center gap-3 z-20">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200">Street View unavailable for this location.</div>
              <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed font-sans">
                No street-level Google camera coverage was indexed within 65 meters of coordinates {building.lat.toFixed(5)}, {building.lng.toFixed(5)}. Official on-site municipal inspection is required for front façade floor count verification.
              </p>
            </div>
          </div>
        )}

        {/* Floating Top-Left Orientation Badge */}
        {isAvailable && (
          <div className="absolute top-2.5 left-2.5 z-10 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded border border-slate-700/80 text-[10px] font-mono text-slate-200 flex items-center gap-2 shadow-lg select-none pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Facing {currentHeading}°</span>
            <span className="text-slate-500">|</span>
            <span>Pitch {currentPitch}°</span>
            <span className="text-slate-500">|</span>
            <span>Zoom {currentZoom.toFixed(1)}x {currentZoom === 0 ? '(Full Façade Wide FOV)' : ''}</span>
          </div>
        )}

        {/* Floating Camera Controls (Overlay on the 360 view) */}
        {isAvailable && (
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5 select-none">
            
            {/* D-Pad Navigation Controls */}
            <div className="bg-slate-950/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-xl flex flex-col items-center gap-1">
              
              {/* Pitch Up */}
              <button
                onClick={() => handlePitch(10)}
                className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                title="Look Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1">
                {/* Rotate Left */}
                <button
                  onClick={() => handleRotate(-30)}
                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Rotate Left (30°)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Reset to building facing */}
                <button
                  onClick={handleResetView}
                  className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  title="Reset to Initial Building View"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Rotate Right */}
                <button
                  onClick={() => handleRotate(30)}
                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Rotate Right (30°)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pitch Down */}
              <button
                onClick={() => handlePitch(-10)}
                className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                title="Look Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="bg-slate-950/85 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-xl flex flex-col items-center gap-1">
              <button
                onClick={() => handleZoom(0.5)}
                className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                title="Zoom In (+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleZoom(-0.5)}
                className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                title="Zoom Out (−)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* Bottom Helper Instruction */}
        {isAvailable && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 text-[10px] text-slate-300 font-sans pointer-events-none shadow">
            Mouse Drag: Rotate 360° &middot; Scroll: Zoom &middot; Road Arrows: Move Position
          </div>
        )}
      </div>

      {/* Mandatory Google Maps Attribution line */}
      <div className="px-3 py-1 bg-black text-[10px] text-slate-500 font-mono text-right border-t border-slate-900">
        Imagery Google Maps &middot; {copyrightNotice}
      </div>

      {/* DEDICATED STREET VIEW CAMERA CONTROLS BAR (Required by User Specification) */}
      {isAvailable && (
        <div className="p-2.5 bg-slate-900 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>STREET VIEW CAMERA CONTROLS</span>
            <span className="text-[10px] text-slate-500 font-mono">360° Full Pan & Tilt</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {/* Rotate Left */}
            <button
              onClick={() => handleRotate(-30)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Rotate Left 30°"
            >
              <span>← Rotate Left</span>
            </button>

            {/* Rotate Right */}
            <button
              onClick={() => handleRotate(30)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Rotate Right 30°"
            >
              <span>→ Rotate Right</span>
            </button>

            {/* Look Up */}
            <button
              onClick={() => handlePitch(10)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Look Up 10°"
            >
              <span>↑ Look Up</span>
            </button>

            {/* Look Down */}
            <button
              onClick={() => handlePitch(-10)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Look Down 10°"
            >
              <span>↓ Look Down</span>
            </button>

            {/* Zoom In */}
            <button
              onClick={() => handleZoom(0.5)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Zoom In"
            >
              <span>+ Zoom In</span>
            </button>

            {/* Zoom Out */}
            <button
              onClick={() => handleZoom(-0.5)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Zoom Out"
            >
              <span>− Zoom Out</span>
            </button>

            {/* Look Behind */}
            <button
              onClick={handleLookBehind}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-900/60 transition-colors"
              title="Look Behind the Building (180° Turnaround)"
            >
              <RotateCw className="w-3 h-3 text-amber-400" />
              <span>Look Behind (180°)</span>
            </button>

            {/* Reset to Initial Building Heading */}
            <button
              onClick={handleResetView}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              title="Reset to Initial Building Heading"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Return to Front</span>
            </button>
          </div>

          {/* Quick Viewing Direction Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-1 text-slate-400">
            <span className="text-slate-500">Façade Angles:</span>
            <button
              onClick={() => handleSetHeading(initialHeading)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Building Front ({initialHeading}°)
            </button>
            <button
              onClick={() => handleSetHeading(initialHeading - 90)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Left Side ({(initialHeading - 90 + 360) % 360}°)
            </button>
            <button
              onClick={() => handleSetHeading(initialHeading + 180)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Rear ({(initialHeading + 180) % 360}°)
            </button>
            <button
              onClick={() => handleSetHeading(initialHeading + 90)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Right Side ({(initialHeading + 90) % 360}°)
            </button>

            <span className="text-slate-600 pl-2">|</span>
            <span className="text-slate-500 pl-1">FOV / Zoom:</span>
            <button
              onClick={() => handleSetZoomLevel(DEFAULT_FRONT_VIEW_ZOOM)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                currentZoom === DEFAULT_FRONT_VIEW_ZOOM 
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700 font-bold' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Full Building Façade (Ground to Roof, ~180° Wide Angle)"
            >
              Full Façade (Wide, 0x)
            </button>
            <button
              onClick={() => handleSetZoomLevel(1)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                currentZoom === 1 
                  ? 'bg-indigo-950 text-indigo-400 border-indigo-700 font-bold' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Standard (1.0x)
            </button>
            <button
              onClick={() => handleSetZoomLevel(2)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                currentZoom === 2 
                  ? 'bg-indigo-950 text-indigo-400 border-indigo-700 font-bold' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Close Detail (2.0x)
            </button>
          </div>
        </div>
      )}

      {/* CURRENT VIEW METADATA HUD (Required by User Specification) */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <span>CURRENT VIEW METADATA</span>
          <span className="font-mono text-indigo-400 text-[10px]">{captureDate}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
          <div className="p-2 bg-slate-950 rounded border border-slate-850">
            <div className="text-slate-500 text-[10px]">Latitude</div>
            <div className="text-slate-200 truncate mt-0.5">{cameraPosition.lat.toFixed(6)}° N</div>
          </div>

          <div className="p-2 bg-slate-950 rounded border border-slate-850">
            <div className="text-slate-500 text-[10px]">Longitude</div>
            <div className="text-slate-200 truncate mt-0.5">{cameraPosition.lng.toFixed(6)}° E</div>
          </div>

          <div className="p-2 bg-slate-950 rounded border border-slate-850">
            <div className="text-slate-500 text-[10px]">Current Heading</div>
            <div className="text-emerald-400 font-bold mt-0.5">{currentHeading}°</div>
          </div>

          <div className="p-2 bg-slate-950 rounded border border-slate-850">
            <div className="text-slate-500 text-[10px]">Current Pitch</div>
            <div className="text-slate-200 mt-0.5">{currentPitch}°</div>
          </div>

          <div className="p-2 bg-slate-950 rounded border border-slate-850">
            <div className="text-slate-500 text-[10px]">Current Zoom</div>
            <div className="text-slate-200 mt-0.5">{currentZoom.toFixed(1)}x</div>
          </div>

          <div className="p-2 bg-slate-950 rounded border border-slate-850">
            <div className="text-slate-500 text-[10px]">Panorama ID</div>
            <div className="text-slate-400 truncate mt-0.5" title={currentPanoId}>
              {currentPanoId || 'Not available'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-500">
          <span>Street View Availability: <strong className={isAvailable ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{isAvailable ? 'Available' : 'Unavailable'}</strong></span>
          <span>Camera Bearing Offset: {Math.abs(currentHeading - initialHeading)}°</span>
        </div>
      </div>

    </div>
  );
};
