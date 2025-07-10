import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';
import { DirectoryCacheManager } from './DirectoryCacheManager';
import { DirectoryScanner } from './DirectoryScanner';
import { DirectoryPreloader } from './DirectoryPreloader';
import { ImageLoader, type ImageLoadOptions, type ImageData } from './ImageLoader';
import { ImageCacheManager } from './ImageCacheManager';

export class WorkspaceService {
  private cacheManager: DirectoryCacheManager;
  private scanner: DirectoryScanner;
  private preloader: DirectoryPreloader;
  private imageLoader: ImageLoader;
  private imageCacheManager: ImageCacheManager;

  constructor() {
    this.cacheManager = new DirectoryCacheManager();
    this.scanner = new DirectoryScanner();
    this.preloader = new DirectoryPreloader();
    this.imageLoader = new ImageLoader();
    this.imageCacheManager = new ImageCacheManager();
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
  
  clearCache(dirPath?: string): void {
    this.cacheManager.clear(dirPath);
    // Also clear image cache for this directory if specified
    if (dirPath) {
      this.imageCacheManager.clear(dirPath);
    } else {
      // Clear all image cache if no specific directory
      this.imageCacheManager.clear();
    }
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