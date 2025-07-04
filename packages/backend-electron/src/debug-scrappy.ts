import { Image } from 'image-js';
import * as fs from 'fs/promises';

// ============================================================================
// Types
// ============================================================================

/** A 2D point with x and y coordinates */
type Point2D = Readonly<{ x: number; y: number }>;

/** A bounding frame with position, dimensions, and rotation */
type BoundingFrame = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
}>;

/** RGB color tuple */
type RGB = readonly [number, number, number];

/** Function to determine if a pixel should be included based on color similarity */
type ColorPredicate = (target: RGB, reference: RGB) => boolean;

/** Configuration for flood fill algorithm */
type FloodFillConfig = {
  step?: number;
  maxPixels?: number;
};

/** Configuration for image processing */
type ProcessingConfig = {
  downsampleFactor?: number;
  whiteThreshold?: number;  // Minimum brightness to consider as white boundary (0-255)
  minArea?: number;
  maxPixels?: number;  // Maximum pixels allowed in flood fill region
  padding?: number;
  minRotation?: number;  // Minimum rotation angle to apply (in degrees)
  enableAngleRefine?: boolean;  // Enable angle refinement search
  angleRefineWindow?: number;  // Search window for angle refinement (in degrees)
  angleRefineIterations?: number;  // Number of iterations for angle refinement
  usePca?: boolean;  // Use PCA for orientation estimation
};

/** Structure for input JSON data */
type InputData = {
  basename: string;
  imagePath: string;
  seedCoordinates: ReadonlyArray<Point2D>;
};

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Calculate the brightness of an RGB color
 * @param color - RGB color values
 * @returns Average of RGB values (0-255)
 */
const calculateBrightness = (color: RGB): number => 
  (color[0] + color[1] + color[2]) / 3;

/**
 * Create a brightness-based color predicate
 * @param threshold - Maximum brightness difference allowed
 * @returns Predicate function for color matching
 */
const createBrightnessPredicate = (threshold: number): ColorPredicate => 
  (target, reference) => 
    Math.abs(calculateBrightness(target) - calculateBrightness(reference)) < threshold;

/**
 * Create a white-boundary color predicate
 * Stops propagation only when reaching white or near-white pixels
 * @param whiteThreshold - Minimum brightness to consider as white (0-255)
 * @returns Predicate function that returns false for white pixels
 */
const createWhiteBoundaryPredicate = (whiteThreshold: number = 250): ColorPredicate => {
  let boundaryHits = 0;
  return (target, reference) => {
    const targetBrightness = calculateBrightness(target);
    // Log when we hit potential boundaries
    if (targetBrightness >= whiteThreshold && boundaryHits < 5) {
      console.log(`🚧 Hit boundary pixel: RGB(${target.join(', ')}), brightness=${targetBrightness.toFixed(1)}`);
      boundaryHits++;
    }
    // Continue flood fill unless we hit a white/near-white pixel
    return targetBrightness < whiteThreshold;
  };
};

// ============================================================================
// Geometric Utilities
// ============================================================================

/**
 * Check if a point is within image bounds
 * @param image - The image to check against
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns True if point is within bounds
 */
const isInBounds = (image: Image, x: number, y: number): boolean =>
  x >= 0 && x < image.width && y >= 0 && y < image.height;

/**
 * Rotate a point around the origin
 * @param point - Point to rotate
 * @param angleRad - Rotation angle in radians
 * @returns Rotated point
 */
const rotatePoint = (
  point: Point2D,
  angleRad: number
): Point2D => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
};

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
const degreesToRadians = (degrees: number): number => 
  degrees * Math.PI / 180;

/**
 * Normalize angle to -180 to 180 range
 * @param degrees - Angle in degrees
 * @returns Normalized angle
 */
const normalizeAngle = (degrees: number): number => {
  let angle = degrees;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
};

/**
 * Normalize rotation to smallest absolute value (-45 to 45 range)
 * while maintaining the same rectangle orientation
 * @param rotation - Rotation angle in degrees
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @returns Normalized rotation and possibly swapped dimensions
 */
const normalizeRotation = (
  rotation: number,
  width: number,
  height: number
): { rotation: number; width: number; height: number } => {
  let normalizedRotation = normalizeAngle(rotation);
  let finalWidth = width;
  let finalHeight = height;
  
  console.log(`🔄 normalizeRotation: input rotation=${rotation.toFixed(2)}°, normalized=${normalizedRotation.toFixed(2)}°`);
  console.log(`📐 normalizeRotation: input dimensions=${width.toFixed(1)}×${height.toFixed(1)}`);
  
  // Handle angles near ±180° by converting to near 0°
  if (normalizedRotation > 135 || normalizedRotation < -135) {
    console.log(`🔄 normalizeRotation: angle near ±180°, flipping by 180°`);
    normalizedRotation = normalizeAngle(normalizedRotation + 180);
  }
  
  // Convert angles close to ±90° to smaller angles by swapping width/height
  // Note: Adding ±90° keeps the edge set identical but gives a smaller absolute angle
  // This ensures we always work with rotations in the -45° to 45° range
  if (normalizedRotation > 45) {
    console.log(`🔄 normalizeRotation: angle > 45°, rotating by -90° and swapping dimensions`);
    normalizedRotation -= 90;
    [finalWidth, finalHeight] = [finalHeight, finalWidth];
  } else if (normalizedRotation < -45) {
    console.log(`🔄 normalizeRotation: angle < -45°, rotating by +90° and swapping dimensions`);
    normalizedRotation += 90;
    [finalWidth, finalHeight] = [finalHeight, finalWidth];
  }
  
  console.log(`🔄 normalizeRotation: final rotation=${normalizedRotation.toFixed(2)}°, dimensions=${finalWidth.toFixed(1)}×${finalHeight.toFixed(1)}`);
  
  return {
    rotation: normalizedRotation,
    width: finalWidth,
    height: finalHeight
  };
};

// ============================================================================
// Flood Fill Algorithm
// ============================================================================

/**
 * Perform flood fill to find connected regions of similar color
 * @param image - Source image
 * @param seed - Starting point
 * @param predicate - Function to determine if pixel should be included
 * @param config - Algorithm configuration
 * @param downsampleFactor - Factor by which the image was downsampled (1.0 = no downsampling)
 * @returns Array of points in the filled region (in original image coordinates)
 */
const floodFill = (
  image: Image,
  seed: Point2D,
  predicate: ColorPredicate,
  config: FloodFillConfig = {},
  downsampleFactor: number = 1.0
): ReadonlyArray<[number, number]> => {
  const { 
    step = 1, 
    maxPixels = 500000
  } = config;
  
  // Enforce step = 1 to avoid visited array indexing issues
  if (step !== 1) {
    console.warn('⚠️ Step > 1 is not supported with current visited array implementation. Using step = 1.');
  }
  const actualStep = 1;
  
  const { width, height } = image;

  if (!isInBounds(image, seed.x, seed.y)) {
    throw new Error('Seed point out of image bounds');
  }

  const seedColor = image.getPixelXY(seed.x, seed.y).slice(0, 3) as unknown as RGB;
  const seedBrightness = calculateBrightness(seedColor);
  
  console.log(`🎨 Seed pixel: RGB(${seedColor.join(', ')}), brightness: ${seedBrightness.toFixed(1)}`);
  
  if (seedBrightness > 200) {
    console.log(`⚠️ Warning: Seed pixel is very bright (${seedBrightness.toFixed(1)})`);
  }

  const visited = new Uint8Array(width * height);
  const queue: Point2D[] = [seed];
  const region: [number, number][] = [];

  // Use 8 directions for better connectivity
  const directions = [
    [-actualStep, 0], [actualStep, 0], [0, -actualStep], [0, actualStep],
    [-actualStep, -actualStep], [actualStep, -actualStep], [-actualStep, actualStep], [actualStep, actualStep]
  ];

  let pixelsChecked = 0;

  while (queue.length > 0) {
    // Check if we've exceeded the maximum pixels limit
    if (region.length >= maxPixels) {
      console.warn(`⚠️ Flood fill terminated: reached maximum pixel limit (${maxPixels}). Region may be incomplete.`);
      throw new Error(`Region too large: exceeded ${maxPixels} pixels. Consider increasing maxPixels or using a more restrictive color predicate.`);
    }
    
    const { x, y } = queue.shift()!;
    const idx = y * width + x;
    
    if (visited[idx]) continue;
    visited[idx] = 1;
    pixelsChecked++;

    const currentColor = image.getPixelXY(x, y).slice(0, 3) as unknown as RGB;
    if (!predicate(currentColor, seedColor)) continue;
    
    // Store points in original image coordinates
    region.push([x / downsampleFactor, y / downsampleFactor]);

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (isInBounds(image, nx, ny) && !visited[ny * width + nx]) {
        queue.push({ x: nx, y: ny });
      }
    }
  }

  console.log(`🔍 Flood fill: checked ${pixelsChecked} pixels, found ${region.length} pixels`);

  if (region.length === 0) {
    throw new Error('No region found');
  }

  return region;
};

// ============================================================================
// Convex Hull (Andrew's Monotone Chain Algorithm)
// ============================================================================

/**
 * Compute the convex hull of a set of points
 * @param points - Array of 2D points
 * @returns Vertices of the convex hull in counter-clockwise order
 */
const computeConvexHull = (points: ReadonlyArray<[number, number]>): Point2D[] => {
  const pts = points
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
  
  if (pts.length <= 1) return pts;
  
  const cross = (o: Point2D, a: Point2D, b: Point2D): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  
  const buildHull = (points: Point2D[]): Point2D[] => {
    const hull: Point2D[] = [];
    for (const p of points) {
      // Note: We use cross <= 0 to remove collinear points, keeping only the extreme vertices
      // This creates a strictly convex hull, which is fine for minimum-area rectangle calculation
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
        hull.pop();
      }
      hull.push(p);
    }
    hull.pop(); // Remove last point as it's repeated
    return hull;
  };
  
  const lower = buildHull(pts);
  const upper = buildHull([...pts].reverse());
  
  return [...lower, ...upper];
};

// ============================================================================
// Rotating Calipers Algorithm
// ============================================================================

/**
 * Find the minimum area bounding rectangle using rotating calipers
 * @param points - Array of points to bound
 * @param minArea - Minimum acceptable area
 * @param config - Processing configuration for advanced options
 * @returns Bounding frame with position, size, and rotation
 */
const findMinimalBoundingRectangle = (
  points: ReadonlyArray<[number, number]>,
  minArea = 100,
  config: ProcessingConfig = {}
): BoundingFrame => {
  if (points.length < 3) {
    throw new Error('Not enough points to compute bounding rectangle');
  }

  console.log(`🔍 Computing bounding box for ${points.length} points`);

  const hull = computeConvexHull(points);
  console.log(`🔸 Convex hull has ${hull.length} vertices`);
  
  if (hull.length < 3) {
    // Degenerate case - all points are collinear
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      rotation: 0
    };
  }
  
  let minimalArea = Infinity;
  let bestRectangle = { center: { x: 0, y: 0 }, width: 0, height: 0, angle: 0 };
  let bestEdgeIndex = -1;
  
  // Test each edge of the convex hull
  for (let i = 0; i < hull.length; i++) {
    const p1 = hull[i];
    const p2 = hull[(i + 1) % hull.length];
    
    const edgeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const rotatedHull = hull.map(p => rotatePoint(p, -edgeAngle));
    
    const xs = rotatedHull.map(p => p.x);
    const ys = rotatedHull.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const width = maxX - minX;
    const height = maxY - minY;
    const area = width * height;
    
    if (area < minimalArea) {
      minimalArea = area;
      bestEdgeIndex = i;
      const center = rotatePoint(
        { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        edgeAngle
      );
      bestRectangle = {
        center,
        width,
        height,
        angle: edgeAngle * 180 / Math.PI
      };
    }
  }
  
  console.log(`🔄 Minimal rectangle: ${bestRectangle.width.toFixed(1)}×${bestRectangle.height.toFixed(1)}, rotation=${bestRectangle.angle.toFixed(1)}°`);
  console.log(`📐 Best edge: ${bestEdgeIndex}/${hull.length - 1}, from (${hull[bestEdgeIndex].x.toFixed(0)}, ${hull[bestEdgeIndex].y.toFixed(0)}) to (${hull[(bestEdgeIndex + 1) % hull.length].x.toFixed(0)}, ${hull[(bestEdgeIndex + 1) % hull.length].y.toFixed(0)})`);
  
  if (minimalArea < minArea) {
    throw new Error(`Region too small: ${minimalArea.toFixed(0)} < ${minArea}`);
  }
  
  // Apply PCA if enabled
  let workingAngle = bestRectangle.angle;
  if (config.usePca) {
    const pcaAngle = computePCAOrientation(points);
    const pointsAsPoint2D = points.map(([x, y]) => ({ x, y }));
    workingAngle = chooseBestAngle(bestRectangle.angle, pcaAngle, pointsAsPoint2D, bestRectangle.center);
    console.log(`📊 After PCA: workingAngle=${workingAngle.toFixed(2)}°`);
  }
  
  // Apply angle refinement if enabled
  let finalAngle = workingAngle;
  if (config.enableAngleRefine) {
    const pointsAsPoint2D = points.map(([x, y]) => ({ x, y }));
    finalAngle = refineAngle(
      pointsAsPoint2D,
      bestRectangle.center,
      workingAngle,
      config.angleRefineWindow || 3,
      config.angleRefineIterations || 10
    );
    console.log(`🎯 After refinement: finalAngle=${finalAngle.toFixed(2)}°`);
  }
  
  console.log(`🔄 Before normalization: angle=${finalAngle.toFixed(2)}°, dimensions=${bestRectangle.width.toFixed(1)}×${bestRectangle.height.toFixed(1)}`);
  
  // Normalize rotation to smallest absolute value
  const normalized = normalizeRotation(finalAngle, bestRectangle.width, bestRectangle.height);
  
  // Convert from center-based to corner-based representation
  const angleRad = degreesToRadians(normalized.rotation);
  const halfDiagonal = rotatePoint(
    { x: -normalized.width / 2, y: -normalized.height / 2 },
    angleRad
  );
  
  return {
    x: bestRectangle.center.x + halfDiagonal.x,
    y: bestRectangle.center.y + halfDiagonal.y,
    width: normalized.width,
    height: normalized.height,
    rotation: normalized.rotation
  };
};

// ============================================================================
// Angle Refinement Algorithm
// ============================================================================

/**
 * Refine the rotation angle to minimize the projected bounding box height
 * @param points - Points to analyze
 * @param center - Center point of rotation
 * @param initialDeg - Initial angle estimate in degrees
 * @param windowDeg - Search window size in degrees
 * @param iterations - Number of refinement iterations
 * @returns Refined angle in degrees
 */
const refineAngle = (
  points: ReadonlyArray<Point2D>,
  center: Point2D,
  initialDeg: number,
  windowDeg: number = 3,
  iterations: number = 10
): number => {
  const toRad = (d: number) => d * Math.PI / 180;
  let lo = initialDeg - windowDeg;
  let hi = initialDeg + windowDeg;

  const computeHeight = (deg: number): number => {
    const a = toRad(deg);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const p of points) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      // Rotate point around center
      const y = dx * sin + dy * cos;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return maxY - minY;
  };

  // Golden section search
  for (let i = 0; i < iterations; i++) {
    const m1 = lo + (hi - lo) * 0.382;
    const m2 = lo + (hi - lo) * 0.618;
    if (computeHeight(m1) < computeHeight(m2)) {
      hi = m2;
    } else {
      lo = m1;
    }
  }
  
  const refined = (lo + hi) / 2;
  console.log(`🎯 Angle refinement: ${initialDeg.toFixed(2)}° → ${refined.toFixed(2)}° (Δ=${(refined - initialDeg).toFixed(2)}°)`);
  return refined;
};

// ============================================================================
// Principal Component Analysis (PCA) Orientation
// ============================================================================

/**
 * Compute the principal axis orientation using PCA
 * @param points - Array of points to analyze
 * @returns Angle in degrees of the principal axis
 */
const computePCAOrientation = (points: ReadonlyArray<[number, number]>): number | null => {
  if (points.length < 3) return null;
  
  // Compute mean
  let sx = 0, sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  const n = points.length;
  const mx = sx / n;
  const my = sy / n;
  
  // Compute covariance matrix elements
  let sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of points) {
    const dx = x - mx;
    const dy = y - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  
  // Compute eigenvalues and eigenvectors
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const discriminant = (trace * trace) / 4 - det;
  
  if (discriminant < 0) {
    console.warn('⚠️ PCA: Negative discriminant, falling back to calipers');
    return null;
  }
  
  // Smallest eigenvalue
  const lambda = trace / 2 - Math.sqrt(discriminant);
  
  // Corresponding eigenvector
  const vx = lambda - syy;
  const vy = sxy;
  
  // Handle degenerate case (circular or no clear orientation)
  if (Math.abs(vx) < 1e-10 && Math.abs(vy) < 1e-10) {
    console.warn('⚠️ PCA: Degenerate case (equal eigenvalues), falling back to calipers');
    return null;
  }
  
  const pcaAngle = Math.atan2(vy, vx) * 180 / Math.PI;
  console.log(`📊 PCA orientation: ${pcaAngle.toFixed(2)}°`);
  return pcaAngle;
};

/**
 * Choose the best angle between calipers and PCA based on resulting bounding height
 * @param angleCalipersDeg - Angle from rotating calipers
 * @param anglePcaDeg - Angle from PCA (may be null)
 * @param points - Points to analyze
 * @param center - Center point for rotation
 * @returns Best angle in degrees
 */
const chooseBestAngle = (
  angleCalipersDeg: number,
  anglePcaDeg: number | null,
  points: ReadonlyArray<Point2D>,
  center: Point2D
): number => {
  if (anglePcaDeg === null) {
    return angleCalipersDeg;
  }
  
  // Compute heights for both angles
  const computeHeight = (deg: number): number => {
    const a = deg * Math.PI / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const p of points) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const y = dx * sin + dy * cos;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return maxY - minY;
  };
  
  const heightCalipers = computeHeight(angleCalipersDeg);
  const heightPca = computeHeight(anglePcaDeg);
  
  // Choose angle that gives smaller height
  const angleDiff = Math.abs(normalizeAngle(angleCalipersDeg - anglePcaDeg));
  
  if (angleDiff > 5 && heightPca < heightCalipers) {
    console.log(`📊 Using PCA angle (height: ${heightPca.toFixed(1)} < ${heightCalipers.toFixed(1)})`);
    return anglePcaDeg;
  } else {
    console.log(`📐 Using calipers angle (height: ${heightCalipers.toFixed(1)})`);
    return angleCalipersDeg;
  }
};

// ============================================================================
// Debug Visualization
// ============================================================================

/**
 * Create a debug image showing flood fill results and bounding box
 * @param image - Base image
 * @param region - Flood fill region points
 * @param seed - Original seed point
 * @param boundingFrame - Computed bounding frame
 * @returns Debug image with visualizations
 */
const createDebugImage = (
  image: Image,
  region: ReadonlyArray<[number, number]>,
  seed: Point2D,
  boundingFrame: BoundingFrame
): Image => {
  const debugImage = image.clone();
  
  // Draw flood fill region in red
  for (const [x, y] of region) {
    debugImage.setPixelXY(x, y, [255, 0, 0, 255]);
  }
  
  // Draw a large blue circle around the seed point
  const drawCircle = (centerX: number, centerY: number, radius: number, color: number[]) => {
    // Use Bresenham's circle algorithm
    let x = radius;
    let y = 0;
    let radiusError = 1 - x;
    
    while (x >= y) {
      // Draw 8 octants
      const points = [
        [centerX + x, centerY + y],
        [centerX + y, centerY + x],
        [centerX - y, centerY + x],
        [centerX - x, centerY + y],
        [centerX - x, centerY - y],
        [centerX - y, centerY - x],
        [centerX + y, centerY - x],
        [centerX + x, centerY - y]
      ];
      
      for (const [px, py] of points) {
        if (isInBounds(debugImage, px, py)) {
          debugImage.setPixelXY(px, py, color);
        }
      }
      
      y++;
      if (radiusError < 0) {
        radiusError += 2 * y + 1;
      } else {
        x--;
        radiusError += 2 * (y - x + 1);
      }
    }
  };
  
  // Draw multiple concentric circles for thickness
  const blueColor = [0, 0, 255, 255];
  for (let r = 15; r <= 20; r++) {
    drawCircle(seed.x, seed.y, r, blueColor);
  }
  
  // Draw seed point in green (on top of the circle)
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const px = seed.x + dx;
      const py = seed.y + dy;
      if (isInBounds(debugImage, px, py)) {
        debugImage.setPixelXY(px, py, [0, 255, 0, 255]);
      }
    }
  }
  
  // Draw bounding rectangle in blue
  const angleRad = degreesToRadians(boundingFrame.rotation);
  const corners = [
    { x: 0, y: 0 },
    { x: boundingFrame.width, y: 0 },
    { x: boundingFrame.width, y: boundingFrame.height },
    { x: 0, y: boundingFrame.height }
  ].map(corner => ({
    x: boundingFrame.x + corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad),
    y: boundingFrame.y + corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad)
  }));
  
  // Simple line drawing
  const drawLine = (p1: Point2D, p2: Point2D, color: number[]) => {
    const steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(p1.x + (p2.x - p1.x) * t);
      const y = Math.round(p1.y + (p2.y - p1.y) * t);
      if (isInBounds(debugImage, x, y)) {
        debugImage.setPixelXY(x, y, color);
      }
    }
  };
  
  for (let i = 0; i < 4; i++) {
    drawLine(corners[i], corners[(i + 1) % 4], [0, 0, 255, 255]);
  }
  
  return debugImage;
};

// ============================================================================
// Main Processing Functions
// ============================================================================

/**
 * Process a single seed point to extract a sub-image
 * @param original - Original full-resolution image
 * @param scaled - Downsampled image for processing
 * @param seed - Seed point in original image coordinates
 * @param index - Index for output naming
 * @param outputDir - Output directory path
 * @param basename - Base name for output files
 * @param config - Processing configuration
 */
const processSeedPoint = async (
  original: Image,
  scaled: Image,
  seed: Point2D,
  index: number,
  outputDir: string,
  basename: string,
  config: ProcessingConfig = {}
): Promise<void> => {
  const {
    downsampleFactor = 0.5,
    whiteThreshold = 230,  // Lowered to detect off-white/light gray boundaries
    minArea = 100,
    maxPixels = 2000000,  // Increased default to 2 million pixels
    padding = 0,
    minRotation = 0.2  // Default to 0.2° to suppress float noise
  } = config;
  
  console.log(`\n🎯 Processing seed ${index} for ${basename}: (${seed.x}, ${seed.y})`);
  
  // Scale seed point to downsampled coordinates
  const scaledSeed: Point2D = {
    x: Math.round(seed.x * downsampleFactor),
    y: Math.round(seed.y * downsampleFactor)
  };

  // Use white boundary predicate since images are separated by white background
  const predicate = createWhiteBoundaryPredicate(whiteThreshold); // Stop at pixels with brightness >= whiteThreshold
  const floodFillConfig: FloodFillConfig = {
    step: 1,
    maxPixels: maxPixels
  };
  
  // Perform flood fill (returns points in original coordinates)
  const region = floodFill(scaled, scaledSeed, predicate, floodFillConfig, downsampleFactor);
  
  // Find minimal bounding rectangle using full-resolution coordinates
  const frame = findMinimalBoundingRectangle(region, minArea, config);
  
  // Create and save debug image (need to scale region back for visualization)
  const scaledRegion = region.map(([x, y]) => [
    x * downsampleFactor,
    y * downsampleFactor
  ] as [number, number]);
  const scaledFrame: BoundingFrame = {
    x: frame.x * downsampleFactor,
    y: frame.y * downsampleFactor,
    width: frame.width * downsampleFactor,
    height: frame.height * downsampleFactor,
    rotation: frame.rotation
  };
  const debugImage = createDebugImage(scaled, scaledRegion, scaledSeed, scaledFrame);
  await debugImage.save(`${outputDir}/debug_floodfill_${index}.png`);
  console.log(`💾 Saved debug image: debug_floodfill_${index}.png`);

  console.log(`🖼️ Frame: ${frame.width.toFixed(0)}×${frame.height.toFixed(0)} at (${frame.x.toFixed(0)}, ${frame.y.toFixed(0)}), rotation=${frame.rotation.toFixed(1)}°`);

  // Strategy: For tight cropping, we'll extract exactly the bounding box region
  // by creating a mask and extracting only the rotated rectangle area
  
  const normalizedRotation = normalizeAngle(frame.rotation);
  console.log(`🔄 Rotation: frame.rotation=${frame.rotation.toFixed(2)}°, normalized=${normalizedRotation.toFixed(2)}°`);
  
  // Calculate the four corners of the bounding rectangle
  const angleRad = degreesToRadians(frame.rotation);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  const corners = [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width * cos, y: frame.y + frame.width * sin },
    { x: frame.x + frame.width * cos - frame.height * sin, y: frame.y + frame.width * sin + frame.height * cos },
    { x: frame.x - frame.height * sin, y: frame.y + frame.height * cos }
  ];
  
  // Find the axis-aligned bounding box (we still need this for the canvas size)
  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxX = Math.min(original.width - 1, Math.ceil(Math.max(...xs)));
  const maxY = Math.min(original.height - 1, Math.ceil(Math.max(...ys)));
  
  // Create a tighter crop that still contains the rotated rectangle
  const cropX = minX;
  const cropY = minY;
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  
  console.log(`✂️ Tight crop: ${cropWidth}×${cropHeight} at (${cropX}, ${cropY})`);
  
  // First crop to the bounding region
  const croppedImage = original.crop({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight
  });
  
  // Now we need to rotate around the correct center point
  // The center of our bounding box in the cropped image coordinates
  const bboxCenterInCrop = {
    x: frame.x + frame.width * cos / 2 - frame.height * sin / 2 - cropX,
    y: frame.y + frame.width * sin / 2 + frame.height * cos / 2 - cropY
  };
  
  let finalImage = croppedImage;
  
  if (Math.abs(normalizedRotation) > minRotation) {
    console.log(`🔄 Rotating by ${-normalizedRotation.toFixed(1)}° for tight crop`);
    // Rotate the image
    finalImage = croppedImage.rotate(-normalizedRotation);
    
    // After rotation, crop to just the content area
    // The rotation expands the canvas, so we need to find where our original rectangle ended up
    const rotatedWidth = finalImage.width;
    const rotatedHeight = finalImage.height;
    
    // Calculate the final crop to extract just the rectangle content
    const expandX = (rotatedWidth - cropWidth) / 2;
    const expandY = (rotatedHeight - cropHeight) / 2;
    
    // The rotated rectangle should now be axis-aligned
    // Calculate its position in the rotated image
    const finalCropX = Math.max(0, Math.round(expandX + bboxCenterInCrop.x - frame.width / 2));
    const finalCropY = Math.max(0, Math.round(expandY + bboxCenterInCrop.y - frame.height / 2));
    const finalCropWidth = Math.min(Math.round(frame.width), rotatedWidth - finalCropX);
    const finalCropHeight = Math.min(Math.round(frame.height), rotatedHeight - finalCropY);
    
    console.log(`✂️ Final tight crop after rotation: ${finalCropWidth}×${finalCropHeight} at (${finalCropX}, ${finalCropY})`);
    
    finalImage = finalImage.crop({
      x: finalCropX,
      y: finalCropY,
      width: finalCropWidth,
      height: finalCropHeight
    });
  } else {
    console.log(`🔄 Skipping rotation: ${Math.abs(normalizedRotation).toFixed(1)}° < ${minRotation}° threshold`);
    // If not rotating, we still need to extract just the rectangle from the crop
    // This is more complex as we'd need to mask out the corners
    // For now, we'll keep the current behavior for non-rotated cases
  }

  await finalImage.save(`${outputDir}/subimage_${index}.png`);
};

/**
 * Process an image with multiple seed points
 * @param inputPath - Path to input image
 * @param seeds - Array of seed points
 * @param outputDir - Output directory
 * @param basename - Base name for output files
 * @param config - Processing configuration
 */
export const processImage = async (
  inputPath: string,
  seeds: ReadonlyArray<Point2D>,
  outputDir: string,
  basename: string,
  config: ProcessingConfig = {}
): Promise<void> => {
  const { downsampleFactor = 0.5 } = config;
  
  const original = await Image.load(inputPath);
  console.log(`📐 Input image: ${original.width}×${original.height}`);
  
  const scaled = original.resize({
    width: Math.round(original.width * downsampleFactor),
    height: Math.round(original.height * downsampleFactor)
  });
  console.log(`📏 Scaled image: ${scaled.width}×${scaled.height} (factor: ${downsampleFactor})`);

  for (let index = 0; index < seeds.length; index++) {
    const seed = seeds[index];
    await processSeedPoint(original, scaled, seed, index, outputDir, basename, config);
  }

  // await Promise.all(
  //   seeds.map((seed, index) => 
  //     processSeedPoint(original, scaled, seed, index, outputDir, basename, config)
  //   )
  // );
};

// ============================================================================
// Debug Entry Point
// ============================================================================

/**
 * Main function for debugging
 */
const main = async (): Promise<void> => {
  const INPUT_JSON_PATH = './src/debug-input.json';
  const OUTPUT_DIR = './debug-output';

  console.log('🚀 Starting image processing...');
  console.log(`📁 Input JSON: ${INPUT_JSON_PATH}`);
  console.log(`📂 Output: ${OUTPUT_DIR}`);

  try {
    // Read and parse input JSON
    const inputData = await fs.readFile(INPUT_JSON_PATH, 'utf-8');
    const inputs: InputData[] = JSON.parse(inputData);
    console.log(`📊 Found ${inputs.length} image(s) to process`);

    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Process each input
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      console.log(`\n📸 Processing image ${i + 1}/${inputs.length}: ${input.imagePath}`);
      console.log(`📏 Basename: ${input.basename}`);
      console.log(`🎯 Seeds: ${JSON.stringify(input.seedCoordinates)}`);
      
      // Create subdirectory for this image's outputs using basename
      const imageOutputDir = `${OUTPUT_DIR}/${input.basename}`;
      await fs.mkdir(imageOutputDir, { recursive: true });
      console.log(`📁 Output directory: ${imageOutputDir}`);
      
      await processImage(input.imagePath, input.seedCoordinates, imageOutputDir, input.basename, {
        maxPixels: 5000000,  // Allow up to 5 million pixels for large sub-images
        whiteThreshold: 220  // Lower threshold for off-white/gray backgrounds
      });
    }
    
    console.log('\n✅ All processing complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main().catch(console.error);
}