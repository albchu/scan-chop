import type { DirectoryNode, LoadDirectoryOptions, Vector2, FrameData, ProcessingConfig } from '@workspace/shared';
import { DirectoryCacheManager } from './DirectoryCacheManager';
import { DirectoryScanner } from './DirectoryScanner';
import { DirectoryPreloader } from './DirectoryPreloader';
import { ImageLoader, type ImageLoadOptions, type ImageData } from './ImageLoader';
import { ImageCacheManager } from './ImageCacheManager';
import { FrameService } from './FrameService';
import type { Image } from 'image-js';
import { loadAndPrepareImage } from '@workspace/shared';

export class WorkspaceService {
  private cacheManager: DirectoryCacheManager;
  private scanner: DirectoryScanner;
  private preloader: DirectoryPreloader;
  private imageLoader: ImageLoader;
  private imageCacheManager: ImageCacheManager;
  private frameService: FrameService;
  private currentImageCache: Map<string, { original: Image; scaled: Image }> = new Map();

  constructor() {
    this.cacheManager = new DirectoryCacheManager();
    this.scanner = new DirectoryScanner();
    this.preloader = new DirectoryPreloader();
    this.imageLoader = new ImageLoader();
    this.imageCacheManager = new ImageCacheManager();
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
    // Get cached image or load it
    let imageData = this.currentImageCache.get(imagePath);
    
    if (!imageData) {
      console.log('[WorkspaceService] Loading image for frame generation:', imagePath);
      const { original, scaled } = await loadAndPrepareImage(imagePath, config?.downsampleFactor || 0.5);
      imageData = { original, scaled };
      this.currentImageCache.set(imagePath, imageData);
      
      // Keep only the last 3 images in cache to manage memory
      if (this.currentImageCache.size > 3) {
        const firstKey = this.currentImageCache.keys().next().value;
        if (firstKey) {
          this.currentImageCache.delete(firstKey);
        }
      }
    }
    
    return this.frameService.generateFrameFromSeed(
      imagePath,
      imageData,
      seed,
      config
    );
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
    this.currentImageCache.clear();
  }
  
  clearCache(dirPath?: string): void {
    this.cacheManager.clear(dirPath);
    // Also clear image cache for this directory if specified
    if (dirPath) {
      this.imageCacheManager.clear(dirPath);
    } else {
      // Clear all image cache if no specific directory
      this.imageCacheManager.clear();
    }
    // Clear frame processing cache
    this.clearCurrentImageCache();
  }
  
  clearImageCache(imagePath?: string): void {
    this.imageCacheManager.clear(imagePath);
  }
  
  getImageCacheStats(): { size: number; maxSize: number } {
    return this.imageCacheManager.getStats();
  }
  
  async loadImageAsBase64(
    imagePath: string, 
    options?: ImageLoadOptions
  ): Promise<ImageData> {
    // Check cache first
    const cached = this.imageCacheManager.get(imagePath, options);
    if (cached) {
      return cached;
    }
    
    // Load the image if not cached
    const imageData = await this.imageLoader.loadAsBase64(imagePath, options);
    
    // Cache the result
    this.imageCacheManager.set(imagePath, options, imageData);
    
    return imageData;
  }
} 