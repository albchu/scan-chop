import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';
import { DirectoryCacheManager } from './DirectoryCacheManager';
import { DirectoryScanner } from './DirectoryScanner';
import { DirectoryPreloader } from './DirectoryPreloader';
import { ImageLoader, type ImageLoadOptions, type ImageData } from './ImageLoader';

export class WorkspaceService {
  private cacheManager: DirectoryCacheManager;
  private scanner: DirectoryScanner;
  private preloader: DirectoryPreloader;
  private imageLoader: ImageLoader;

  constructor() {
    this.cacheManager = new DirectoryCacheManager();
    this.scanner = new DirectoryScanner();
    this.preloader = new DirectoryPreloader();
    this.imageLoader = new ImageLoader();
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
  }
  
  async loadImageAsBase64(
    imagePath: string, 
    options?: ImageLoadOptions
  ): Promise<ImageData> {
    return this.imageLoader.loadAsBase64(imagePath, options);
  }
} 