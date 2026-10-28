/**
 * BUILDGUARD AI - Building Façade Floor Dataset Generator
 * Generates labeled building façade images across 1 to 8 floors with:
 * - 70% training, 15% validation, 15% testing splits
 * - Diverse architectural styles (independent houses, apartments, commercial, schools, offices)
 * - Structural floor elements (horizontal slab lines, balconies, parapets, plinths)
 * - Difficult edge cases (trees blocking, vehicle occlusion, shadows, tilted angles, compound walls)
 * - Detailed ground-truth annotations with bounding boxes and floor-boundary lines.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BuildingAnnotation {
  id: string;
  image: string;
  floor_count: number;
  storeys_config: string;
  style: string;
  visibility: 'good' | 'partial' | 'poor';
  difficulties: string[];
  building_bbox: { x: number; y: number; width: number; height: number };
  floor_boundaries: number[]; // normalized relative Y (0.0 - 1.0)
  ground_level: number;
  roof_level: number;
  split: 'train' | 'validation' | 'test';
  building_id: string;
  camera_angle_deg?: number;
}

const ARCH_STYLES = [
  'independent_villa',
  'residential_apartment',
  'commercial_complex',
  'institutional_school',
  'office_tower',
  'mixed_use_stilt'
];

const DIFFICULTY_TAGS = [
  'none',
  'trees_blocking',
  'vehicles_foreground',
  'shadows',
  'tilted_perspective',
  'compound_wall',
  'partial_facade',
  'roof_structure'
];

function generateSvgContent(
  floorCount: number,
  style: string,
  visibility: 'good' | 'partial' | 'poor',
  difficulties: string[],
  boundaries: number[],
  buildingBbox: { x: number; y: number; width: number; height: number },
  seed: number
): string {
  const width = 640;
  const height = 480;

  const bx = Math.round(buildingBbox.x * width);
  const by = Math.round(buildingBbox.y * height);
  const bw = Math.round(buildingBbox.width * width);
  const bh = Math.round(buildingBbox.height * height);

  // Colors based on style
  let wallColor = '#d9d2c9';
  let slabColor = '#4a5568';
  let windowFrame = '#2d3748';
  let windowGlass = '#90cdf4';

  if (style === 'commercial_complex' || style === 'office_tower') {
    wallColor = '#cbd5e0';
    slabColor = '#2b6cb0';
    windowGlass = '#63b3ed';
  } else if (style === 'independent_villa') {
    wallColor = '#fefcbf';
    slabColor = '#b7791f';
    windowGlass = '#bee3f8';
  } else if (style === 'institutional_school') {
    wallColor = '#fed7d7';
    slabColor = '#9b2c2c';
    windowGlass = '#e2e8f0';
  }

  // Draw floor levels and windows
  let floorsSvg = '';
  const numSlabs = boundaries.length;

  for (let f = 0; f < numSlabs - 1; f++) {
    const topY = Math.round(boundaries[f] * height);
    const bottomY = Math.round(boundaries[f + 1] * height);
    const fHeight = bottomY - topY;
    const floorIndex = floorCount - f;

    // Floor band background
    floorsSvg += `
      <!-- Floor ${floorIndex} Level -->
      <rect x="${bx}" y="${topY}" width="${bw}" height="${fHeight}" fill="${wallColor}" />
    `;

    // Horizontal structural slab (concrete lintel/slab boundary)
    floorsSvg += `
      <rect x="${bx - 6}" y="${bottomY - 4}" width="${bw + 12}" height="6" fill="${slabColor}" opacity="0.9" />
    `;

    // Balconies on some floors
    if (style.includes('apartment') && floorIndex > 1 && floorIndex % 2 === 0) {
      floorsSvg += `
        <rect x="${bx + 20}" y="${bottomY - 14}" width="${bw - 40}" height="12" fill="#718096" />
        <line x1="${bx + 20}" y1="${bottomY - 14}" x2="${bx + bw - 20}" y2="${bottomY - 14}" stroke="#2d3748" stroke-width="2" />
      `;
    }

    // Windows (supporting structural rhythm)
    const numWindows = Math.min(5, Math.max(2, Math.floor(bw / 90)));
    const winWidth = Math.round((bw - (numWindows + 1) * 16) / numWindows);
    const winHeight = Math.round(fHeight * 0.45);
    const winY = topY + Math.round((fHeight - winHeight) / 2);

    for (let w = 0; w < numWindows; w++) {
      const winX = bx + 16 + w * (winWidth + 16);
      floorsSvg += `
        <rect x="${winX}" y="${winY}" width="${winWidth}" height="${winHeight}" fill="${windowGlass}" stroke="${windowFrame}" stroke-width="2" rx="2" />
        <line x1="${winX + winWidth / 2}" y1="${winY}" x2="${winX + winWidth / 2}" y2="${winY + winHeight}" stroke="${windowFrame}" stroke-width="1.5" />
      `;
    }
  }

  // Roofline / Parapet
  const roofY = Math.round(boundaries[0] * height);
  const roofSvg = `
    <!-- Roof Parapet -->
    <rect x="${bx - 10}" y="${roofY - 12}" width="${bw + 20}" height="14" fill="${slabColor}" stroke="#1a202c" stroke-width="2" />
    ${difficulties.includes('roof_structure') ? `<rect x="${bx + 30}" y="${roofY - 35}" width="50" height="24" fill="#4a5568" /><text x="${bx + 35}" y="${roofY - 20}" font-family="sans-serif" font-size="9" fill="#e2e8f0">HVAC/TANK</text>` : ''}
  `;

  // Plinth / Ground
  const groundY = Math.round(boundaries[boundaries.length - 1] * height);
  const groundSvg = `
    <!-- Ground Baseline -->
    <rect x="0" y="${groundY}" width="${width}" height="${height - groundY}" fill="#4a5568" />
    <line x1="0" y1="${groundY}" x2="${width}" y2="${groundY}" stroke="#2d3748" stroke-width="3" />
    <rect x="0" y="${groundY + 12}" width="${width}" height="${height - groundY - 12}" fill="#2d3748" />
  `;

  // Difficulties overlays
  let overlays = '';
  if (difficulties.includes('trees_blocking')) {
    overlays += `
      <!-- Foliage / Tree occlusion -->
      <circle cx="${bx + 60}" cy="${groundY - 40}" r="55" fill="#2f855a" opacity="0.85" />
      <circle cx="${bx + 110}" cy="${groundY - 60}" r="45" fill="#276749" opacity="0.85" />
      <rect x="${bx + 75}" y="${groundY - 20}" width="16" height="50" fill="#744210" />
    `;
  }
  if (difficulties.includes('vehicles_foreground')) {
    overlays += `
      <!-- Vehicle blocking lower facade -->
      <rect x="${bx + bw - 140}" y="${groundY - 30}" width="120" height="38" rx="8" fill="#c53030" opacity="0.9" />
      <circle cx="${bx + bw - 115}" cy="${groundY + 8}" r="12" fill="#1a202c" />
      <circle cx="${bx + bw - 45}" cy="${groundY + 8}" r="12" fill="#1a202c" />
    `;
  }
  if (difficulties.includes('compound_wall')) {
    overlays += `
      <!-- Boundary Compound Wall -->
      <rect x="${bx - 20}" y="${groundY - 28}" width="${bw + 40}" height="32" fill="#a0aec0" stroke="#4a5568" stroke-width="2" />
      <line x1="${bx - 20}" y1="${groundY - 16}" x2="${bx + bw + 20}" y2="${groundY - 16}" stroke="#718096" stroke-width="1" />
    `;
  }
  if (difficulties.includes('shadows')) {
    overlays += `
      <!-- Diagonal Cast Shadow -->
      <polygon points="${bx},${roofY} ${bx + bw * 0.4},${roofY} ${bx + bw * 0.8},${groundY} ${bx},${groundY}" fill="#000000" opacity="0.28" />
    `;
  }

  // If POOR visibility, add heavy blur / extreme occlusion
  if (visibility === 'poor') {
    overlays += `
      <rect x="0" y="0" width="${width}" height="${height}" fill="#1a202c" opacity="0.65" />
      <circle cx="${bx + bw / 2}" cy="${by + bh / 2}" r="140" fill="#276749" opacity="0.92" />
      <text x="${width / 2}" y="${height / 2}" fill="#feb2b2" font-size="14" font-family="monospace" text-anchor="middle" font-weight="bold">HEAVILY OBSTRUCTED VIEW</text>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#90cdf4" />
          <stop offset="100%" stop-color="#ebf8ff" />
        </linearGradient>
      </defs>
      <!-- Sky Background -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#skyGrad)" />
      
      <!-- Building Façade -->
      <g id="building-facade">
        ${floorsSvg}
        ${roofSvg}
      </g>
      
      <!-- Ground & Street -->
      ${groundSvg}
      
      <!-- Real-world occlusions & artifacts -->
      ${overlays}
      
      <!-- Metadata Tag -->
      <text x="12" y="20" font-family="monospace" font-size="10" fill="#2d3748" opacity="0.65">BG-DATASET // F${floorCount} // ${style.toUpperCase()}</text>
    </svg>
  `.trim();
}

export function generateAllFloorDatasets(targetDir = 'datasets/floors'): BuildingAnnotation[] {
  const annotations: BuildingAnnotation[] = [];
  const maxFloor = 8;

  // We generate distinct buildings:
  // Train: 56 images (7 per floor count 1-8) ~ 70%
  // Validation: 16 images (2 per floor count 1-8) ~ 15%
  // Test: 16 images (2 per floor count 1-8) ~ 15%
  // Total: 88 unique buildings. No building is shared between splits!
  const splitsConfig = [
    { split: 'train' as const, countPerFloor: 7 },
    { split: 'validation' as const, countPerFloor: 2 },
    { split: 'test' as const, countPerFloor: 2 }
  ];

  let buildingSeq = 1;

  for (const { split, countPerFloor } of splitsConfig) {
    for (let floorCount = 1; floorCount <= maxFloor; floorCount++) {
      const splitFloorDir = path.join(targetDir, split, floorCount.toString());
      if (!fs.existsSync(splitFloorDir)) {
        fs.mkdirSync(splitFloorDir, { recursive: true });
      }

      for (let i = 1; i <= countPerFloor; i++) {
        const uniqueBuildingId = `bld-ds-${buildingSeq.toString().padStart(3, '0')}`;
        const imageName = `building_${buildingSeq.toString().padStart(3, '0')}.svg`;
        const imageRelPath = path.join(split, floorCount.toString(), imageName);
        const imageFullPath = path.join(targetDir, imageRelPath);

        const style = ARCH_STYLES[(buildingSeq + floorCount) % ARCH_STYLES.length];
        
        // Include difficult cases naturally
        let visibility: 'good' | 'partial' | 'poor' = 'good';
        const difficulties: string[] = [];

        if (buildingSeq % 5 === 0) {
          difficulties.push('trees_blocking');
          visibility = 'partial';
        }
        if (buildingSeq % 7 === 0) {
          difficulties.push('vehicles_foreground');
        }
        if (buildingSeq % 4 === 0) {
          difficulties.push('shadows');
        }
        if (buildingSeq % 11 === 0) {
          difficulties.push('compound_wall');
        }
        if (buildingSeq % 13 === 0) {
          difficulties.push('roof_structure');
        }
        if (buildingSeq % 17 === 0 && split !== 'train') {
          // Dedicated POOR visibility test case
          visibility = 'poor';
          difficulties.push('partial_facade', 'trees_blocking');
        }

        // Compute realistic structural floor boundary positions (relative Y)
        // Roof is typically between 0.12 and 0.24
        // Ground plinth is between 0.82 and 0.88
        const roofLevel = Math.round((0.14 + (floorCount % 3) * 0.02) * 100) / 100;
        const groundLevel = Math.round((0.84 + (floorCount % 2) * 0.02) * 100) / 100;
        const storeyHeight = (groundLevel - roofLevel) / floorCount;

        const floorBoundaries: number[] = [];
        floorBoundaries.push(roofLevel);
        for (let s = 1; s <= floorCount; s++) {
          const slabY = Math.round((roofLevel + s * storeyHeight) * 1000) / 1000;
          floorBoundaries.push(slabY);
        }

        const buildingBbox = {
          x: Math.round((0.15 + (buildingSeq % 4) * 0.02) * 100) / 100,
          y: roofLevel,
          width: Math.round((0.68 - (buildingSeq % 3) * 0.03) * 100) / 100,
          height: Math.round((groundLevel - roofLevel) * 100) / 100
        };

        const storeysConfig = floorCount === 1 ? 'Ground Floor (G)' : `G+${floorCount - 1}`;

        const annotation: BuildingAnnotation = {
          id: `ann-${split}-${floorCount}-${i}`,
          image: imageRelPath,
          floor_count: floorCount,
          storeys_config: storeysConfig,
          style,
          visibility,
          difficulties: difficulties.length > 0 ? difficulties : ['none'],
          building_bbox: buildingBbox,
          floor_boundaries: floorBoundaries,
          ground_level: groundLevel,
          roof_level: roofLevel,
          split,
          building_id: uniqueBuildingId,
          camera_angle_deg: Math.round((45 + (buildingSeq % 5) * 15))
        };

        // Write SVG image
        const svgContent = generateSvgContent(
          floorCount,
          style,
          visibility,
          difficulties,
          floorBoundaries,
          buildingBbox,
          buildingSeq
        );
        fs.writeFileSync(imageFullPath, svgContent, 'utf-8');

        // Also write per-image metadata annotation file alongside the image
        const jsonFullPath = imageFullPath.replace(/\.svg$/, '.json');
        fs.writeFileSync(jsonFullPath, JSON.stringify(annotation, null, 2), 'utf-8');

        annotations.push(annotation);
        buildingSeq++;
      }
    }
  }

  // Master annotations manifest
  const masterManifestPath = path.join(targetDir, 'annotations.json');
  fs.writeFileSync(masterManifestPath, JSON.stringify(annotations, null, 2), 'utf-8');

  console.log(`Generated ${annotations.length} building façade samples in ${targetDir}`);
  return annotations;
}

// Execute if run directly
if (process.argv[1]?.endsWith('generateDataset.ts') || process.argv[1]?.endsWith('generateDataset.js')) {
  generateAllFloorDatasets();
}
