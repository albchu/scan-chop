import { describe, it, expect, beforeEach } from 'vitest';
import { ImageCacheManager, MAX_CACHED_IMAGES } from '../services/ImageCacheManager';
import type { ImageData } from '../services/ImageLoader';

describe('ImageCacheManager', () => {
  let cacheManager: ImageCacheManager;
  
  const createMockImageData = (id: string): ImageData => ({
    imageData: `data:image/png;base64,${id}`,
    width: 100,
    height: 100,
    originalWidth: 200,
    originalHeight: 200
  });

  beforeEach(() => {
    cacheManager = new ImageCacheManager();
  });

  describe('basic operations', () => {
    it('should return undefined for uncached images', () => {
      const result = cacheManager.get('/path/to/image.png');
      expect(result).toBeUndefined();
    });

    it('should cache and retrieve images', () => {
      const imagePath = '/path/to/image.png';
      const imageData = createMockImageData('test1');
      
      cacheManager.set(imagePath, undefined, imageData);
      const retrieved = cacheManager.get(imagePath);
      
      expect(retrieved).toEqual(imageData);
    });

    it('should cache images with different options separately', () => {
      const imagePath = '/path/to/image.png';
      const imageData1 = createMockImageData('test1');
      const imageData2 = createMockImageData('test2');
      
      const options1 = { downsampleFactor: 0.5 };
      const options2 = { maxWidth: 800 };
      
      cacheManager.set(imagePath, options1, imageData1);
      cacheManager.set(imagePath, options2, imageData2);
      
      expect(cacheManager.get(imagePath, options1)).toEqual(imageData1);
      expect(cacheManager.get(imagePath, options2)).toEqual(imageData2);
      expect(cacheManager.get(imagePath)).toBeUndefined();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when cache is full', () => {
      const cacheSize = 3;
      const smallCache = new ImageCacheManager(cacheSize);
      
      // Fill the cache
      for (let i = 0; i < cacheSize; i++) {
        smallCache.set(`/image${i}.png`, undefined, createMockImageData(`img${i}`));
      }
      
      // Access first two images to update their access time
      smallCache.get('/image0.png');
      smallCache.get('/image1.png');
      
      // Add a new image, which should evict image2 (least recently used)
      smallCache.set('/image3.png', undefined, createMockImageData('img3'));
      
      expect(smallCache.get('/image0.png')).toBeDefined();
      expect(smallCache.get('/image1.png')).toBeDefined();
      expect(smallCache.get('/image2.png')).toBeUndefined(); // Should be evicted
      expect(smallCache.get('/image3.png')).toBeDefined();
    });

    it('should not evict when updating existing entry', () => {
      const cacheSize = 2;
      const smallCache = new ImageCacheManager(cacheSize);
      
      smallCache.set('/image1.png', undefined, createMockImageData('img1'));
      smallCache.set('/image2.png', undefined, createMockImageData('img2'));
      
      // Update existing entry - should not trigger eviction
      smallCache.set('/image1.png', undefined, createMockImageData('img1-updated'));
      
      expect(smallCache.get('/image1.png')).toBeDefined();
      expect(smallCache.get('/image2.png')).toBeDefined();
      expect(smallCache.getStats().size).toBe(2);
    });
  });

  describe('cache clearing', () => {
    it('should clear entire cache when no path specified', () => {
      cacheManager.set('/image1.png', undefined, createMockImageData('img1'));
      cacheManager.set('/image2.png', undefined, createMockImageData('img2'));
      
      cacheManager.clear();
      
      expect(cacheManager.get('/image1.png')).toBeUndefined();
      expect(cacheManager.get('/image2.png')).toBeUndefined();
      expect(cacheManager.getStats().size).toBe(0);
    });

    it('should clear only specified image path', () => {
      const imagePath1 = '/path/to/image1.png';
      const imagePath2 = '/path/to/image2.png';
      
      cacheManager.set(imagePath1, undefined, createMockImageData('img1'));
      cacheManager.set(imagePath1, { downsampleFactor: 0.5 }, createMockImageData('img1-small'));
      cacheManager.set(imagePath2, undefined, createMockImageData('img2'));
      
      cacheManager.clear(imagePath1);
      
      expect(cacheManager.get(imagePath1)).toBeUndefined();
      expect(cacheManager.get(imagePath1, { downsampleFactor: 0.5 })).toBeUndefined();
      expect(cacheManager.get(imagePath2)).toBeDefined();
    });
  });

  describe('statistics', () => {
    it('should return correct cache statistics', () => {
      expect(cacheManager.getStats()).toEqual({ size: 0, maxSize: MAX_CACHED_IMAGES });
      
      cacheManager.set('/image1.png', undefined, createMockImageData('img1'));
      cacheManager.set('/image2.png', undefined, createMockImageData('img2'));
      
      expect(cacheManager.getStats()).toEqual({ size: 2, maxSize: MAX_CACHED_IMAGES });
    });

    it('should use custom max size when specified', () => {
      const customSize = 10;
      const customCache = new ImageCacheManager(customSize);
      
      expect(customCache.getStats()).toEqual({ size: 0, maxSize: customSize });
    });
  });
}); 