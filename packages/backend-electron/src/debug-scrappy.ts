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
  brightnessThreshold?: number;
  brightSeedThreshold?: number;
  minArea?: number;
  padding?: number;
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
  
  // Convert angles close to ±90° to smaller angles by swapping width/height
  if (normalizedRotation > 45) {
    normalizedRotation -= 90;
    [finalWidth, finalHeight] = [finalHeight, finalWidth];
  } else if (normalizedRotation < -45) {
    normalizedRotation += 90;
    [finalWidth, finalHeight] = [finalHeight, finalWidth];
  }
  
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
 * @returns Array of points in the filled region
 */
const floodFill = async (
  image: Image,
  seed: Point2D,
  predicate: ColorPredicate,
  config: FloodFillConfig = {}
): Promise<ReadonlyArray<[number, number]>> => {
  const { 
    step = 1, 
    maxPixels = 500000
  } = config;
  
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
    [-step, 0], [step, 0], [0, -step], [0, step],
    [-step, -step], [step, -step], [-step, step], [step, step]
  ];

  let pixelsChecked = 0;

  while (queue.length > 0 && region.length < maxPixels) {
    const { x, y } = queue.shift()!;
    const idx = y * width + x;
    
    if (visited[idx]) continue;
    visited[idx] = 1;
    pixelsChecked++;

    const currentColor = image.getPixelXY(x, y).slice(0, 3) as unknown as RGB;
    if (!predicate(currentColor, seedColor)) continue;
    
    region.push([x, y]);

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
 * @returns Bounding frame with position, size, and rotation
 */
const findMinimalBoundingRectangle = (
  points: ReadonlyArray<[number, number]>,
  minArea = 100
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
  
  if (minimalArea < minArea) {
    throw new Error(`Region too small: ${minimalArea.toFixed(0)} < ${minArea}`);
  }
  
  // Normalize rotation to smallest absolute value
  const normalized = normalizeRotation(bestRectangle.angle, bestRectangle.width, bestRectangle.height);
  
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
 * @param config - Processing configuration
 */
const processSeedPoint = async (
  original: Image,
  scaled: Image,
  seed: Point2D,
  index: number,
  outputDir: string,
  config: ProcessingConfig = {}
): Promise<void> => {
  const {
    downsampleFactor = 0.5,
    brightnessThreshold = 50,
    brightSeedThreshold = 30,
    minArea = 100,
    padding = 10
  } = config;
  
  console.log(`\n🎯 Processing seed ${index}: (${seed.x}, ${seed.y})`);
  
  // Scale seed point to downsampled coordinates
  const scaledSeed: Point2D = {
    x: Math.round(seed.x * downsampleFactor),
    y: Math.round(seed.y * downsampleFactor)
  };

  // Determine flood fill strategy based on seed brightness
  const seedPixel = scaled.getPixelXY(scaledSeed.x, scaledSeed.y).slice(0, 3) as unknown as RGB;
  const seedBrightness = calculateBrightness(seedPixel);
  const isbrightSeed = seedBrightness > 180;
  
  // Configure flood fill based on seed characteristics
  const threshold = isbrightSeed ? brightSeedThreshold : brightnessThreshold;
  const predicate = createBrightnessPredicate(threshold);
  const floodFillConfig: FloodFillConfig = {
    step: 1,
    maxPixels: 500000
  };
  
  // Perform flood fill
  const region = await floodFill(scaled, scaledSeed, predicate, floodFillConfig);
  
  // Find minimal bounding rectangle
  const scaledFrame = findMinimalBoundingRectangle(region, minArea);
  
  // Create and save debug image
  const debugImage = createDebugImage(scaled, region, scaledSeed, scaledFrame);
  await debugImage.save(`${outputDir}/debug_floodfill_${index}.png`);
  console.log(`💾 Saved debug image: debug_floodfill_${index}.png`);
  
  // Scale frame back to original coordinates
  const frame: BoundingFrame = {
    x: scaledFrame.x / downsampleFactor,
    y: scaledFrame.y / downsampleFactor,
    width: scaledFrame.width / downsampleFactor,
    height: scaledFrame.height / downsampleFactor,
    rotation: scaledFrame.rotation
  };

  console.log(`🖼️ Frame: ${frame.width.toFixed(0)}×${frame.height.toFixed(0)} at (${frame.x.toFixed(0)}, ${frame.y.toFixed(0)}), rotation=${frame.rotation.toFixed(1)}°`);

  // Calculate crop region with padding
  const angleRad = degreesToRadians(frame.rotation);
  const corners = [
    { x: 0, y: 0 },
    { x: frame.width, y: 0 },
    { x: frame.width, y: frame.height },
    { x: 0, y: frame.height }
  ].map(corner => ({
    x: frame.x + corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad),
    y: frame.y + corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad)
  }));
  
  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  const cropX = Math.max(0, Math.round(Math.min(...xs) - padding));
  const cropY = Math.max(0, Math.round(Math.min(...ys) - padding));
  const cropWidth = Math.min(
    Math.round(Math.max(...xs) - Math.min(...xs) + 2 * padding),
    original.width - cropX
  );
  const cropHeight = Math.min(
    Math.round(Math.max(...ys) - Math.min(...ys) + 2 * padding),
    original.height - cropY
  );
  
  console.log(`✂️ Crop: ${cropWidth}×${cropHeight} at (${cropX}, ${cropY})`);

  // Crop and rotate
  let finalImage = original.crop({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight
  });
  
  if (Math.abs(frame.rotation) > 5) {
    const normalizedRotation = normalizeAngle(frame.rotation);
    console.log(`🔄 Rotating by ${-normalizedRotation.toFixed(1)}°`);
    finalImage = finalImage.rotate(-normalizedRotation);
  }

  await finalImage.save(`${outputDir}/subimage_${index}.png`);
};

/**
 * Process an image with multiple seed points
 * @param inputPath - Path to input image
 * @param seeds - Array of seed points
 * @param outputDir - Output directory
 * @param config - Processing configuration
 */
export const processImage = async (
  inputPath: string,
  seeds: ReadonlyArray<Point2D>,
  outputDir: string,
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

  await Promise.all(
    seeds.map((seed, index) => 
      processSeedPoint(original, scaled, seed, index, outputDir, config)
    )
  );
};

// ============================================================================
// Debug Entry Point
// ============================================================================

/**
 * Main function for debugging
 */
const main = async (): Promise<void> => {
  const INPUT_IMAGE_PATH = '/Users/albchu/vicky_family_photos/2000/Untitled 2.png';
  const SEED_COORDINATES: ReadonlyArray<Point2D> = [
    { x: 478, y: 673 },
    { x: 1496, y: 343 },
    { x: 643, y: 1992 },
    { x: 1564, y: 1992 }
  ];
  const OUTPUT_DIR = './debug-output';

  console.log('🚀 Starting image processing...');
  console.log(`📁 Input: ${INPUT_IMAGE_PATH}`);
  console.log(`🎯 Seeds: ${JSON.stringify(SEED_COORDINATES)}`);
  console.log(`📂 Output: ${OUTPUT_DIR}`);

  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await processImage(INPUT_IMAGE_PATH, SEED_COORDINATES, OUTPUT_DIR);
    console.log('\n✅ Processing complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main().catch(console.error);
}