import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirectoryScanner } from '../services/DirectoryScanner.js';
import type { DirectoryNode } from '@workspace/shared';

vi.mock('fs/promises', () => ({
  default: {
    readdir: vi.fn(),
  },
}));

vi.mock('../utils/isImageFile.js', () => ({
  isImageFile: vi.fn(),
}));

import fs from 'fs/promises';
import { isImageFile } from '../utils/isImageFile.js';

const mockReaddir = fs.readdir as ReturnType<typeof vi.fn>;
const mockIsImageFile = isImageFile as ReturnType<typeof vi.fn>;

function createMockDirent(name: string, isDirectory: boolean) {
  return {
    name,
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
    isSymbolicLink: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}

describe('DirectoryScanner', () => {
  let scanner: DirectoryScanner;

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new DirectoryScanner();

    // Default: treat .jpg/.png/.gif as images, reject everything else
    mockIsImageFile.mockImplementation((filePath: string) => {
      const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
      return [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'webp',
        'tiff',
        'tif',
      ].includes(ext);
    });
  });

  describe('scanDirectory', () => {
    it('should scan a flat directory with image files', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('photo1.jpg', false),
        createMockDirent('photo2.png', false),
      ]);

      const result = await scanner.scanDirectory('/test/photos', 1, 10);

      expect(result.name).toBe('photos');
      expect(result.path).toBe('/test/photos');
      expect(result.isDirectory).toBe(true);
      expect(result.childrenLoaded).toBe(true);
      expect(result.children).toHaveLength(2);
      expect(result.children![0].isDirectory).toBe(false);
      expect(result.children![1].isDirectory).toBe(false);
    });

    it('should filter out non-image files and keep image files', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('photo.jpg', false),
        createMockDirent('readme.txt', false),
        createMockDirent('data.pdf', false),
      ]);

      const result = await scanner.scanDirectory('/test', 1, 10);

      expect(result.children).toHaveLength(1);
      expect(result.children![0].name).toBe('photo.jpg');
    });

    it('should skip hidden directories', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('.git', true),
        createMockDirent('.DS_Store', true),
        createMockDirent('visible', true),
        createMockDirent('photo.jpg', false),
      ]);

      // Subdirectory reads return empty
      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/test') {
          return [
            createMockDirent('.git', true),
            createMockDirent('.DS_Store', true),
            createMockDirent('visible', true),
            createMockDirent('photo.jpg', false),
          ];
        }
        return [];
      });

      const result = await scanner.scanDirectory('/test', 1, 10);

      const childNames = result.children!.map((c) => c.name);
      expect(childNames).not.toContain('.git');
      expect(childNames).not.toContain('.DS_Store');
      expect(childNames).toContain('visible');
      expect(childNames).toContain('photo.jpg');
    });

    it('should recursively scan up to specified depth', async () => {
      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/root') {
          return [createMockDirent('level1', true)];
        }
        if (dirPath === '/root/level1') {
          return [createMockDirent('level2', true)];
        }
        if (dirPath === '/root/level1/level2') {
          return [createMockDirent('photo.jpg', false)];
        }
        return [];
      });

      const result = await scanner.scanDirectory('/root', 3, 10);

      expect(result.childrenLoaded).toBe(true);
      expect(result.children![0].name).toBe('level1');
      expect(result.children![0].childrenLoaded).toBe(true);
      expect(result.children![0].children![0].name).toBe('level2');
      expect(result.children![0].children![0].childrenLoaded).toBe(true);
      expect(result.children![0].children![0].children![0].name).toBe(
        'photo.jpg'
      );
    });

    it('should return childrenLoaded: false at depth boundary', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('subdir', true),
        createMockDirent('photo.jpg', false),
      ]);

      const result = await scanner.scanDirectory('/test', 0, 10);

      expect(result.childrenLoaded).toBe(false);
      expect(result.children).toBeUndefined();
      expect(result.hasChildren).toBe(true);
    });

    it('should return graceful empty node when readdir throws', async () => {
      mockReaddir.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await scanner.scanDirectory('/forbidden', 1, 10);

      expect(result.name).toBe('forbidden');
      expect(result.isDirectory).toBe(true);
      expect(result.hasChildren).toBe(false);
      expect(result.childrenLoaded).toBe(true);
      expect(result.children).toEqual([]);
    });

    it('should handle single child failure without aborting siblings', async () => {
      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/test') {
          return [
            createMockDirent('good1', true),
            createMockDirent('bad', true),
            createMockDirent('good2', true),
          ];
        }
        if (dirPath === '/test/bad') {
          throw new Error('Permission denied');
        }
        return [createMockDirent('photo.jpg', false)];
      });

      const result = await scanner.scanDirectory('/test', 2, 10);

      // scanDirectory catches readdir errors internally and returns the failing
      // directory as an empty node. The key behavior: siblings are not aborted.
      const good1 = result.children!.find((c) => c.name === 'good1');
      const good2 = result.children!.find((c) => c.name === 'good2');
      const bad = result.children!.find((c) => c.name === 'bad');

      expect(good1).toBeDefined();
      expect(good1!.children).toHaveLength(1);
      expect(good2).toBeDefined();
      expect(good2!.children).toHaveLength(1);
      // The failing directory is returned as an empty node (graceful degradation)
      expect(bad).toBeDefined();
      expect(bad!.hasChildren).toBe(false);
      expect(bad!.children).toEqual([]);
    });

    it('should produce sensible node name for root path', async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await scanner.scanDirectory('/', 1, 10);

      // basename('/') returns '', fallback to dirPath '/'
      expect(result.name).toBe('/');
      expect(result.path).toBe('/');
    });

    it('should compute hasChildren correctly at depth 0', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('subdir', true),
        createMockDirent('photo.jpg', false),
      ]);

      const result = await scanner.scanDirectory('/test', 0, 10);

      // Even at depth 0 (no children loaded), hasChildren is computed from entries
      expect(result.hasChildren).toBe(true);
      expect(result.childrenLoaded).toBe(false);
    });

    it('should return hasChildren: false for empty directories', async () => {
      mockReaddir.mockResolvedValue([]);

      const result = await scanner.scanDirectory('/empty', 1, 10);

      expect(result.hasChildren).toBe(false);
      expect(result.children).toEqual([]);
    });
  });

  describe('sortChildren', () => {
    it('should sort directories before files', async () => {
      mockReaddir.mockResolvedValue([
        createMockDirent('photo.jpg', false),
        createMockDirent('folder', true),
        createMockDirent('another.png', false),
      ]);

      // Subdir reads
      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/test') {
          return [
            createMockDirent('photo.jpg', false),
            createMockDirent('folder', true),
            createMockDirent('another.png', false),
          ];
        }
        return [];
      });

      const result = await scanner.scanDirectory('/test', 1, 10);

      expect(result.children![0].isDirectory).toBe(true);
      expect(result.children![0].name).toBe('folder');
      expect(result.children![1].isDirectory).toBe(false);
      expect(result.children![2].isDirectory).toBe(false);
    });

    it('should sort alphabetically within each group', async () => {
      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath === '/test') {
          return [
            createMockDirent('gamma', true),
            createMockDirent('alpha', true),
            createMockDirent('beta', true),
            createMockDirent('z.jpg', false),
            createMockDirent('a.png', false),
          ];
        }
        return [];
      });

      const result = await scanner.scanDirectory('/test', 1, 10);
      const names = result.children!.map((c) => c.name);

      expect(names).toEqual(['alpha', 'beta', 'gamma', 'a.png', 'z.jpg']);
    });
  });

  describe('pruneEmptyDirectories', () => {
    it('should prune tree of nested empty directories', () => {
      const tree: DirectoryNode = {
        name: 'root',
        path: '/root',
        isDirectory: true,
        hasChildren: true,
        childrenLoaded: true,
        children: [
          {
            name: 'empty-parent',
            path: '/root/empty-parent',
            isDirectory: true,
            hasChildren: true,
            childrenLoaded: true,
            children: [
              {
                name: 'empty-child',
                path: '/root/empty-parent/empty-child',
                isDirectory: true,
                hasChildren: false,
                childrenLoaded: true,
                children: [],
              },
            ],
          },
        ],
      };

      const pruned = scanner.pruneEmptyDirectories(tree);

      expect(pruned.hasChildren).toBe(false);
      expect(pruned.children).toEqual([]);
    });

    it('should preserve directories containing image files', () => {
      const tree: DirectoryNode = {
        name: 'root',
        path: '/root',
        isDirectory: true,
        hasChildren: true,
        childrenLoaded: true,
        children: [
          {
            name: 'empty-dir',
            path: '/root/empty-dir',
            isDirectory: true,
            hasChildren: false,
            childrenLoaded: true,
            children: [],
          },
          {
            name: 'image-dir',
            path: '/root/image-dir',
            isDirectory: true,
            hasChildren: true,
            childrenLoaded: true,
            children: [
              {
                name: 'photo.jpg',
                path: '/root/image-dir/photo.jpg',
                isDirectory: false,
              },
            ],
          },
        ],
      };

      const pruned = scanner.pruneEmptyDirectories(tree);

      expect(pruned.children).toHaveLength(1);
      expect(pruned.children![0].name).toBe('image-dir');
      expect(pruned.hasChildren).toBe(true);
    });

    it('should return file nodes unchanged', () => {
      const fileNode: DirectoryNode = {
        name: 'photo.jpg',
        path: '/root/photo.jpg',
        isDirectory: false,
      };

      const result = scanner.pruneEmptyDirectories(fileNode);

      expect(result).toEqual(fileNode);
    });
  });
});
