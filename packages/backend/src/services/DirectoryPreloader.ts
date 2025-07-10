import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';

export interface PreloadCallback {
  (path: string, options: LoadDirectoryOptions): Promise<DirectoryNode>;
}

export class DirectoryPreloader {
  private preloadQueue: Set<string> = new Set();

  schedulePreload(
    children: DirectoryNode[],
    depth: number,
    loadCallback: PreloadCallback
  ): void {
    // Schedule preloading of subdirectories in the background
    const subdirs = children.filter(child => child.isDirectory && child.hasChildren);
    
    subdirs.forEach(subdir => {
      if (!this.preloadQueue.has(subdir.path)) {
        this.preloadQueue.add(subdir.path);
        
        // Preload asynchronously without blocking
        setImmediate(async () => {
          try {
            console.log('[DirectoryPreloader] Preloading:', subdir.path);
            await loadCallback(subdir.path, { 
              depth, 
              preloadDepth: Math.max(0, depth - 1),
              excludeEmpty: true 
            });
          } catch (error) {
            console.warn('[DirectoryPreloader] Preload failed:', subdir.path, error);
          } finally {
            this.preloadQueue.delete(subdir.path);
          }
        });
      }
    });
  }

  isQueued(path: string): boolean {
    return this.preloadQueue.has(path);
  }

  clearQueue(): void {
    this.preloadQueue.clear();
  }
} 