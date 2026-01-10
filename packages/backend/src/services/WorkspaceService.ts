import type { DirectoryNode, LoadDirectoryOptions, Vector2, FrameData, ProcessingConfig } from '@workspace/shared';
import { WHITE_THRESHOLD_DEFAULT } from '@workspace/shared';
import { DirectoryCacheManager } from './DirectoryCacheManager';
import { DirectoryScanner } from './DirectoryScanner';
import { DirectoryPreloader } from './DirectoryPreloader';
import { FrameService } from './FrameService';
import type { Image } from 'image-js';
import { Image as ImageJS } from 'image-js';
import fs from 'fs/promises';
import path from 'path';
import { isImageFile } from '../utils/isImageFile';

// Internal scaling configuration
const MAX_DISPLAY_WIDTH = 1920;  // Max width for display/processing
const MAX_DISPLAY_HEIGHT = 1080; // Max height for display/processing

// Default downscale factor for processing (30% of original size)
const DEFAULT_PROCESSING_DOWNSCALE = 0.3;

// Image data interface (previously from ImageLoader)
export interface ImageData {
  imageData: string;  // base64 data URL
  width: number;      // actual width of the returned image
  height: number;     // actual height of the returned image
  originalWidth: number;  // original image width before scaling
  originalHeight: number; // original image height before scaling
}

// Simple image cache entry that stores both full and scaled versions
interface ImageCacheEntry {
  fullImage: Image;
  scaledImage?: Image;     // Scaled version for both display and processing
  scaleFactor?: number;    // Scale factor used for the scaled image
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
      excludeEmpty = true 
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
    
    console.log('[WorkspaceService] Loading directory with depth:', dirPath, depth);
    
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
    // Always use the default processing downscale internally
    const processingDownscale = DEFAULT_PROCESSING_DOWNSCALE;
    
    // Get cached entry
    const cacheEntry = await this.getCachedImage(imagePath, true);
    
    // Check if we can use the cached processing image
    let scaledImage: Image;
    let actualDownscale: number;
    
    if (cacheEntry.scaledImage && 
        cacheEntry.scaleFactor && 
        Math.abs(cacheEntry.scaleFactor - processingDownscale) < 0.01) {
      // Use cached scaled image
      scaledImage = cacheEntry.scaledImage;
      actualDownscale = cacheEntry.scaleFactor;
    } else {
      // Create scaled image on demand if not available
      const targetWidth = Math.round(cacheEntry.fullImage.width * processingDownscale);
      scaledImage = cacheEntry.fullImage.resize({ width: targetWidth });
      actualDownscale = scaledImage.width / cacheEntry.fullImage.width;
      
      // Update cache with the newly created scaled image
      cacheEntry.scaledImage = scaledImage;
      cacheEntry.scaleFactor = actualDownscale;
    }
    
    // Calculate the actual scale factor (from display to original)
    // If the image was scaled for display, we need to account for that
    const displayToOriginalScale = cacheEntry.fullImage.width / scaledImage.width;
    
    console.log('[WorkspaceService] Using scaled image for frame generation:', scaledImage.width, 'x', scaledImage.height);
    console.log('[WorkspaceService] Scale factor (display to original):', displayToOriginalScale);
    
    // Generate frame using both images
    const frameData = await this.frameService.generateFrameFromSeed(
      cacheEntry.fullImage,  // Original full-resolution image
      scaledImage,           // Scaled image for detection
      actualDownscale,       // Scale factor
      seed,
      imagePath,             // Pass the image path for metadata
      config
    );
    
    return frameData;
  }
  
  async updateFrame(id: string, updates: Partial<FrameData>): Promise<FrameData | undefined> {
    // Get frame metadata to check if we need the original image
    const metadata = this.frameService.getFrameMetadata(id);
    
    // If we're updating coordinates and have metadata, get the original image
    if (metadata && (
      updates.x !== undefined || 
      updates.y !== undefined || 
      updates.width !== undefined || 
      updates.height !== undefined || 
      updates.rotation !== undefined
    )) {
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
   * Save a frame to disk with orientation rotation applied
   */
  async saveFrame(frameData: FrameData, outputDir: string): Promise<string> {
    if (!frameData.imageData) {
      throw new Error('Frame has no image data to save');
    }
    
    // Decode base64 data URL to image
    const image = await ImageJS.load(frameData.imageData);
    
    // Apply orientation rotation if needed
    let rotatedImage: Image = image;
    if (frameData.orientation !== 0) {
      rotatedImage = image.rotate(frameData.orientation);
      console.log(`[WorkspaceService] Rotated image by ${frameData.orientation} degrees`);
    }
    
    // Sanitize filename - remove invalid characters
    const sanitizedLabel = frameData.label
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .trim() || 'frame';
    
    const filename = `${sanitizedLabel}.png`;
    const outputPath = path.join(outputDir, filename);
    
    // Convert to PNG buffer and save
    const buffer = Buffer.from(rotatedImage.toBuffer({ format: 'png' }));
    await fs.writeFile(outputPath, buffer);
    
    console.log(`[WorkspaceService] Saved frame to: ${outputPath}`);
    return outputPath;
  }
  
  /**
   * Rotate a frame's imageData by 90 degrees clockwise and swap dimensions
   */
  async rotateFrame(frameData: FrameData): Promise<FrameData> {
    if (!frameData.imageData) {
      throw new Error('Frame has no image data to rotate');
    }
    
    // Decode base64 data URL to image
    const image = await ImageJS.load(frameData.imageData);
    
    // Rotate 90 degrees clockwise
    const rotatedImage = image.rotate(90);
    
    // Convert back to base64 data URL
    const dataUrl = `data:image/png;base64,${Buffer.from(
      rotatedImage.toBuffer({ format: 'png' })
    ).toString('base64')}`;
    
    console.log(`[WorkspaceService] Rotated frame ${frameData.id}: ${frameData.width}x${frameData.height} -> ${frameData.height}x${frameData.width}`);
    
    return {
      ...frameData,
      imageData: dataUrl,
      width: frameData.height,  // swap dimensions
      height: frameData.width,
      orientation: 0,           // reset since rotation is baked in
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
  
  clearImageCache(imagePath?: string): void {
    if (imagePath) {
      this.imageCache.delete(imagePath);
    } else {
      this.imageCache.clear();
    }
  }
  
  getImageCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.imageCache.size,
      maxSize: this.maxCacheSize
    };
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
      originalHeight: cacheEntry.fullImage.height
    };
  }

  private async getCachedImage(imagePath: string, needsScaledVersion = false): Promise<ImageCacheEntry> {
    // Check cache first
    const cached = this.imageCache.get(imagePath);
    if (cached) {
      // Update last access time
      cached.lastAccess = Date.now();
      console.log('[WorkspaceService] Found in cache:', imagePath);
      
      // Check if we need scaled version and don't have it
      if (needsScaledVersion && !cached.scaledImage) {
        console.log('[WorkspaceService] Creating scaled version for cached image:', imagePath);
        const { scaledImage, scaleFactor } = this.createScaledImage(cached.fullImage);
        cached.scaledImage = scaledImage;
        cached.scaleFactor = scaleFactor;
      }
      
      return cached;
    }
    
    // Check if we're already loading this image
    const loadingPromise = this.loadingPromises.get(imagePath);
    if (loadingPromise) {
      console.log('[WorkspaceService] Waiting for in-flight image load:', imagePath);
      const entry = await loadingPromise;
      
      // Check if we need scaled version and don't have it
      if (needsScaledVersion && !entry.scaledImage) {
        console.log('[WorkspaceService] Creating scaled version for loaded image:', imagePath);
        const { scaledImage, scaleFactor } = this.createScaledImage(entry.fullImage);
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
  
  private createScaledImage(fullImage: Image): { scaledImage: Image; scaleFactor: number } {
    const { width, height } = fullImage;
    
    // Calculate scale factor to fit within max dimensions
    const widthScale = width > MAX_DISPLAY_WIDTH ? MAX_DISPLAY_WIDTH / width : 1.0;
    const heightScale = height > MAX_DISPLAY_HEIGHT ? MAX_DISPLAY_HEIGHT / height : 1.0;
    const scaleFactor = Math.min(widthScale, heightScale);
    
    // Only scale if necessary
    if (scaleFactor >= 1.0) {
      console.log('[WorkspaceService] Image fits within max dimensions, no scaling needed');
      return { scaledImage: fullImage, scaleFactor: 1.0 };
    }
    
    // Create scaled image
    const newWidth = Math.round(width * scaleFactor);
    const newHeight = Math.round(height * scaleFactor);
    
    console.log(
      `[WorkspaceService] Scaling image from ${width}x${height} to ${newWidth}x${newHeight} (factor: ${scaleFactor.toFixed(2)})`
    );
    
    const scaledImage = fullImage.resize({ width: newWidth });
    return { scaledImage, scaleFactor };
  }
  
  private async loadImage(imagePath: string, needsScaledVersion: boolean): Promise<ImageCacheEntry> {
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
      lastAccess: Date.now()
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
      console.log('[WorkspaceService] Evicting oldest image from cache:', oldestKey);
      this.imageCache.delete(oldestKey);
    }
  }
} 