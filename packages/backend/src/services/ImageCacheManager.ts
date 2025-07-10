import type { ImageData } from './ImageLoader';

// Configurable constant for maximum number of cached images
export const MAX_CACHED_IMAGES = 5;

interface CacheEntry {
  key: string;
  data: ImageData;
  accessOrder: number;
}

export class ImageCacheManager {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private accessCounter: number;

  constructor(maxSize: number = MAX_CACHED_IMAGES) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessCounter = 0;
  }

  /**
   * Generate a cache key from image path and options
   */
  private generateKey(
    imagePath: string, 
    options?: {
      downsampleFactor?: number;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${imagePath}:${optionsStr}`;
  }

  /**
   * Get cached image data if available
   */
  get(
    imagePath: string, 
    options?: {
      downsampleFactor?: number;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): ImageData | undefined {
    const key = this.generateKey(imagePath, options);
    const entry = this.cache.get(key);
    
    if (entry) {
      // Update access order for LRU
      entry.accessOrder = ++this.accessCounter;
      console.log('[ImageCacheManager] Cache hit for:', imagePath);
      return entry.data;
    }
    
    console.log('[ImageCacheManager] Cache miss for:', imagePath);
    return undefined;
  }

  /**
   * Store image data in cache
   */
  set(
    imagePath: string, 
    options: {
      downsampleFactor?: number;
      maxWidth?: number;
      maxHeight?: number;
    } | undefined,
    data: ImageData
  ): void {
    const key = this.generateKey(imagePath, options);
    
    // If cache is at max size, remove least recently used entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      key,
      data,
      accessOrder: ++this.accessCounter
    });
    
    console.log('[ImageCacheManager] Cached image:', imagePath, `(cache size: ${this.cache.size}/${this.maxSize})`);
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruOrder = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.accessOrder < lruOrder) {
        lruOrder = entry.accessOrder;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      console.log('[ImageCacheManager] Evicted LRU entry:', lruKey);
    }
  }

  /**
   * Clear all cached images or a specific image
   */
  clear(imagePath?: string): void {
    if (imagePath) {
      // Clear all entries for this image path (regardless of options)
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(imagePath + ':')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log('[ImageCacheManager] Cleared cache for image:', imagePath);
    } else {
      // Clear entire cache
      this.cache.clear();
      console.log('[ImageCacheManager] Cleared entire image cache');
    }
  }

  /**
   * Get current cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
} 