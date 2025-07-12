import { Image } from 'image-js';
import { Vector2, ProcessingConfig } from './types';
import { ColorPredicate, createWhiteBoundaryPredicate } from './color';
import { floodFill, FloodFillConfig } from './flood-fill';
import { scaleCoordinates, scaleCoordinatesFloat } from './coordinate-utils';

/**
 * Region extraction result
 */
export interface ExtractedRegion {
  points: Array<[number, number]>;
  pixelCount: number;
  isValid: boolean;
  validationErrors?: string[];
}

/**
 * Extract a region from an image starting at a seed point
 * @param image - Image to extract region from
 * @param seed - Seed point to start extraction
 * @param predicate - Color predicate for flood fill
 * @param config - Processing configuration
 * @returns Extracted region with validation info
 */
export const extractRegionFromSeed = (
  image: Image,
  seed: Vector2,
  predicate: ColorPredicate,
  config: ProcessingConfig = {}
): ExtractedRegion => {
  const {
    maxPixels = 2000000,
    minArea = 100,
  } = config;
  
  // Configure flood fill
  const floodFillConfig: FloodFillConfig = {
    step: 1,
    maxPixels: maxPixels,
  };
  
  // Perform flood fill to get region points
  // Note: floodFill returns points in original coordinates when scale factor is provided
  const points = floodFill(
    image,
    seed,
    predicate,
    floodFillConfig,
    1.0 // No scaling factor here since we handle it externally
  );
  
  // Validate the region
  const validationErrors: string[] = [];
  const pixelCount = points.length;
  
  if (pixelCount < minArea) {
    validationErrors.push(
      `Region too small: ${pixelCount} pixels < ${minArea} minimum`
    );
  }
  
  if (pixelCount >= maxPixels) {
    validationErrors.push(
      `Region too large: ${pixelCount} pixels >= ${maxPixels} maximum`
    );
  }
  
  return {
    points: [...points], // Convert readonly array to mutable
    pixelCount,
    isValid: validationErrors.length === 0,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
  };
};

/**
 * Extract region using white boundary detection
 * @param image - Image to process
 * @param seed - Seed point
 * @param config - Processing configuration
 * @returns Extracted region
 */
export const extractRegionWithWhiteBoundary = (
  image: Image,
  seed: Vector2,
  config: ProcessingConfig = {}
): ExtractedRegion => {
  const { whiteThreshold = 230 } = config;
  
  // Create predicate that stops at white/light boundaries
  const predicate = createWhiteBoundaryPredicate(whiteThreshold);
  
  return extractRegionFromSeed(image, seed, predicate, config);
};

/**
 * Scale region coordinates from one coordinate system to another (preserves floating-point precision)
 * @param region - Region points to scale
 * @param scaleFactor - Scale factor to apply
 * @returns Scaled region points with floating-point precision
 */
export const scaleRegionCoordinatesFloat = (
  region: ReadonlyArray<[number, number]>,
  scaleFactor: number
): Array<[number, number]> => {
  if (scaleFactor === 1.0) {
    return [...region];
  }
  
  return region.map(([x, y]) => [
    x * scaleFactor,
    y * scaleFactor,
  ] as [number, number]);
};

/**
 * Scale region coordinates from one coordinate system to another
 * @param region - Region points to scale
 * @param scaleFactor - Scale factor to apply
 * @returns Scaled region points
 */
export const scaleRegionCoordinates = (
  region: ReadonlyArray<[number, number]>,
  scaleFactor: number
): Array<[number, number]> => {
  if (scaleFactor === 1.0) {
    return [...region];
  }
  
  return region.map(([x, y]) => [
    Math.round(x * scaleFactor),
    Math.round(y * scaleFactor),
  ] as [number, number]);
};

/**
 * Refine region boundaries by removing isolated pixels or filling small gaps
 * @param region - Region points
 * @param image - Original image for context
 * @param config - Configuration for refinement
 * @returns Refined region points
 */
export const refineRegionBoundaries = (
  region: ReadonlyArray<[number, number]>,
  image: Image,
  config: {
    removeIsolatedPixels?: boolean;
    fillSmallGaps?: boolean;
    minNeighbors?: number;
  } = {}
): Array<[number, number]> => {
  const {
    removeIsolatedPixels = true,
    fillSmallGaps = false,
    minNeighbors = 2,
  } = config;
  
  if (!removeIsolatedPixels && !fillSmallGaps) {
    return [...region];
  }
  
  // Create a set for fast lookup
  const regionSet = new Set(region.map(([x, y]) => `${x},${y}`));
  const refined: Array<[number, number]> = [];
  
  // Check neighbors for each point
  const countNeighbors = (x: number, y: number): number => {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (regionSet.has(`${x + dx},${y + dy}`)) {
          count++;
        }
      }
    }
    return count;
  };
  
  // Remove isolated pixels
  if (removeIsolatedPixels) {
    for (const [x, y] of region) {
      const neighbors = countNeighbors(x, y);
      if (neighbors >= minNeighbors) {
        refined.push([x, y]);
      }
    }
  } else {
    refined.push(...region);
  }
  
  // Fill small gaps (simplified implementation)
  if (fillSmallGaps) {
    const refinedSet = new Set(refined.map(([x, y]) => `${x},${y}`));
    const additions: Array<[number, number]> = [];
    
    // Check for gaps that should be filled
    for (const [x, y] of refined) {
      // Check 3x3 neighborhood
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx},${ny}`;
          
          // If this pixel is not in the region but has many region neighbors
          if (!refinedSet.has(key) && !regionSet.has(key)) {
            const neighbors = countNeighbors(nx, ny);
            if (neighbors >= 6) { // Surrounded by region pixels
              additions.push([nx, ny]);
            }
          }
        }
      }
    }
    
    refined.push(...additions);
  }
  
  return refined;
};

/**
 * Validate that a region meets the specified constraints
 * @param region - Region to validate
 * @param minArea - Minimum area in pixels
 * @param maxPixels - Maximum pixels allowed
 * @returns Validation result with any error messages
 */
export const validateRegion = (
  region: ReadonlyArray<[number, number]>,
  minArea: number = 100,
  maxPixels: number = 2000000
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const pixelCount = region.length;
  
  if (pixelCount < minArea) {
    errors.push(
      `Region too small: ${pixelCount} pixels < ${minArea} minimum`
    );
  }
  
  if (pixelCount > maxPixels) {
    errors.push(
      `Region too large: ${pixelCount} pixels > ${maxPixels} maximum`
    );
  }
  
  if (pixelCount === 0) {
    errors.push('Region is empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Process multiple seed points to extract regions
 * @param image - Image to process
 * @param seeds - Array of seed points
 * @param predicate - Color predicate for region detection
 * @param config - Processing configuration
 * @returns Array of extracted regions
 */
export const extractMultipleRegions = (
  image: Image,
  seeds: ReadonlyArray<Vector2>,
  predicate: ColorPredicate,
  config: ProcessingConfig = {}
): ExtractedRegion[] => {
  return seeds.map((seed, index) => {
    console.log(`🎯 Extracting region ${index + 1}/${seeds.length} from seed (${seed.x}, ${seed.y})`);
    
    try {
      const region = extractRegionFromSeed(image, seed, predicate, config);
      
      if (!region.isValid) {
        console.warn(`⚠️ Region ${index + 1} validation failed:`, region.validationErrors);
      }
      
      return region;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to extract region ${index + 1}:`, error);
      return {
        points: [],
        pixelCount: 0,
        isValid: false,
        validationErrors: [`Extraction failed: ${errorMessage}`],
      };
    }
  });
}; 