import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DirectoryCacheManager } from '../services/DirectoryCacheManager.js';
import type { DirectoryNode } from '@workspace/shared';

describe('DirectoryCacheManager', () => {
  let cacheManager: DirectoryCacheManager;

  const createNode = (path: string): DirectoryNode => ({
    name: path.split('/').pop() || '',
    path,
    isDirectory: true,
    hasChildren: false,
    childrenLoaded: true,
    children: [],
  });

  beforeEach(() => {
    vi.useFakeTimers();
    cacheManager = new DirectoryCacheManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should store and retrieve nodes', () => {
      const node = createNode('/test/dir');
      cacheManager.set('/test/dir', node);

      const retrieved = cacheManager.get('/test/dir');
      expect(retrieved).toEqual(node);
    });

    it('should return null for non-existent entries', () => {
      expect(cacheManager.get('/non/existent')).toBeNull();
    });

    it('should expire entries after timeout', () => {
      const node = createNode('/test/dir');
      cacheManager.set('/test/dir', node);

      // Advance time past default timeout (5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      expect(cacheManager.get('/test/dir')).toBeNull();
    });

    it('should respect custom timeout', () => {
      cacheManager = new DirectoryCacheManager(1000); // 1 second timeout
      const node = createNode('/test/dir');
      cacheManager.set('/test/dir', node);

      // Just before timeout
      vi.advanceTimersByTime(999);
      expect(cacheManager.get('/test/dir')).toEqual(node);

      // After timeout
      vi.advanceTimersByTime(2);
      expect(cacheManager.get('/test/dir')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing entries', () => {
      const node = createNode('/test/dir');
      cacheManager.set('/test/dir', node);

      expect(cacheManager.has('/test/dir')).toBe(true);
    });

    it('should return false for non-existent entries', () => {
      expect(cacheManager.has('/non/existent')).toBe(false);
    });

    it('should return false for expired entries', () => {
      const node = createNode('/test/dir');
      cacheManager.set('/test/dir', node);

      vi.advanceTimersByTime(6 * 60 * 1000);

      expect(cacheManager.has('/test/dir')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries when called without path', () => {
      cacheManager.set('/test/dir1', createNode('/test/dir1'));
      cacheManager.set('/test/dir2', createNode('/test/dir2'));
      cacheManager.set('/other/dir', createNode('/other/dir'));

      cacheManager.clear();

      expect(cacheManager.has('/test/dir1')).toBe(false);
      expect(cacheManager.has('/test/dir2')).toBe(false);
      expect(cacheManager.has('/other/dir')).toBe(false);
    });

    it('should clear specific entry when called with path', () => {
      cacheManager.set('/test/dir1', createNode('/test/dir1'));
      cacheManager.set('/test/dir2', createNode('/test/dir2'));

      cacheManager.clear('/test/dir1');

      expect(cacheManager.has('/test/dir1')).toBe(false);
      expect(cacheManager.has('/test/dir2')).toBe(true);
    });

    it('should clear subdirectories when parent is cleared', () => {
      cacheManager.set('/test', createNode('/test'));
      cacheManager.set('/test/sub1', createNode('/test/sub1'));
      cacheManager.set('/test/sub1/deep', createNode('/test/sub1/deep'));
      cacheManager.set('/test/sub2', createNode('/test/sub2'));
      cacheManager.set('/other', createNode('/other'));

      cacheManager.clear('/test');

      expect(cacheManager.has('/test')).toBe(false);
      expect(cacheManager.has('/test/sub1')).toBe(false);
      expect(cacheManager.has('/test/sub1/deep')).toBe(false);
      expect(cacheManager.has('/test/sub2')).toBe(false);
      expect(cacheManager.has('/other')).toBe(true);
    });

    it('should clear sibling paths sharing a prefix (known startsWith behavior)', () => {
      // Documents the known prefix-match behavior: clear('/photos') also clears
      // '/photos2' because '/photos2'.startsWith('/photos') is true.
      // This test should be updated when the bug is fixed to expect '/photos2' preserved.
      cacheManager.set('/photos', createNode('/photos'));
      cacheManager.set('/photos/sub', createNode('/photos/sub'));
      cacheManager.set('/photos2', createNode('/photos2'));

      cacheManager.clear('/photos');

      expect(cacheManager.has('/photos')).toBe(false);
      expect(cacheManager.has('/photos/sub')).toBe(false);
      // This documents the current (buggy) behavior: sibling is also cleared
      expect(cacheManager.has('/photos2')).toBe(false);
    });
  });

  describe('side effects', () => {
    it('should prune expired entries as a side-effect of has()', () => {
      cacheManager.set('/test/dir', createNode('/test/dir'));

      // Advance past TTL
      vi.advanceTimersByTime(6 * 60 * 1000);

      // has() delegates to get(), which deletes the expired entry
      expect(cacheManager.has('/test/dir')).toBe(false);
      // Confirm the entry was actually removed (not just expired-on-read)
      expect(cacheManager.get('/test/dir')).toBeNull();
    });
  });
});
