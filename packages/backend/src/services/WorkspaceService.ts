import fs from 'fs/promises';
import path from 'path';
import { isImageFile } from '../utils/isImageFile';
import type { DirectoryNode } from '@workspace/shared';

export interface LoadDirectoryOptions {
  maxDepth?: number;
  excludeEmpty?: boolean;
}

export class WorkspaceService {
  private fileTreeCache: Map<string, DirectoryNode> = new Map();
  
  async loadDirectory(
    dirPath: string, 
    options: LoadDirectoryOptions = {}
  ): Promise<DirectoryNode> {
    const { maxDepth = 10, excludeEmpty = true } = options;
    
    // Check cache first
    if (this.fileTreeCache.has(dirPath)) {
      console.log('[WorkspaceService] Returning cached tree for:', dirPath);
      return this.fileTreeCache.get(dirPath)!;
    }
    
    console.log('[WorkspaceService] Scanning directory:', dirPath);
    
    try {
      // Scan the directory recursively
      const tree = await this.scanDirectoryRecursive(dirPath, 0, maxDepth);
      
      // Prune empty directories if requested
      const finalTree = excludeEmpty ? this.pruneEmptyDirectories(tree) : tree;
      
      // Cache the result
      this.fileTreeCache.set(dirPath, finalTree);
      
      return finalTree;
    } catch (error) {
      console.error('[WorkspaceService] Error scanning directory:', error);
      throw error;
    }
  }
  
  private async scanDirectoryRecursive(
    dirPath: string,
    currentDepth: number,
    maxDepth: number
  ): Promise<DirectoryNode> {
    const nodeName = path.basename(dirPath) || dirPath; // Handle root paths
    
    // Check if we've reached max depth
    if (currentDepth >= maxDepth) {
      return {
        name: nodeName,
        path: dirPath,
        isDirectory: true,
        children: []
      };
    }
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      // Process entries in parallel for better performance
      const childPromises = entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        
        try {
          if (entry.isDirectory()) {
            // Recursively scan subdirectory
            return await this.scanDirectoryRecursive(fullPath, currentDepth + 1, maxDepth);
          } else if (entry.isFile() && isImageFile(fullPath)) {
            // Only include supported image files
            return {
              name: entry.name,
              path: fullPath,
              isDirectory: false
            };
          }
          return null;
        } catch (error) {
          // Log but don't fail on individual file/directory errors (permissions, etc)
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
        children
      };
    } catch (error) {
      // If we can't read the directory, return it as empty
      console.warn(`[WorkspaceService] Cannot read directory ${dirPath}:`, error);
      return {
        name: nodeName,
        path: dirPath,
        isDirectory: true,
        children: []
      };
    }
  }
  
  private pruneEmptyDirectories(node: DirectoryNode): DirectoryNode {
    if (!node.isDirectory) {
      return node;
    }
    
    const prunedChildren = node.children
      ?.map(child => this.pruneEmptyDirectories(child))
      .filter(child => {
        // Keep all files
        if (!child.isDirectory) return true;
        // Keep directories that have children
        return child.children && child.children.length > 0;
      });
    
    return {
      ...node,
      children: prunedChildren || []
    };
  }
  
  // Clear cache for a specific path or all cache
  clearCache(dirPath?: string): void {
    if (dirPath) {
      this.fileTreeCache.delete(dirPath);
    } else {
      this.fileTreeCache.clear();
    }
  }
} 