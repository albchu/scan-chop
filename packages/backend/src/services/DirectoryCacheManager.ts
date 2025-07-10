import type { DirectoryNode } from '@workspace/shared';

interface CacheEntry {
  node: DirectoryNode;
  timestamp: number;
}

export class DirectoryCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout: number;

  constructor(cacheTimeoutMs: number = 5 * 60 * 1000) {
    this.cacheTimeout = cacheTimeoutMs;
  }

  get(dirPath: string): DirectoryNode | null {
    const entry = this.cache.get(dirPath);
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      this.cache.delete(dirPath);
      return null;
    }
    
    return entry.node;
  }

  set(dirPath: string, node: DirectoryNode): void {
    this.cache.set(dirPath, {
      node,
      timestamp: Date.now()
    });
  }

  clear(dirPath?: string): void {
    if (dirPath) {
      this.cache.delete(dirPath);
      // Also clear any subdirectories
      for (const [path] of this.cache) {
        if (path.startsWith(dirPath)) {
          this.cache.delete(path);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  has(dirPath: string): boolean {
    return this.cache.has(dirPath) && this.get(dirPath) !== null;
  }
} 