import * as fs from 'fs/promises';
import { Image } from 'image-js';
import { BoundingBox, ProcessingConfig, RGB, Vector2 } from './types';
import { calculateBrightness, ColorPredicate, createWhiteBoundaryPredicate } from './color';
import { degreesToRadians, isInBounds, normalizeAngle, normalizeRotation, rotatePoint } from './geometry';
import { floodFill, FloodFillConfig } from './flood-fill';
import { findMinimalBoundingRectangle } from './bounding-rectangle';

// ============================================================================
// Types
// ============================================================================

/** Structure for input JSON data */
type InputData = {
  basename: string;
  imagePath: string;
  seedCoordinates: ReadonlyArray<Vector2>;
};

// ============================================================================
// Debug Visualization
// ============================================================================

/**
 * Create a debug image showing flood fill results and bounding box
 * @param image - Base image
 * @param region - Flood fill region points
 * @param seed - Original seed point
 * @param boundingBox - Computed bounding box
 * @returns Debug image with visualizations
 */
const createDebugImage = (
  image: Image,
  region: ReadonlyArray<[number, number]>,
  seed: Vector2,
  boundingBox: BoundingBox
): Image => {
  const debugImage = image.clone();

  // Draw flood fill region in red
  for (const [x, y] of region) {
    debugImage.setPixelXY(x, y, [255, 0, 0, 255]);
  }

  // Draw a large blue circle around the seed point
  const drawCircle = (
    centerX: number,
    centerY: number,
    radius: number,
    color: number[]
  ) => {
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
        [centerX + x, centerY - y],
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
  const angleRad = degreesToRadians(boundingBox.rotation);
  const corners = [
    { x: 0, y: 0 },
    { x: boundingBox.width, y: 0 },
    { x: boundingBox.width, y: boundingBox.height },
    { x: 0, y: boundingBox.height },
  ].map((corner) => ({
    x:
      boundingBox.x +
      corner.x * Math.cos(angleRad) -
      corner.y * Math.sin(angleRad),
    y:
      boundingBox.y +
      corner.x * Math.sin(angleRad) +
      corner.y * Math.cos(angleRad),
  }));

  // Simple line drawing
  const drawLine = (p1: Vector2, p2: Vector2, color: number[]) => {
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
  seed: Vector2,
  index: number,
  outputDir: string,
  basename: string,
  config: ProcessingConfig = {}
): Promise<void> => {
  const {
    downsampleFactor = 0.5,
    whiteThreshold = 230, // Lowered to detect off-white/light gray boundaries
    minArea = 100,
    maxPixels = 2000000, // Increased default to 2 million pixels
    padding = 0,
    cropInset = 8, // Default 2 pixel inset to remove edge fringing
    minRotation = 0.2, // Default to 0.2° to suppress float noise
  } = config;

  console.log(
    `\n🎯 Processing seed ${index} for ${basename}: (${seed.x}, ${seed.y})`
  );

  // Scale seed point to downsampled coordinates
  const scaledSeed: Vector2 = {
    x: Math.round(seed.x * downsampleFactor),
    y: Math.round(seed.y * downsampleFactor),
  };

  // Use white boundary predicate since images are separated by white background
  const predicate = createWhiteBoundaryPredicate(whiteThreshold); // Stop at pixels with brightness >= whiteThreshold
  const floodFillConfig: FloodFillConfig = {
    step: 1,
    maxPixels: maxPixels,
  };

  // Perform flood fill (returns points in original coordinates)
  const region = floodFill(
    scaled,
    scaledSeed,
    predicate,
    floodFillConfig,
    downsampleFactor
  );

  // Find minimal bounding rectangle using full-resolution coordinates
  const frame = findMinimalBoundingRectangle(region, minArea, config);

  // Create and save debug image (need to scale region back for visualization)
  const scaledRegion = region.map(
    ([x, y]) => [x * downsampleFactor, y * downsampleFactor] as [number, number]
  );
  const scaledFrame: BoundingBox = {
    x: frame.x * downsampleFactor,
    y: frame.y * downsampleFactor,
    width: frame.width * downsampleFactor,
    height: frame.height * downsampleFactor,
    rotation: frame.rotation,
  };
  const debugImage = createDebugImage(
    scaled,
    scaledRegion,
    scaledSeed,
    scaledFrame
  );
  await debugImage.save(`${outputDir}/debug_floodfill_${index}.png`);
  console.log(`💾 Saved debug image: debug_floodfill_${index}.png`);

  console.log(
    `🖼️ Frame: ${frame.width.toFixed(0)}×${frame.height.toFixed(0)} at (${frame.x.toFixed(0)}, ${frame.y.toFixed(0)}), rotation=${frame.rotation.toFixed(1)}°`
  );

  // Strategy: For tight cropping, we'll extract exactly the bounding box region
  // by creating a mask and extracting only the rotated rectangle area

  const normalizedRotation = normalizeAngle(frame.rotation);
  console.log(
    `🔄 Rotation: frame.rotation=${frame.rotation.toFixed(2)}°, normalized=${normalizedRotation.toFixed(2)}°`
  );

  // Calculate the four corners of the bounding rectangle
  const angleRad = degreesToRadians(frame.rotation);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const corners = [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width * cos, y: frame.y + frame.width * sin },
    {
      x: frame.x + frame.width * cos - frame.height * sin,
      y: frame.y + frame.width * sin + frame.height * cos,
    },
    { x: frame.x - frame.height * sin, y: frame.y + frame.height * cos },
  ];

  // Find the axis-aligned bounding box (we still need this for the canvas size)
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxX = Math.min(original.width - 1, Math.ceil(Math.max(...xs)));
  const maxY = Math.min(original.height - 1, Math.ceil(Math.max(...ys)));

  // Create a tighter crop that still contains the rotated rectangle
  const cropX = minX;
  const cropY = minY;
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;

  console.log(
    `✂️ Tight crop: ${cropWidth}×${cropHeight} at (${cropX}, ${cropY})`
  );

  // First crop to the bounding region
  const croppedImage = original.crop({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });

  // Now we need to rotate around the correct center point
  // The center of our bounding box in the cropped image coordinates
  const bboxCenterInCrop = {
    x: frame.x + (frame.width * cos) / 2 - (frame.height * sin) / 2 - cropX,
    y: frame.y + (frame.width * sin) / 2 + (frame.height * cos) / 2 - cropY,
  };

  let finalImage = croppedImage;

  if (Math.abs(normalizedRotation) > minRotation) {
    console.log(
      `🔄 Rotating by ${-normalizedRotation.toFixed(1)}° for tight crop`
    );
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
    const finalCropX = Math.max(
      0,
      Math.round(expandX + bboxCenterInCrop.x - frame.width / 2)
    );
    const finalCropY = Math.max(
      0,
      Math.round(expandY + bboxCenterInCrop.y - frame.height / 2)
    );
    const finalCropWidth = Math.min(
      Math.round(frame.width),
      rotatedWidth - finalCropX
    );
    const finalCropHeight = Math.min(
      Math.round(frame.height),
      rotatedHeight - finalCropY
    );

    // Apply inset to remove edge fringing
    const insetCropX = finalCropX + cropInset;
    const insetCropY = finalCropY + cropInset;
    const insetCropWidth = Math.max(1, finalCropWidth - 2 * cropInset);
    const insetCropHeight = Math.max(1, finalCropHeight - 2 * cropInset);

    console.log(
      `✂️ Final tight crop after rotation: ${finalCropWidth}×${finalCropHeight} at (${finalCropX}, ${finalCropY})`
    );
    console.log(
      `📐 With ${cropInset}px inset: ${insetCropWidth}×${insetCropHeight} at (${insetCropX}, ${insetCropY})`
    );

    finalImage = finalImage.crop({
      x: insetCropX,
      y: insetCropY,
      width: insetCropWidth,
      height: insetCropHeight,
    });
  } else {
    console.log(
      `🔄 Skipping rotation: ${Math.abs(normalizedRotation).toFixed(1)}° < ${minRotation}° threshold`
    );
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
  seeds: ReadonlyArray<Vector2>,
  outputDir: string,
  basename: string,
  config: ProcessingConfig = {}
): Promise<void> => {
  const { downsampleFactor = 0.5 } = config;

  const original = await Image.load(inputPath);
  console.log(`📐 Input image: ${original.width}×${original.height}`);

  const scaled = original.resize({
    width: Math.round(original.width * downsampleFactor),
    height: Math.round(original.height * downsampleFactor),
  });
  console.log(
    `📏 Scaled image: ${scaled.width}×${scaled.height} (factor: ${downsampleFactor})`
  );

  for (let index = 0; index < seeds.length; index++) {
    const seed = seeds[index];
    await processSeedPoint(
      original,
      scaled,
      seed,
      index,
      outputDir,
      basename,
      config
    );
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
      console.log(
        `\n📸 Processing image ${i + 1}/${inputs.length}: ${input.imagePath}`
      );
      console.log(`📏 Basename: ${input.basename}`);
      console.log(`🎯 Seeds: ${JSON.stringify(input.seedCoordinates)}`);

      // Create subdirectory for this image's outputs using basename
      const imageOutputDir = `${OUTPUT_DIR}/${input.basename}`;
      await fs.mkdir(imageOutputDir, { recursive: true });
      console.log(`📁 Output directory: ${imageOutputDir}`);

      await processImage(
        input.imagePath,
        input.seedCoordinates,
        imageOutputDir,
        input.basename,
        {
          maxPixels: 5000000, // Allow up to 5 million pixels for large sub-images
          whiteThreshold: 220, // Lower threshold for off-white/gray backgrounds
        }
      );
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
