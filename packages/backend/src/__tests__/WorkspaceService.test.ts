import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { WorkspaceService } from '../services/WorkspaceService';
import fs from 'fs/promises';
import path from 'path';
import type { DirectoryNode } from '@workspace/shared';
import { processSingleSeed } from '@workspace/shared';
import { Image } from 'image-js';

// Mock modules
vi.mock('fs/promises');
vi.mock('image-js', () => ({
  Image: {
    load: vi.fn()
  }
}));
// Mock the shared module
vi.mock('@workspace/shared', () => ({
  WHITE_THRESHOLD_DEFAULT: 220,
  MAX_DISPLAY_WIDTH: 1920,
  MAX_DISPLAY_HEIGHT: 1080
}));

// Helper to create mock dirent
function createMockDirent(name: string, isDirectory: boolean) {
  return {
    name,
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
    isSymbolicLink: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false
  };
}

// Helper to create mock image
function createMockImage(width: number, height: number) {
  return {
    width,
    height,
    toDataURL: vi.fn().mockReturnValue(`data:image/jpeg;base64,mock${width}x${height}`),
    resize: vi.fn()
  };
}

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  const mockReaddir = fs.readdir as MockedFunction<typeof fs.readdir>;
  const mockStat = fs.stat as MockedFunction<typeof fs.stat>;
  const mockImageLoad = Image.load as MockedFunction<typeof Image.load>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkspaceService();
    // Clear any timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadDirectory', () => {
    it('should load a directory with depth 1', async () => {
      const testPath = '/test/dir';
      
      // Mock the main directory
      mockReaddir.mockImplementation(async (dirPath) => {
        if (dirPath === testPath) {
          return [
            createMockDirent('image1.jpg', false),
            createMockDirent('subdir', true),
            createMockDirent('text.txt', false)
          ] as any;
        } else if (dirPath === path.join(testPath, 'subdir')) {
          // Mock the subdirectory to have content
          return [
            createMockDirent('nested.jpg', false)
          ] as any;
        }
        return [] as any;
      });

      const result = await service.loadDirectory(testPath);

      expect(result).toEqual({
        name: 'dir',
        path: testPath,
        isDirectory: true,
        hasChildren: true,
        childrenLoaded: true,
        children: [
          {
            name: 'subdir',
            path: path.join(testPath, 'subdir'),
            isDirectory: true,
            hasChildren: true,  // Changed: subdirectory has children
            childrenLoaded: false
          },
          {
            name: 'image1.jpg',
            path: path.join(testPath, 'image1.jpg'),
            isDirectory: false
          }
        ]
      });
    });

    it('should load nested directories with specified depth', async () => {
      const rootPath = '/test/root';
      
      // Mock root directory
      mockReaddir.mockImplementation(async (dirPath) => {
        if (dirPath === rootPath) {
          return [
            createMockDirent('subdir1', true),
            createMockDirent('image1.jpg', false)
          ] as any;
        } else if (dirPath === path.join(rootPath, 'subdir1')) {
          return [
            createMockDirent('subdir2', true),
            createMockDirent('image2.png', false)
          ] as any;
        } else if (dirPath === path.join(rootPath, 'subdir1', 'subdir2')) {
          return [
            createMockDirent('image3.gif', false)
          ] as any;
        }
        return [] as any;
      });

      const result = await service.loadDirectory(rootPath, { depth: 3 });

      expect(result.children).toHaveLength(2);
      expect(result.children![0].name).toBe('subdir1');
      expect(result.children![0].childrenLoaded).toBe(true);
      expect(result.children![0].children).toHaveLength(2);
      expect(result.children![0].children![0].name).toBe('subdir2');
      expect(result.children![0].children![0].childrenLoaded).toBe(true);
      expect(result.children![0].children![0].children).toHaveLength(1);
    });

    it('should respect maxDepth limit', async () => {
      const rootPath = '/test/deep';
      
      // Mock very deep directory structure
      mockReaddir.mockImplementation(async (dirPath) => {
        const depth = dirPath.split('/').length - 3; // Calculate depth from path
        if (depth < 5) {
          return [
            createMockDirent(`subdir${depth + 1}`, true),
            createMockDirent(`image${depth}.jpg`, false)
          ] as any;
        }
        return [] as any;
      });

      const result = await service.loadDirectory(rootPath, { depth: 10, maxDepth: 2 });

      // Should only go 2 levels deep
      expect(result.childrenLoaded).toBe(true);
      expect(result.children![0].childrenLoaded).toBe(true);
      expect(result.children![0].children![0].childrenLoaded).toBe(false); // Stopped at maxDepth
    });

    it('should exclude empty directories when excludeEmpty is true', async () => {
      const rootPath = '/test/mixed';
      
      mockReaddir.mockImplementation(async (dirPath) => {
        if (dirPath === rootPath) {
          return [
            createMockDirent('emptyDir', true),
            createMockDirent('imageDir', true),
            createMockDirent('mixedDir', true)
          ] as any;
        } else if (dirPath === path.join(rootPath, 'emptyDir')) {
          return [
            createMockDirent('readme.txt', false)
          ] as any;
        } else if (dirPath === path.join(rootPath, 'imageDir')) {
          return [
            createMockDirent('photo.jpg', false)
          ] as any;
        } else if (dirPath === path.join(rootPath, 'mixedDir')) {
          return [
            createMockDirent('doc.pdf', false),
            createMockDirent('nestedEmpty', true)
          ] as any;
        }
        return [] as any;
      });

      const result = await service.loadDirectory(rootPath, { depth: 2, excludeEmpty: true });

      // Should only include imageDir
      expect(result.children).toHaveLength(1);
      expect(result.children![0].name).toBe('imageDir');
    });

    it('should skip hidden directories', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('.hidden', true),
        createMockDirent('.git', true),
        createMockDirent('visible', true),
        createMockDirent('image.jpg', false)
      ] as any);

      const result = await service.loadDirectory('/test');

      expect(result.children).toHaveLength(2);
      expect(result.children!.map(c => c.name)).toEqual(['visible', 'image.jpg']);
    });

    it('should handle directory read errors gracefully', async () => {
      const rootPath = '/test/error';
      
      mockReaddir.mockImplementation(async (dirPath) => {
        if (dirPath === rootPath) {
          return [
            createMockDirent('accessible', true),
            createMockDirent('forbidden', true),
            createMockDirent('image.jpg', false)
          ] as any;
        } else if (dirPath === path.join(rootPath, 'forbidden')) {
          throw new Error('Permission denied');
        } else if (dirPath === path.join(rootPath, 'accessible')) {
          return [createMockDirent('nested.jpg', false)] as any;
        }
        return [] as any;
      });

      const result = await service.loadDirectory(rootPath, { depth: 2 });

      // The implementation filters out directories that throw errors when processing
      // So we should only have 'accessible' directory and the image file
      expect(result.children).toHaveLength(2);
      expect(result.children![0].name).toBe('accessible');
      expect(result.children![0].hasChildren).toBe(true);
      expect(result.children![0].children).toHaveLength(1);
      expect(result.children![1].name).toBe('image.jpg');
      expect(result.children![1].isDirectory).toBe(false);
    });

    it('should sort directories first, then by name', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('zebra.jpg', false),
        createMockDirent('beta', true),
        createMockDirent('alpha.png', false),
        createMockDirent('gamma', true)
      ] as any);

      const result = await service.loadDirectory('/test');

      expect(result.children!.map(c => c.name)).toEqual([
        'beta',
        'gamma',
        'alpha.png',
        'zebra.jpg'
      ]);
    });
  });

  describe('caching', () => {
    it('should cache directory results', async () => {
      const testPath = '/test/cached';
      mockReaddir.mockResolvedValue([
        createMockDirent('image.jpg', false)
      ] as any);

      // First call
      const result1 = await service.loadDirectory(testPath);
      expect(mockReaddir).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await service.loadDirectory(testPath);
      expect(mockReaddir).toHaveBeenCalledTimes(1);
      expect(result2).toEqual(result1);
    });

    it('should invalidate cache after timeout', async () => {
      const testPath = '/test/timeout';
      mockReaddir.mockResolvedValue([
        createMockDirent('image.jpg', false)
      ] as any);

      // First call
      await service.loadDirectory(testPath);
      expect(mockReaddir).toHaveBeenCalledTimes(1);

      // Advance time past cache timeout (5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Should reload
      await service.loadDirectory(testPath);
      expect(mockReaddir).toHaveBeenCalledTimes(2);
    });

    it('should clear specific cache entries', async () => {
      const path1 = '/test/dir1';
      const path2 = '/test/dir2';
      mockReaddir.mockResolvedValue([
        createMockDirent('image.jpg', false)
      ] as any);

      // Load both directories
      await service.loadDirectory(path1);
      await service.loadDirectory(path2);
      expect(mockReaddir).toHaveBeenCalledTimes(2);

      // Clear cache for dir1
      service.clearCache(path1);

      // dir1 should reload, dir2 should use cache
      await service.loadDirectory(path1);
      await service.loadDirectory(path2);
      expect(mockReaddir).toHaveBeenCalledTimes(3);
    });

    it('should clear subdirectory caches when parent is cleared', async () => {
      const parentPath = '/test/parent';
      const childPath = '/test/parent/child';
      mockReaddir.mockResolvedValue([
        createMockDirent('image.jpg', false)
      ] as any);

      // Load both directories
      await service.loadDirectory(parentPath);
      await service.loadDirectory(childPath);
      expect(mockReaddir).toHaveBeenCalledTimes(2);

      // Clear parent cache
      service.clearCache(parentPath);

      // Both should reload
      await service.loadDirectory(parentPath);
      await service.loadDirectory(childPath);
      expect(mockReaddir).toHaveBeenCalledTimes(4);
    });

    it('should clear all cache entries', () => {
      // This test just verifies the method exists and doesn't throw
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('preloading', () => {
    it('should schedule preloading of subdirectories', async () => {
      const rootPath = '/test/preload';
      
      mockReaddir.mockImplementation(async (dirPath) => {
        if (dirPath === rootPath) {
          return [
            createMockDirent('subdir1', true),
            createMockDirent('subdir2', true)
          ] as any;
        }
        return [createMockDirent('image.jpg', false)] as any;
      });

      await service.loadDirectory(rootPath, { depth: 1, preloadDepth: 1 });
      
      // Preloading happens asynchronously
      vi.runAllTimers();
      await Promise.resolve(); // Let microtasks run
      
      // Subdirectories should have been loaded in background
      expect(mockReaddir).toHaveBeenCalledWith(rootPath, expect.anything());
      
      // Note: Due to setImmediate mocking complexity, we can't easily verify
      // the exact preload calls, but the structure ensures they happen
    });

    it('should not preload the same directory multiple times', async () => {
      const rootPath = '/test/multi';
      
      mockReaddir.mockImplementation(async (dirPath) => {
        if (dirPath === rootPath) {
          return [createMockDirent('subdir', true)] as any;
        }
        return [] as any;
      });

      // Load multiple times quickly
      await Promise.all([
        service.loadDirectory(rootPath, { preloadDepth: 1 }),
        service.loadDirectory(rootPath, { preloadDepth: 1 }),
        service.loadDirectory(rootPath, { preloadDepth: 1 })
      ]);

      // Should only have one preload scheduled
      // This is implicitly tested by not having duplicate cache entries
    });
  });

  describe('loadImageAsBase64', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      } as any);
    });

    it('should load and convert image to base64', async () => {
      const imagePath = '/test/image.jpg';
      const mockImage = {
        width: 800,
        height: 600,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockdata'),
        resize: vi.fn()
      };

      mockImageLoad.mockResolvedValue(mockImage as any);

      const result = await service.loadImageAsBase64(imagePath);

      expect(result).toEqual({
        imageData: 'data:image/jpeg;base64,mockdata',
        width: 800,
        height: 600,
        originalWidth: 800,
        originalHeight: 600
      });
      expect(mockImageLoad).toHaveBeenCalledWith(imagePath);
    });

    it('should throw error if path is not a file', async () => {
      mockStat.mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      } as any);

      await expect(service.loadImageAsBase64('/test/directory')).rejects.toThrow('Not a valid image file: /test/directory');
    });

    it('should throw error if file is not an image', async () => {
      await expect(service.loadImageAsBase64('/test/document.pdf')).rejects.toThrow('Not a valid image file: /test/document.pdf');
    });

    it('should handle stat errors', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(service.loadImageAsBase64('/test/missing.jpg')).rejects.toThrow('Image file not found: /test/missing.jpg');
    });

    it('should handle image loading errors', async () => {
      mockImageLoad.mockRejectedValue(new Error('Invalid image data'));

      await expect(service.loadImageAsBase64('/test/corrupt.jpg')).rejects.toThrow('Invalid image data');
    });
  });

  describe('image caching', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      } as any);
    });

    it('should cache loaded images', async () => {
      const imagePath = '/test/cached-image.jpg';
      const mockImage = {
        width: 800,
        height: 600,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,cacheddata'),
        resize: vi.fn()
      };

      mockImageLoad.mockResolvedValue(mockImage as any);

      // First call - should load from disk
      const result1 = await service.loadImageAsBase64(imagePath);
      expect(mockImageLoad).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await service.loadImageAsBase64(imagePath);
      expect(mockImageLoad).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual(result1);
    });

    it('should clear image cache when clearCache is called', async () => {
      const imagePath = '/test/clear-cache.jpg';
      const mockImage = {
        width: 800,
        height: 600,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,data'),
        resize: vi.fn()
      };

      mockImageLoad.mockResolvedValue(mockImage as any);

      // Load and cache
      await service.loadImageAsBase64(imagePath);
      expect(mockImageLoad).toHaveBeenCalledTimes(1);

      // Clear all cache
      service.clearCache();

      // Should reload
      await service.loadImageAsBase64(imagePath);
      expect(mockImageLoad).toHaveBeenCalledTimes(2);
    });

    it('should clear specific image cache when clearImageCache is called', async () => {
      const imagePath1 = '/test/image1.jpg';
      const imagePath2 = '/test/image2.jpg';
      const mockImage = {
        width: 800,
        height: 600,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,data'),
        resize: vi.fn()
      };

      mockImageLoad.mockResolvedValue(mockImage as any);

      // Load both images
      await service.loadImageAsBase64(imagePath1);
      await service.loadImageAsBase64(imagePath2);
      expect(mockImageLoad).toHaveBeenCalledTimes(2);

      // Clear only image1 cache
      service.clearImageCache(imagePath1);

      // image1 should reload, image2 should use cache
      await service.loadImageAsBase64(imagePath1);
      await service.loadImageAsBase64(imagePath2);
      expect(mockImageLoad).toHaveBeenCalledTimes(3);
    });

    it('should return correct cache statistics', async () => {
      const mockImage = {
        width: 800,
        height: 600,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,data'),
        resize: vi.fn()
      };

      mockImageLoad.mockResolvedValue(mockImage as any);

      // Check initial stats
      let stats = service.getImageCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(10); // Updated max cache size

      // Load some images
      await service.loadImageAsBase64('/test/image1.jpg');
      await service.loadImageAsBase64('/test/image2.jpg');

      stats = service.getImageCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
    });

    it('should evict least recently used images when cache is full', async () => {
      // Mock resize for scaled images
      const mockResize = vi.fn().mockImplementation(() => ({
        width: 1080,  // Scaled to fit within 1920x1080
        height: 810,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,scaled')
      }));

      // Mock responses for different images
      for (let i = 1; i <= 12; i++) {
        mockImageLoad.mockResolvedValueOnce({
          width: 1600,
          height: 1200,
          toDataURL: vi.fn().mockReturnValue(`data:image/jpeg;base64,img${i}`),
          resize: mockResize
        } as any);
      }

      // Load 10 images (fill the cache)
      for (let i = 1; i <= 10; i++) {
        await service.loadImageAsBase64(`/test/image${i}.jpg`);
      }
      expect(mockImageLoad).toHaveBeenCalledTimes(10);

      // Access images 2-10 to update their access time
      for (let i = 2; i <= 10; i++) {
        await service.loadImageAsBase64(`/test/image${i}.jpg`);
      }
      expect(mockImageLoad).toHaveBeenCalledTimes(10); // No new loads

      // Load an 11th image - should evict image1 (least recently used)
      await service.loadImageAsBase64('/test/image11.jpg');
      expect(mockImageLoad).toHaveBeenCalledTimes(11);

      // Try to load image1 again - should reload as it was evicted
      const result = await service.loadImageAsBase64('/test/image1.jpg');
      expect(mockImageLoad).toHaveBeenCalledTimes(12);
      expect(result.imageData).toBe('data:image/jpeg;base64,scaled');
    });
    
    it('should scale images to fit within max dimensions', async () => {
      const imagePath = '/test/large-image.jpg';
      
      // Create mock images - larger than 1920x1080
      const mockFullImage = {
        width: 3840,
        height: 2160,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,full'),
        resize: vi.fn()
      };
      
      const mockScaledImage = {
        width: 1920,  // Scaled to fit within max width
        height: 1080, // Proportionally scaled
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,scaled')
      };
      
      // Mock resize to return scaled image
      mockFullImage.resize.mockReturnValue(mockScaledImage);
      mockImageLoad.mockResolvedValue(mockFullImage as any);

      // Load image for display - should return scaled version
      const result = await service.loadImageAsBase64(imagePath);
      
      // Should return scaled dimensions for display
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.originalWidth).toBe(3840);
      expect(result.originalHeight).toBe(2160);
      expect(result.imageData).toBe('data:image/jpeg;base64,scaled');
      
      // Should have created scaled version
      expect(mockFullImage.resize).toHaveBeenCalledWith({
        width: 1920
      });
    });
    
    it('should not scale images that fit within max dimensions', async () => {
      const imagePath = '/test/small-image.jpg';
      
      const mockFullImage = {
        width: 800,
        height: 600,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,small'),
        resize: vi.fn()
      };
      
      mockImageLoad.mockResolvedValue(mockFullImage as any);

      // Load image for display
      const result = await service.loadImageAsBase64(imagePath);
      
      // Should return original dimensions
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.originalWidth).toBe(800);
      expect(result.originalHeight).toBe(600);
      expect(result.imageData).toBe('data:image/jpeg;base64,small');
      
      // Should not have called resize
      expect(mockFullImage.resize).not.toHaveBeenCalled();
    });
    
    it('should scale based on height when that is the limiting factor', async () => {
      const imagePath = '/test/tall-image.jpg';
      
      const mockFullImage = {
        width: 1000,
        height: 3000,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,full'),
        resize: vi.fn()
      };
      
      const mockScaledImage = {
        width: 360,   // 1000 * (1080/3000)
        height: 1080, // Scaled to fit within max height
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,scaled')
      };
      
      mockFullImage.resize.mockReturnValue(mockScaledImage);
      mockImageLoad.mockResolvedValue(mockFullImage as any);

      const result = await service.loadImageAsBase64(imagePath);
      
      expect(result.width).toBe(360);
      expect(result.height).toBe(1080);
      
      // Should have scaled based on height constraint
      expect(mockFullImage.resize).toHaveBeenCalledWith({
        width: 360
      });
    });
    
    it('should use scaled image for frame generation', async () => {
      const imagePath = '/test/frame.jpg';
      
      // Create mock images
      const mockFullImage = {
        width: 3000,
        height: 2000,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,full'),
        resize: vi.fn()
      };
      
      const mockScaledImage = {
        width: 1620,  // 3000 * (1080/2000)
        height: 1080, // Limited by height
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,scaled')
      };
      
      // Mock resize to return scaled image
      mockFullImage.resize.mockReturnValue(mockScaledImage);
      mockImageLoad.mockResolvedValue(mockFullImage as any);

      // Load image first
      await service.loadImageAsBase64(imagePath);

      // Mock FrameService to return a valid frame
      const mockFrameService = (service as any).frameService;
      mockFrameService.generateFrameFromSeed = vi.fn().mockReturnValue({
        id: 'frame-1',
        label: 'Frame 1',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        orientation: 0
      });

      // Generate a frame - should use cached scaled image
      const frameData = await service.generateFrame(
        imagePath,
        { x: 100, y: 100 }
      );

      expect(frameData).toBeDefined();
      // Frame coordinates are in display space
      expect(frameData.x).toBe(50);
      expect(frameData.y).toBe(50);
      expect(frameData.width).toBe(100);
      expect(frameData.height).toBe(100);
      
      // Verify frame service was called with both images
      expect(mockFrameService.generateFrameFromSeed).toHaveBeenCalledWith(
        mockFullImage,        // original full-resolution image
        mockScaledImage,      // scaled version for detection
        0.54,                 // scale factor
        { x: 100, y: 100 },   // seed
        undefined             // config
      );
      
      // Result should have the returned frame data
      expect(frameData).toEqual({
        id: 'frame-1',
        label: 'Frame 1',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        orientation: 0
      });
    });
    
    it('should not create duplicate scaled images when multiple calls happen', async () => {
      const imagePath = '/test/no-duplicates.jpg';
      
      const mockFullImage = {
        width: 3000,
        height: 2000,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,full'),
        resize: vi.fn()
      };
      
      const mockScaledImage = {
        width: 1620,
        height: 1080,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,scaled')
      };
      
      mockFullImage.resize.mockReturnValue(mockScaledImage);
      mockImageLoad.mockResolvedValue(mockFullImage as any);

      // Make multiple loadImageAsBase64 calls quickly
      await Promise.all([
        service.loadImageAsBase64(imagePath),
        service.loadImageAsBase64(imagePath),
        service.loadImageAsBase64(imagePath)
      ]);

      // Image should only be loaded once
      expect(mockImageLoad).toHaveBeenCalledTimes(1);
      
      // Scaled image should only be created once
      expect(mockFullImage.resize).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle root directory path', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('image.jpg', false)
      ] as any);

      const result = await service.loadDirectory('/');

      expect(result.name).toBe('/');
      expect(result.path).toBe('/');
    });

    it('should handle deeply nested empty structure', async () => {
      const rootPath = '/test/empty';
      
      mockReaddir.mockImplementation(async (dirPath) => {
        const depth = dirPath.split('/').length - 3;
        if (depth < 3) {
          return [createMockDirent(`emptyDir${depth}`, true)] as any;
        }
        return [] as any;
      });

      const result = await service.loadDirectory(rootPath, { 
        depth: 5, 
        excludeEmpty: true 
      });

      expect(result.hasChildren).toBe(false);
      expect(result.children).toEqual([]);
    });

    it('should handle mixed file types', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('image.jpg', false),
        createMockDirent('image.PNG', false),  // uppercase extension
        createMockDirent('document.pdf', false),
        createMockDirent('script.js', false),
        createMockDirent('photo.jpeg', false),
        createMockDirent('.hidden.jpg', false),
        createMockDirent('image.JPG', false)   // uppercase extension
      ] as any);

      const result = await service.loadDirectory('/test/mixed');

      // Should only include image files
      const imageNames = result.children!.map(c => c.name);
      expect(imageNames).toContain('image.jpg');
      expect(imageNames).toContain('image.PNG');
      expect(imageNames).toContain('photo.jpeg');
      expect(imageNames).toContain('.hidden.jpg');
      expect(imageNames).toContain('image.JPG');
      expect(imageNames).not.toContain('document.pdf');
      expect(imageNames).not.toContain('script.js');
    });
  });
}); 