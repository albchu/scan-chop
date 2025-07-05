import { Image } from 'image-js';
import { BoundingBox, Vector2, ProcessingConfig } from './types';
import { findMinimalBoundingRectangle } from './bounding-rectangle';
import { loadAndPrepareImage, saveProcessedImage, createOutputDirectories, DebugArtifacts, saveDebugArtifacts } from './image-io';
import { extractRegionWithWhiteBoundary, scaleRegionCoordinates } from './region-extraction';
import { smartCrop } from './image-transform';
import { createDebugImage } from './debug-visualization';
import { scaleCoordinates, scaleBoundingBox } from './coordinate-utils';

/**
 * Result of processing a single image with seed points
 */
export interface ProcessedImage {
  image: Image;
  boundingBox: BoundingBox;
  region: Array<[number, number]>;
  seed: Vector2;
  index: number;
}

/**
 * Result of processing an image with multiple seeds
 */
export interface ImageProcessingResult {
  processedImages: ProcessedImage[];
  debugArtifacts?: DebugArtifacts;
  metadata: {
    originalDimensions: { width: number; height: number };
    scaleFactor: number;
    processingTime: number;
  };
}

/**
 * Process a single seed point to extract a sub-image
 * @param original - Original full-resolution image
 * @param scaled - Downsampled image for processing
 * @param seed - Seed point in original image coordinates
 * @param config - Processing configuration
 * @returns Processed image result
 */
export const processSingleSeed = (
  original: Image,
  scaled: Image,
  seed: Vector2,
  config: ProcessingConfig = {}
): ProcessedImage => {
  const { downsampleFactor = 0.5 } = config;
  
  // Scale seed point to downsampled coordinates
  const scaledSeed = scaleCoordinates(seed, downsampleFactor);
  
  // Extract region using flood fill
  const region = extractRegionWithWhiteBoundary(scaled, scaledSeed, config);
  
  if (!region.isValid) {
    throw new Error(
      `Region extraction failed: ${region.validationErrors?.join(', ')}`
    );
  }
  
  // Scale region points back to original coordinates
  const originalRegion = scaleRegionCoordinates(region.points, 1 / downsampleFactor);
  
  // Find minimal bounding rectangle in original coordinates
  const boundingBox = findMinimalBoundingRectangle(originalRegion, config.minArea, config);
  
  console.log(
    `🖼️ Found region: ${region.pixelCount} pixels, ` +
    `bounding box: ${boundingBox.width.toFixed(0)}×${boundingBox.height.toFixed(0)} ` +
    `at (${boundingBox.x.toFixed(0)}, ${boundingBox.y.toFixed(0)}), ` +
    `rotation=${boundingBox.rotation.toFixed(1)}°`
  );
  
  // Extract the sub-image using smart crop
  const extractedImage = smartCrop(original, boundingBox, config);
  
  return {
    image: extractedImage,
    boundingBox,
    region: originalRegion,
    seed,
    index: 0, // Will be set by caller
  };
};

/**
 * Process an image with multiple seed points
 * @param imagePath - Path to the input image
 * @param seeds - Array of seed points in original image coordinates
 * @param config - Processing configuration
 * @returns Processing results including all extracted images
 */
export const processImageWithSeeds = async (
  imagePath: string,
  seeds: ReadonlyArray<Vector2>,
  config: ProcessingConfig = {}
): Promise<ImageProcessingResult> => {
  const startTime = Date.now();
  const { downsampleFactor = 0.5, generateDebugImages = false } = config;
  
  // Load and prepare images
  const { original, scaled, scaleFactor } = await loadAndPrepareImage(
    imagePath,
    downsampleFactor
  );
  
  const processedImages: ProcessedImage[] = [];
  const debugImages: Array<{ image: Image; filename: string }> = [];
  
  // Process each seed point
  for (let index = 0; index < seeds.length; index++) {
    const seed = seeds[index];
    console.log(
      `\n🎯 Processing seed ${index + 1}/${seeds.length}: (${seed.x}, ${seed.y})`
    );
    
    try {
      const result = processSingleSeed(original, scaled, seed, config);
      result.index = index;
      processedImages.push(result);
      
      // Generate debug image if requested
      if (generateDebugImages) {
        // Scale region for visualization on downsampled image
        const scaledRegion = scaleRegionCoordinates(result.region, scaleFactor);
        const scaledBoundingBox = scaleBoundingBox(result.boundingBox, scaleFactor);
        const scaledSeed = scaleCoordinates(seed, scaleFactor);
        
        const debugImage = createDebugImage(scaled, {
          region: scaledRegion,
          regionColor: [255, 0, 0, 255], // Red for flood fill region
          seed: scaledSeed,
          seedColor: [0, 255, 0, 255], // Green for seed point
          seedRadius: { inner: 15, outer: 20 }, // Blue circle around seed
          boundingBox: scaledBoundingBox,
          boundingBoxColor: [0, 0, 255, 255], // Blue for bounding box
        });
        
        debugImages.push({
          image: debugImage,
          filename: `debug_seed_${index}.png`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to process seed ${index + 1}:`, errorMessage);
      // Continue with other seeds
    }
  }
  
  const processingTime = Date.now() - startTime;
  console.log(
    `\n✅ Processed ${processedImages.length}/${seeds.length} seeds in ${processingTime}ms`
  );
  
  // Prepare debug artifacts if any
  const debugArtifacts: DebugArtifacts | undefined = debugImages.length > 0
    ? {
        debugImages,
        metadata: {
          seedCount: seeds.length,
          successCount: processedImages.length,
          config,
        },
      }
    : undefined;
  
  return {
    processedImages,
    debugArtifacts,
    metadata: {
      originalDimensions: {
        width: original.width,
        height: original.height,
      },
      scaleFactor,
      processingTime,
    },
  };
};

/**
 * Save processing results to disk
 * @param results - Processing results to save
 * @param outputDir - Output directory
 * @param basename - Base name for output files
 */
export const saveProcessingResults = async (
  results: ImageProcessingResult,
  outputDir: string,
  basename: string
): Promise<void> => {
  // Create output directories
  await createOutputDirectories(outputDir, ['images', 'debug']);
  
  // Save processed images
  for (const processed of results.processedImages) {
    const filename = `${basename}_${processed.index}.png`;
    const outputPath = `${outputDir}/images/${filename}`;
    await saveProcessedImage(processed.image, outputPath);
  }
  
  // Save debug artifacts if any
  if (results.debugArtifacts) {
    await saveDebugArtifacts(results.debugArtifacts, `${outputDir}/debug`);
  }
  
  // Save processing metadata
  const metadataPath = `${outputDir}/processing_metadata.json`;
  const metadata = {
    basename,
    timestamp: new Date().toISOString(),
    ...results.metadata,
    processedCount: results.processedImages.length,
    boundingBoxes: results.processedImages.map(p => ({
      index: p.index,
      seed: p.seed,
      boundingBox: p.boundingBox,
      regionSize: p.region.length,
    })),
  };
  
  const fs = await import('fs/promises');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`📊 Saved processing metadata: processing_metadata.json`);
};

/**
 * High-level function to process an image and save results
 * @param imagePath - Path to input image
 * @param seeds - Array of seed points
 * @param outputDir - Output directory
 * @param basename - Base name for output files
 * @param config - Processing configuration
 */
export const processAndSaveImage = async (
  imagePath: string,
  seeds: ReadonlyArray<Vector2>,
  outputDir: string,
  basename: string,
  config: ProcessingConfig = {}
): Promise<void> => {
  console.log(`📸 Processing image: ${imagePath}`);
  console.log(`📍 Seeds: ${seeds.length} points`);
  console.log(`📁 Output: ${outputDir}/${basename}`);
  
  // Process the image
  const results = await processImageWithSeeds(imagePath, seeds, config);
  
  // Save results
  const imageOutputDir = `${outputDir}/${basename}`;
  await saveProcessingResults(results, imageOutputDir, basename);
};

/**
 * Batch process multiple images
 * @param jobs - Array of processing jobs
 * @param outputDir - Base output directory
 * @param config - Processing configuration
 */
export interface ProcessingJob {
  imagePath: string;
  seeds: ReadonlyArray<Vector2>;
  basename: string;
}

export const batchProcessImages = async (
  jobs: ProcessingJob[],
  outputDir: string,
  config: ProcessingConfig = {}
): Promise<void> => {
  console.log(`🚀 Starting batch processing of ${jobs.length} images`);
  
  const startTime = Date.now();
  let successCount = 0;
  
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`\n📸 Processing image ${i + 1}/${jobs.length}: ${job.basename}`);
    
    try {
      await processAndSaveImage(
        job.imagePath,
        job.seeds,
        outputDir,
        job.basename,
        config
      );
      successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to process ${job.basename}:`, errorMessage);
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(
    `\n✅ Batch processing complete: ${successCount}/${jobs.length} succeeded in ${totalTime}ms`
  );
};

// Re-export commonly used functions from other modules
export { createDebugImage } from './debug-visualization';
export { extractRegionWithWhiteBoundary } from './region-extraction';
export { smartCrop } from './image-transform';
export { loadAndPrepareImage, saveProcessedImage } from './image-io'; 