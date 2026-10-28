/**
 * BUILDGUARD AI - Shared Geodesic & Planar Metric Geometry Utilities
 * High-precision area (m²), length, width, and perimeter calculations
 * based on WGS84 ellipsoidal projection and the Shoelace formula.
 */

export interface PolygonDimensions {
  areaSqm: number;
  lengthM: number;
  widthM: number;
  perimeterM: number;
}

/**
 * High-precision polygon area calculation in square meters (m²).
 * Projects coordinates [lng, lat] to local ground meters using WGS84 ellipsoidal scaling,
 * then evaluates using the metric Shoelace polygon area formula.
 * Avoids spherical excess floating-point cancellation for small building parcels.
 */
export function computePolygonAreaSqm(coords: number[][]): number {
  if (!coords || coords.length < 3) return 0;

  // Clone points and remove closing duplicate vertex if present
  const pts = coords.slice();
  if (
    pts.length > 3 &&
    pts[0][0] === pts[pts.length - 1][0] &&
    pts[0][1] === pts[pts.length - 1][1]
  ) {
    pts.pop();
  }
  if (pts.length < 3) return 0;

  // Centroid latitude for local ellipsoidal projection
  let sumLat = 0;
  for (const pt of pts) sumLat += pt[1];
  const meanLat = sumLat / pts.length;
  const latRad = (meanLat * Math.PI) / 180;

  // Meters per degree latitude & longitude (WGS84 ellipsoidal model)
  const metersPerLat =
    111132.954 - 559.822 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerLng =
    ((Math.PI / 180) * 6378137 * Math.cos(latRad)) /
    Math.sqrt(1 - 0.00669437999014 * Math.sin(latRad) * Math.sin(latRad));

  let areaM2 = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = pts[i][0] * metersPerLng;
    const yi = pts[i][1] * metersPerLat;
    const xj = pts[j][0] * metersPerLng;
    const yj = pts[j][1] * metersPerLat;
    areaM2 += xi * yj - xj * yi;
  }

  areaM2 = Math.abs(areaM2) / 2.0;
  return Math.round(areaM2 * 10) / 10;
}

/**
 * Compute all top-view building dimensions (Length, Width, Perimeter, Area)
 * directly from geographic polygon coordinates.
 */
export function computePolygonDimensions(coords: number[][]): PolygonDimensions {
  const areaSqm = computePolygonAreaSqm(coords);
  if (!coords || coords.length < 3) {
    return { areaSqm: 0, lengthM: 0, widthM: 0, perimeterM: 0 };
  }

  const pts = coords.slice();
  if (
    pts.length > 3 &&
    pts[0][0] === pts[pts.length - 1][0] &&
    pts[0][1] === pts[pts.length - 1][1]
  ) {
    pts.pop();
  }

  let sumLat = 0;
  for (const pt of pts) sumLat += pt[1];
  const meanLat = sumLat / pts.length;
  const latRad = (meanLat * Math.PI) / 180;

  const metersPerLat =
    111132.954 - 559.822 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerLng =
    ((Math.PI / 180) * 6378137 * Math.cos(latRad)) /
    Math.sqrt(1 - 0.00669437999014 * Math.sin(latRad) * Math.sin(latRad));

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let perimeterM = 0;

  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];

    const x1 = p1[0] * metersPerLng;
    const y1 = p1[1] * metersPerLat;
    const x2 = p2[0] * metersPerLng;
    const y2 = p2[1] * metersPerLat;

    minX = Math.min(minX, x1);
    maxX = Math.max(maxX, x1);
    minY = Math.min(minY, y1);
    maxY = Math.max(maxY, y1);

    const dx = x2 - x1;
    const dy = y2 - y1;
    perimeterM += Math.sqrt(dx * dx + dy * dy);
  }

  const spanX = Math.max(0, maxX - minX);
  const spanY = Math.max(0, maxY - minY);

  const lengthM = Math.round(Math.max(spanX, spanY) * 10) / 10;
  const widthM = Math.round(Math.min(spanX, spanY) * 10) / 10;

  return {
    areaSqm,
    lengthM,
    widthM,
    perimeterM: Math.round(perimeterM * 10) / 10
  };
}

/**
 * Check if a point (lat, lng) is inside a GeoJSON polygon
 */
export function isPointInPolygon(lat: number, lng: number, polygonCoords: number[][]): boolean {
  let inside = false;
  const n = polygonCoords.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
    const xj = polygonCoords[j][0], yj = polygonCoords[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
