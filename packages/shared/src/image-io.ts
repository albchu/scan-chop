import { Image } from 'image-js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Result of loading and preparing an image
 */
export interface PreparedImage {
  original: Image;
  scaled: Image;
  scaleFactor: number;
}

/**
 * Load an image and optionally create a downsampled version
 * @param imagePath - Path to the image file
 * @param downsampleFactor - Factor to downsample by (default: 1.0 = no downsampling)
 * @returns Original and scaled images
 */
export const loadAndPrepareImage = async (
  imagePath: string,
  downsampleFactor: number = 1.0
): Promise<PreparedImage> => {
  const original = await Image.load(imagePath);
  console.log(`📐 Loaded image: ${original.width}×${original.height}`);
  
  if (downsampleFactor === 1.0) {
    return {
      original,
      scaled: original,
      scaleFactor: 1.0,
    };
  }
  
  const scaled = original.resize({
    width: Math.round(original.width * downsampleFactor),
    height: Math.round(original.height * downsampleFactor),
  });
  
  console.log(
    `📏 Scaled image: ${scaled.width}×${scaled.height} (factor: ${downsampleFactor})`
  );
  
  return {
    original,
    scaled,
    scaleFactor: downsampleFactor,
  };
};

/**
 * Save a processed image with appropriate settings
 * @param image - Image to save
 * @param outputPath - Path to save the image
 * @param options - Additional save options (currently unused, for future extensions)
 */
export const saveProcessedImage = async (
  image: Image,
  outputPath: string,
  options?: {
    quality?: number;
    compression?: number;
  }
): Promise<void> => {
  // Note: image-js save method doesn't accept options in the same way
  // For now, we'll save without options
  await image.save(outputPath);
  console.log(`💾 Saved image: ${path.basename(outputPath)}`);
};

/**
 * Debug artifacts that can be saved
 */
export interface DebugArtifacts {
  debugImages?: Array<{ image: Image; filename: string }>;
  metadata?: Record<string, unknown>;
}

/**
 * Save debug artifacts to a directory
 * @param artifacts - Debug artifacts to save
 * @param outputDir - Directory to save to
 */
export const saveDebugArtifacts = async (
  artifacts: DebugArtifacts,
  outputDir: string
): Promise<void> => {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  // Save debug images
  if (artifacts.debugImages) {
    for (const { image, filename } of artifacts.debugImages) {
      const fullPath = path.join(outputDir, filename);
      await image.save(fullPath);
      console.log(`🐛 Saved debug image: ${filename}`);
    }
  }
  
  // Save metadata if provided
  if (artifacts.metadata) {
    const metadataPath = path.join(outputDir, 'debug-metadata.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(artifacts.metadata, null, 2),
      'utf-8'
    );
    console.log(`📊 Saved debug metadata: debug-metadata.json`);
  }
};

/**
 * Create output directory structure for processing results
 * @param baseDir - Base output directory
 * @param subdirs - Subdirectories to create
 */
export const createOutputDirectories = async (
  baseDir: string,
  subdirs: string[] = []
): Promise<void> => {
  await fs.mkdir(baseDir, { recursive: true });
  
  for (const subdir of subdirs) {
    const fullPath = path.join(baseDir, subdir);
    await fs.mkdir(fullPath, { recursive: true });
  }
  
  console.log(`📁 Created output directory structure at: ${baseDir}`);
}; 