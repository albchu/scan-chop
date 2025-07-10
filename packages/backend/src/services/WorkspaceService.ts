import fs from 'fs/promises';
import path from 'path';
import { isImageFile } from '../utils/isImageFile';
import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';
import { loadAndPrepareImage } from '@workspace/shared';

interface CacheEntry {
  node: DirectoryNode;
  timestamp: number;
}

export class WorkspaceService {
  private fileTreeCache: Map<string, CacheEntry> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private preloadQueue: Set<string> = new Set();
  
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
    const cached = this.getCached(dirPath);
    if (cached && cached.childrenLoaded) {
      console.log('[WorkspaceService] Returning cached tree for:', dirPath);
      
      // Still do preloading if needed
      if (preloadDepth > 0 && cached.children) {
        this.schedulePreload(cached.children, preloadDepth);
      }
      
      return cached;
    }
    
    console.log('[WorkspaceService] Loading directory with depth:', dirPath, depth);
    
    try {
      // Load the directory with specified depth
      const tree = await this.scanDirectoryWithDepth(dirPath, depth, maxDepth);
      
      // Prune empty directories if requested
      const finalTree = excludeEmpty ? this.pruneEmptyDirectories(tree) : tree;
      
      // Cache the result
      this.setCached(dirPath, finalTree);
      
      // Schedule preloading of subdirectories if requested
      if (preloadDepth > 0 && finalTree.children) {
        this.schedulePreload(finalTree.children, preloadDepth);
      }
      
      return finalTree;
    } catch (error) {
      console.error('[WorkspaceService] Error loading directory:', error);
      throw error;
    }
  }
  
  private async scanDirectoryWithDepth(
    dirPath: string,
    depth: number,
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<DirectoryNode> {
    const nodeName = path.basename(dirPath) || dirPath;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      // Quick check if directory has children (without loading them)
      const hasImageFiles = entries.some(e => e.isFile() && isImageFile(path.join(dirPath, e.name)));
      const hasSubdirs = entries.some(e => e.isDirectory());
      const hasChildren = hasImageFiles || hasSubdirs;
      
      // If we're at depth 0, just return basic info
      if (depth <= 0 || currentDepth >= maxDepth) {
        return {
          name: nodeName,
          path: dirPath,
          isDirectory: true,
          hasChildren,
          childrenLoaded: false
        };
      }
      
      // Load children
      const childPromises = entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        
        try {
          if (entry.isDirectory()) {
            // Recursively scan subdirectory with reduced depth
            return await this.scanDirectoryWithDepth(
              fullPath, 
              depth - 1, 
              maxDepth, 
              currentDepth + 1
            );
          } else if (entry.isFile() && isImageFile(fullPath)) {
            // Include image files
            return {
              name: entry.name,
              path: fullPath,
              isDirectory: false
            };
          }
          return null;
        } catch (error) {
          console.warn(`[WorkspaceService] Error processing ${fullPath}:`, error);
          return null;
        }
      });
      
      const children = (await Promise.all(childPromises))
        .filter(Boolean) as DirectoryNode[];
      
      return {
        name: nodeName,
        path: dirPath,
        isDirectory: true,
        hasChildren: children.length > 0,
        childrenLoaded: true,
        children: children.sort((a, b) => {
          // Sort directories first, then by name
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        })
      };
    } catch (error) {
      // If we can't read the directory, return it as empty
      console.warn(`[WorkspaceService] Cannot read directory ${dirPath}:`, error);
      return {
        name: nodeName,
        path: dirPath,
        isDirectory: true,
        hasChildren: false,
        childrenLoaded: true,
        children: []
      };
    }
  }
  
  private pruneEmptyDirectories(node: DirectoryNode): DirectoryNode {
    if (!node.isDirectory || !node.children) {
      return node;
    }
    
    const prunedChildren = node.children
      .map(child => this.pruneEmptyDirectories(child))
      .filter(child => {
        // Keep all files
        if (!child.isDirectory) return true;
        // Keep directories that have children
        return child.hasChildren;
      });
    
    return {
      ...node,
      children: prunedChildren,
      hasChildren: prunedChildren.length > 0
    };
  }
  
  private schedulePreload(children: DirectoryNode[], depth: number): void {
    // Schedule preloading of subdirectories in the background
    const subdirs = children.filter(child => child.isDirectory && child.hasChildren);
    
    subdirs.forEach(subdir => {
      if (!this.preloadQueue.has(subdir.path)) {
        this.preloadQueue.add(subdir.path);
        
        // Preload asynchronously without blocking
        setImmediate(async () => {
          try {
            console.log('[WorkspaceService] Preloading:', subdir.path);
            await this.loadDirectory(subdir.path, { 
              depth, 
              preloadDepth: Math.max(0, depth - 1),
              excludeEmpty: true 
            });
          } catch (error) {
            console.warn('[WorkspaceService] Preload failed:', subdir.path, error);
          } finally {
            this.preloadQueue.delete(subdir.path);
          }
        });
      }
    });
  }
  
  private getCached(dirPath: string): DirectoryNode | null {
    const entry = this.fileTreeCache.get(dirPath);
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      this.fileTreeCache.delete(dirPath);
      return null;
    }
    
    return entry.node;
  }
  
  private setCached(dirPath: string, node: DirectoryNode): void {
    this.fileTreeCache.set(dirPath, {
      node,
      timestamp: Date.now()
    });
  }
  
  // Clear cache for a specific path or all cache
  clearCache(dirPath?: string): void {
    if (dirPath) {
      this.fileTreeCache.delete(dirPath);
      // Also clear any subdirectories
      for (const [path] of this.fileTreeCache) {
        if (path.startsWith(dirPath)) {
          this.fileTreeCache.delete(path);
        }
      }
    } else {
      this.fileTreeCache.clear();
    }
  }
  
  // Load an image file and convert it to base64
  async loadImageAsBase64(imagePath: string, options?: { 
    downsampleFactor?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<string> {
    try {
      console.log('[WorkspaceService] Loading image:', imagePath);
      
      // Check if file exists and is an image
      const stats = await fs.stat(imagePath);
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }
      
      if (!isImageFile(imagePath)) {
        throw new Error('File is not a supported image format');
      }
      
      // Determine if we need to downsample based on options
      let downsampleFactor = options?.downsampleFactor || 1.0;
      
      // If max dimensions are specified, calculate downsample factor
      if (options?.maxWidth || options?.maxHeight) {
        // Load just to get dimensions first
        const { original } = await loadAndPrepareImage(imagePath, 1.0);
        
        const widthRatio = options.maxWidth ? original.width / options.maxWidth : 1;
        const heightRatio = options.maxHeight ? original.height / options.maxHeight : 1;
        const maxRatio = Math.max(widthRatio, heightRatio);
        
        if (maxRatio > 1) {
          downsampleFactor = 1 / maxRatio;
          console.log(`[WorkspaceService] Image dimensions ${original.width}x${original.height} exceed max, downsampling by ${downsampleFactor.toFixed(2)}`);
        }
      }
      
      // Load and prepare the image with the calculated downsample factor
      const { scaled } = await loadAndPrepareImage(imagePath, downsampleFactor);
      
      // Convert to base64 data URL using image-js's toDataURL method
      const base64 = scaled.toDataURL();
      
      console.log('[WorkspaceService] Image loaded successfully, dimensions:', scaled.width, 'x', scaled.height);
      return base64;
    } catch (error) {
      console.error('[WorkspaceService] Error loading image:', error);
      throw error;
    }
  }
} 