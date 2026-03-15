import type {
  DirectoryNode,
  LoadDirectoryOptions,
  Vector2,
  FrameData,
  ProcessingConfig,
} from '@workspace/shared';
import {
  WHITE_THRESHOLD_DEFAULT,
  MAX_SCALED_DIMENSION,
} from '@workspace/shared';
import { DirectoryCacheManager } from './DirectoryCacheManager';
import { DirectoryScanner } from './DirectoryScanner';
import { DirectoryPreloader } from './DirectoryPreloader';
import { FrameService } from './FrameService';
import type { Image } from 'image-js';
import { Image as ImageJS } from 'image-js';
import fs from 'fs/promises';
import path from 'path';
import { isImageFile } from '../utils/isImageFile';

// Image data interface (previously from ImageLoader)
export interface ImageData {
  imageData: string; // base64 data URL
  width: number; // actual width of the returned image
  height: number; // actual height of the returned image
  originalWidth: number; // original image width before scaling
  originalHeight: number; // original image height before scaling
}

// Simple image cache entry that stores both full and scaled versions
interface ImageCacheEntry {
  fullImage: Image;
  scaledImage?: Image; // Scaled version for both display and processing
  scaleFactor?: number; // Scale factor used for the scaled image
  lastAccess: number;
}

export class WorkspaceService {
  private cacheManager: DirectoryCacheManager;
  private scanner: DirectoryScanner;
  private preloader: DirectoryPreloader;
  private frameService: FrameService;

  // Image cache with full and processing versions
  private imageCache = new Map<string, ImageCacheEntry>();
  private readonly maxCacheSize = 10; // Number of images to keep in cache

  // Track in-flight image loads to prevent duplicates
  private loadingPromises = new Map<string, Promise<ImageCacheEntry>>();

  // TODO: Future enhancement - implement frame persistence
  // - Create SQLite database for storing frames
  // - Schema: frames table with pageId, frameData JSON, timestamp
  // - Load frames when loading image (check by pageId)
  // - Save frames on create/update/delete

  constructor() {
    console.log('[WorkspaceService] Initializing');
    this.cacheManager = new DirectoryCacheManager();
    this.scanner = new DirectoryScanner();
    this.preloader = new DirectoryPreloader();
    this.frameService = new FrameService();
  }

  async loadDirectory(
    dirPath: string,
    options: LoadDirectoryOptions = {}
  ): Promise<DirectoryNode> {
    const {
      depth = 1,
      preloadDepth = 2,
      maxDepth = 10,
      excludeEmpty = true,
    } = options;

    // Check cache first
    const cached = this.cacheManager.get(dirPath);
    if (cached && cached.childrenLoaded) {
      console.log('[WorkspaceService] Returning cached tree for:', dirPath);

      // Still do preloading if needed
      if (preloadDepth > 0 && cached.children) {
        this.preloader.schedulePreload(
          cached.children,
          preloadDepth,
          (path, opts) => this.loadDirectory(path, opts)
        );
      }

      return cached;
    }

    console.log(
      '[WorkspaceService] Loading directory with depth:',
      dirPath,
      depth
    );

    try {
      // Load the directory with specified depth
      const tree = await this.scanner.scanDirectory(dirPath, depth, maxDepth);

      // Prune empty directories if requested
      const finalTree = excludeEmpty
        ? this.scanner.pruneEmptyDirectories(tree)
        : tree;

      // Cache the result
      this.cacheManager.set(dirPath, finalTree);

      // Schedule preloading of subdirectories if requested
      if (preloadDepth > 0 && finalTree.children) {
        this.preloader.schedulePreload(
          finalTree.children,
          preloadDepth,
          (path, opts) => this.loadDirectory(path, opts)
        );
      }

      return finalTree;
    } catch (error) {
      console.error('[WorkspaceService] Error loading directory:', error);
      throw error;
    }
  }

  async generateFrame(
    imagePath: string,
    seed: Vector2,
    config?: ProcessingConfig
  ): Promise<FrameData> {
    const cacheEntry = await this.getCachedImage(imagePath, true);
    const scaledImage = cacheEntry.scaledImage || cacheEntry.fullImage;
    const scaleFactor = cacheEntry.scaleFactor || 1.0;

    console.log(
      `[WorkspaceService] Generating frame on ${scaledImage.width}x${scaledImage.height} image (scaleFactor: ${scaleFactor.toFixed(4)})`
    );

    const frameData = await this.frameService.generateFrameFromSeed(
      cacheEntry.fullImage,
      scaledImage,
      scaleFactor,
      seed,
      imagePath,
      config
    );

    return frameData;
  }

  async updateFrame(
    id: string,
    updates: Partial<FrameData>
  ): Promise<FrameData | undefined> {
    // Get frame metadata to check if we need the original image
    const metadata = this.frameService.getFrameMetadata(id);

    // If we're updating coordinates and have metadata, get the original image
    if (
      metadata &&
      (updates.x !== undefined ||
        updates.y !== undefined ||
        updates.width !== undefined ||
        updates.height !== undefined ||
        updates.rotation !== undefined)
    ) {
      // Get the cached image
      const cacheEntry = await this.getCachedImage(metadata.imagePath, false);

      // Update frame with regenerated image
      return this.frameService.updateFrame(id, updates, cacheEntry.fullImage);
    }

    // Otherwise just update without regenerating image
    return this.frameService.updateFrame(id, updates);
  }

  getFrame(id: string): FrameData | undefined {
    return this.frameService.getFrame(id);
  }

  getAllFrames(): FrameData[] {
    return this.frameService.getAllFrames();
  }

  deleteFrame(id: string): boolean {
    return this.frameService.deleteFrame(id);
  }

  /**
   * Get sanitized filename for a frame (without directory path)
   */
  getSanitizedFrameFilename(frameData: FrameData): string {
    const sanitizedLabel =
      frameData.label
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .trim() || 'frame';
    return `${sanitizedLabel}.png`;
  }

  /**
   * Save a frame to a specific file path with orientation rotation applied
   */
  async saveFrameToPath(
    frameData: FrameData,
    outputPath: string
  ): Promise<string> {
    if (!frameData.imageData) {
      throw new Error('Frame has no image data to save');
    }

    // Decode base64 data URL to image
    const image = await ImageJS.load(frameData.imageData);

    // Apply orientation rotation if needed
    let rotatedImage: Image = image;
    if (frameData.orientation !== 0) {
      rotatedImage = image.rotate(frameData.orientation);
      console.log(
        `[WorkspaceService] Rotated image by ${frameData.orientation} degrees`
      );
    }

    // Convert to PNG buffer and save
    const buffer = Buffer.from(rotatedImage.toBuffer({ format: 'png' }));
    await fs.writeFile(outputPath, buffer);

    console.log(`[WorkspaceService] Saved frame to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Rotate a frame by cycling its orientation (0 → 90 → 180 → 270 → 0).
   * The imageData remains unchanged; UI applies CSS rotation based on orientation.
   */
  rotateFrame(frameData: FrameData): Partial<FrameData> {
    const orientationCycle: Record<number, 0 | 90 | 180 | 270> = {
      0: 90,
      90: 180,
      180: 270,
      270: 0,
    };

    const newOrientation = orientationCycle[frameData.orientation] ?? 90;

    console.log(
      `[WorkspaceService] Rotated frame ${frameData.id}: orientation ${frameData.orientation} -> ${newOrientation}`
    );

    return {
      orientation: newOrientation,
    };
  }

  clearCache(path?: string): void {
    this.cacheManager.clear(path);
    this.frameService.clearAllFrames();
    // Also clear image cache when clearing all cache
    this.imageCache.clear();
  }

  clearCurrentImageCache(): void {
    this.imageCache.clear();
  }

  async loadImageAsBase64(imagePath: string): Promise<ImageData> {
    // Get the image with scaled version
    const wasCached = this.imageCache.has(imagePath);
    const cacheEntry = await this.getCachedImage(imagePath, true);

    // Use the scaled image for display if available, otherwise use full image
    const imageToReturn = cacheEntry.scaledImage || cacheEntry.fullImage;

    // Convert to base64 data URL
    const base64 = imageToReturn.toDataURL();

    console.log(
      `[WorkspaceService] ${wasCached ? 'Serving cached' : 'Loaded and serving new'} image:`,
      imagePath,
      `(display: ${imageToReturn.width}x${imageToReturn.height}, original: ${cacheEntry.fullImage.width}x${cacheEntry.fullImage.height})`,
      `[Cache: ${this.imageCache.size}/${this.maxCacheSize}]`
    );

    return {
      imageData: base64,
      width: imageToReturn.width,
      height: imageToReturn.height,
      originalWidth: cacheEntry.fullImage.width,
      originalHeight: cacheEntry.fullImage.height,
    };
  }

  private async getCachedImage(
    imagePath: string,
    needsScaledVersion = false
  ): Promise<ImageCacheEntry> {
    // Check cache first
    const cached = this.imageCache.get(imagePath);
    if (cached) {
      // Update last access time
      cached.lastAccess = Date.now();
      console.log('[WorkspaceService] Found in cache:', imagePath);

      // Check if we need scaled version and don't have it
      if (needsScaledVersion && !cached.scaledImage) {
        console.log(
          '[WorkspaceService] Creating scaled version for cached image:',
          imagePath
        );
        const { scaledImage, scaleFactor } = this.createScaledImage(
          cached.fullImage
        );
        cached.scaledImage = scaledImage;
        cached.scaleFactor = scaleFactor;
      }

      return cached;
    }

    // Check if we're already loading this image
    const loadingPromise = this.loadingPromises.get(imagePath);
    if (loadingPromise) {
      console.log(
        '[WorkspaceService] Waiting for in-flight image load:',
        imagePath
      );
      const entry = await loadingPromise;

      // Check if we need scaled version and don't have it
      if (needsScaledVersion && !entry.scaledImage) {
        console.log(
          '[WorkspaceService] Creating scaled version for loaded image:',
          imagePath
        );
        const { scaledImage, scaleFactor } = this.createScaledImage(
          entry.fullImage
        );
        entry.scaledImage = scaledImage;
        entry.scaleFactor = scaleFactor;
      }

      return entry;
    }

    // Create a promise for this load
    const loadPromise = this.loadImage(imagePath, needsScaledVersion);
    this.loadingPromises.set(imagePath, loadPromise);

    try {
      const entry = await loadPromise;
      return entry;
    } finally {
      // Clean up the loading promise
      this.loadingPromises.delete(imagePath);
    }
  }

  private createScaledImage(fullImage: Image): {
    scaledImage: Image;
    scaleFactor: number;
  } {
    const { width, height } = fullImage;
    const maxDim = Math.max(width, height);
    const scaleFactor =
      maxDim > MAX_SCALED_DIMENSION ? MAX_SCALED_DIMENSION / maxDim : 1.0;

    if (scaleFactor >= 1.0) {
      console.log(
        '[WorkspaceService] Image fits within max dimensions, no scaling needed'
      );
      return { scaledImage: fullImage, scaleFactor: 1.0 };
    }

    const newWidth = Math.round(width * scaleFactor);
    const newHeight = Math.round(height * scaleFactor);

    console.log(
      `[WorkspaceService] Scaling image from ${width}x${height} to ${newWidth}x${newHeight} (factor: ${scaleFactor.toFixed(4)})`
    );

    const scaledImage = fullImage.resize({ width: newWidth });
    return { scaledImage, scaleFactor };
  }

  private async loadImage(
    imagePath: string,
    needsScaledVersion: boolean
  ): Promise<ImageCacheEntry> {
    // Validate file first
    if (!isImageFile(imagePath)) {
      throw new Error(`Not a valid image file: ${imagePath}`);
    }

    try {
      await fs.stat(imagePath);
    } catch (error) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Load the full image
    console.log('[WorkspaceService] Loading full-size image:', imagePath);
    const fullImage = await ImageJS.load(imagePath);

    // Create scaled version if needed
    let scaledImage: Image | undefined;
    let scaleFactor: number | undefined;

    if (needsScaledVersion) {
      const scaled = this.createScaledImage(fullImage);
      scaledImage = scaled.scaledImage;
      scaleFactor = scaled.scaleFactor;
    }

    // Create cache entry
    const entry: ImageCacheEntry = {
      fullImage,
      scaledImage,
      scaleFactor,
      lastAccess: Date.now(),
    };

    // Add to cache
    this.imageCache.set(imagePath, entry);

    // Evict old entries if cache is too large
    if (this.imageCache.size > this.maxCacheSize) {
      this.evictOldestImage();
    }

    return entry;
  }

  private evictOldestImage() {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.imageCache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      console.log(
        '[WorkspaceService] Evicting oldest image from cache:',
        oldestKey
      );
      this.imageCache.delete(oldestKey);
    }
  }
}
