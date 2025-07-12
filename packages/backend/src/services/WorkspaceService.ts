import type { DirectoryNode, LoadDirectoryOptions, Vector2, FrameData, ProcessingConfig } from '@workspace/shared';
import { WHITE_THRESHOLD_DEFAULT } from '@workspace/shared';
import { DirectoryCacheManager } from './DirectoryCacheManager';
import { DirectoryScanner } from './DirectoryScanner';
import { DirectoryPreloader } from './DirectoryPreloader';
import { FrameService } from './FrameService';
import type { Image } from 'image-js';
import { Image as ImageJS } from 'image-js';
import fs from 'fs/promises';
import { isImageFile } from '../utils/isImageFile';

// Internal processing configuration
const DEFAULT_PROCESSING_DOWNSCALE = 0.3; // 30% of display size for processing

// Image data interface (previously from ImageLoader)
export interface ImageData {
  imageData: string;  // base64 data URL
  width: number;      // actual width of the returned image
  height: number;     // actual height of the returned image
  originalWidth: number;  // original image width before scaling
  originalHeight: number; // original image height before scaling
}

// Simple image cache entry that stores both full and downscaled versions
interface ImageCacheEntry {
  fullImage: Image;
  processingImage?: Image; // Downscaled version for processing
  downscaleFactor?: number; // Scale factor used for processing image
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
    let imageToUse: Image;
    let actualDownscale: number;
    
    if (cacheEntry.processingImage && 
        cacheEntry.downscaleFactor && 
        Math.abs(cacheEntry.downscaleFactor - processingDownscale) < 0.01) {
      // Use cached processing image
      console.log('[WorkspaceService] Using cached processing image for frame generation:', imagePath);
      imageToUse = cacheEntry.processingImage;
      actualDownscale = cacheEntry.downscaleFactor;
    } else {
      // This should rarely happen since we pre-cache at DEFAULT_PROCESSING_DOWNSCALE
      console.log('[WorkspaceService] Creating processing image with default factor:', processingDownscale);
      imageToUse = cacheEntry.fullImage.resize({ 
        width: Math.round(cacheEntry.fullImage.width * processingDownscale) 
      });
      actualDownscale = processingDownscale;
    }
    
    // Generate frame using the appropriate image
    const frameData = await this.frameService.generateFrameFromSeed(
      cacheEntry.fullImage,  // Pass original for final extraction
      imageToUse,           // Pass downscaled for processing
      actualDownscale,      // Pass actual scale factor used
      seed,
      { 
        ...config,
        whiteThreshold: config?.whiteThreshold ?? WHITE_THRESHOLD_DEFAULT,
        downsampleFactor: actualDownscale  // Always use our internal value
      }
    );
    
    return frameData;
  }
  
  updateFrame(id: string, updates: Partial<FrameData>): FrameData | null {
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
  
  clearFrames(): void {
    this.frameService.clearFrames();
  }
  
  clearCurrentImageCache(): void {
    this.imageCache.clear();
  }
  
  clearCache(dirPath?: string): void {
    this.cacheManager.clear(dirPath);
    // Also clear image cache for this directory if specified
    if (dirPath) {
      // Clear images from this directory
      for (const [key] of this.imageCache) {
        if (key.startsWith(dirPath)) {
          this.imageCache.delete(key);
        }
      }
    } else {
      // Clear all image cache if no specific directory
      this.imageCache.clear();
    }
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
    // Get the full image and pre-create processing version
    const { fullImage } = await this.getCachedImage(imagePath, true);
    
    // Convert to base64 data URL
    const base64 = fullImage.toDataURL();
    
    console.log('[WorkspaceService] Serving full image with processing version pre-cached:', fullImage.width, 'x', fullImage.height);
    
    return {
      imageData: base64,
      width: fullImage.width,
      height: fullImage.height,
      originalWidth: fullImage.width,
      originalHeight: fullImage.height
    };
  }

  private async getCachedImage(imagePath: string, needsProcessingVersion = false): Promise<ImageCacheEntry> {
    // Check cache first
    const cached = this.imageCache.get(imagePath);
    if (cached) {
      // Update last access time
      cached.lastAccess = Date.now();
      
      // Check if we need processing version and don't have it
      if (needsProcessingVersion && !cached.processingImage) {
        console.log('[WorkspaceService] Creating processing version for cached image:', imagePath);
        const processingImage = cached.fullImage.resize({ 
          width: Math.round(cached.fullImage.width * DEFAULT_PROCESSING_DOWNSCALE) 
        });
        cached.processingImage = processingImage;
        cached.downscaleFactor = DEFAULT_PROCESSING_DOWNSCALE;
      }
      
      return cached;
    }
    
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
    
    // Create processing version if needed
    let processingImage: Image | undefined;
    let downscaleFactor: number | undefined;
    
    if (needsProcessingVersion) {
      console.log('[WorkspaceService] Creating processing version at', DEFAULT_PROCESSING_DOWNSCALE, 'scale');
      processingImage = fullImage.resize({ 
        width: Math.round(fullImage.width * DEFAULT_PROCESSING_DOWNSCALE) 
      });
      downscaleFactor = DEFAULT_PROCESSING_DOWNSCALE;
    }
    
    // Create cache entry
    const entry: ImageCacheEntry = {
      fullImage,
      processingImage,
      downscaleFactor,
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