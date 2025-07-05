import * as fs from 'fs/promises';
import { Vector2 } from './types';
import { batchProcessImages, ProcessingJob } from './image-processing';

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

    // Convert inputs to processing jobs
    const jobs: ProcessingJob[] = inputs.map(input => ({
      imagePath: input.imagePath,
      seeds: input.seedCoordinates,
      basename: input.basename,
    }));

    // Process all images with debug output enabled
    await batchProcessImages(jobs, OUTPUT_DIR, {
      maxPixels: 5000000, // Allow up to 5 million pixels for large sub-images
      whiteThreshold: 220, // Lower threshold for off-white/gray backgrounds
      generateDebugImages: true, // Enable debug image generation
      downsampleFactor: 0.5,
      minArea: 100,
      padding: 0,
      cropInset: 8,
      minRotation: 0.2,
    });

    console.log('\n✅ All processing complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main().catch(console.error);
}
