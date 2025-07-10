import fs from 'fs/promises';
import path from 'path';
import { isImageFile } from '../utils/isImageFile';
import type { DirectoryNode } from '@workspace/shared';

export class DirectoryScanner {
  async scanDirectory(
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
      const hasSubdirs = entries.some(e => e.isDirectory() && !e.name.startsWith('.'));
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
            // Skip hidden directories (those starting with a dot)
            if (entry.name.startsWith('.')) {
              return null;
            }
            
            // Recursively scan subdirectory with reduced depth
            return await this.scanDirectory(
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
          console.warn(`[DirectoryScanner] Error processing ${fullPath}:`, error);
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
        children: this.sortChildren(children)
      };
    } catch (error) {
      // If we can't read the directory, return it as empty
      console.warn(`[DirectoryScanner] Cannot read directory ${dirPath}:`, error);
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

  private sortChildren(children: DirectoryNode[]): DirectoryNode[] {
    return children.sort((a, b) => {
      // Sort directories first, then by name
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  pruneEmptyDirectories(node: DirectoryNode): DirectoryNode {
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
} 