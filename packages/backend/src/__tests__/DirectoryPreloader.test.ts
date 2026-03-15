import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirectoryPreloader } from '../services/DirectoryPreloader';
import type { DirectoryNode } from '@workspace/shared';

function createMockDirectoryNode(
  path: string,
  hasChildren = true
): DirectoryNode {
  return {
    name: path.split('/').pop() || '',
    path,
    isDirectory: true,
    hasChildren,
    childrenLoaded: true,
    children: [],
  };
}

function createMockFileNode(path: string): DirectoryNode {
  return {
    name: path.split('/').pop() || '',
    path,
    isDirectory: false,
  };
}

describe('DirectoryPreloader', () => {
  let preloader: DirectoryPreloader;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    preloader = new DirectoryPreloader();
    mockCallback = vi
      .fn()
      .mockResolvedValue(createMockDirectoryNode('/result'));
  });

  it('should schedule preload for directories with hasChildren: true', async () => {
    const children = [
      createMockDirectoryNode('/test/sub1', true),
      createMockFileNode('/test/photo.jpg'),
    ];

    preloader.schedulePreload(children, 1, mockCallback);

    // Wait for setImmediate callbacks to execute
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('/test/sub1', {
      depth: 1,
      preloadDepth: 0,
      excludeEmpty: true,
    });
  });

  it('should skip file nodes', async () => {
    const children = [
      createMockFileNode('/test/a.jpg'),
      createMockFileNode('/test/b.png'),
    ];

    preloader.schedulePreload(children, 1, mockCallback);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should skip directories already in queue (deduplication)', async () => {
    // Use a slow callback that won't resolve immediately
    let resolveFirst!: () => void;
    const slowCallback = vi.fn().mockImplementation(
      () =>
        new Promise<DirectoryNode>((resolve) => {
          resolveFirst = () => resolve(createMockDirectoryNode('/result'));
        })
    );

    const children = [createMockDirectoryNode('/test/sub1', true)];

    preloader.schedulePreload(children, 1, slowCallback);
    // Schedule again before the first completes
    preloader.schedulePreload(children, 1, slowCallback);

    // Let setImmediate fire
    await new Promise((resolve) => setImmediate(resolve));

    // Only one call should have been made despite two schedulePreload calls
    expect(slowCallback).toHaveBeenCalledTimes(1);

    // Cleanup
    resolveFirst();
  });

  it('should remove path from queue after callback resolves', async () => {
    const children = [createMockDirectoryNode('/test/sub1', true)];

    preloader.schedulePreload(children, 1, mockCallback);
    expect(preloader.isQueued('/test/sub1')).toBe(true);

    // Let the callback execute and resolve
    await new Promise((resolve) => setImmediate(resolve));
    // One more tick for the async callback to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(preloader.isQueued('/test/sub1')).toBe(false);
  });

  it('should remove path from queue even when callback rejects', async () => {
    const failingCallback = vi.fn().mockRejectedValue(new Error('Load failed'));
    const children = [createMockDirectoryNode('/test/sub1', true)];

    preloader.schedulePreload(children, 1, failingCallback);

    // Let the callback execute and reject
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Path should be removed from queue via the finally block
    expect(preloader.isQueued('/test/sub1')).toBe(false);
  });

  it('should report isQueued as true while load is in-flight', () => {
    // Use a callback that never resolves (stays pending)
    const pendingCallback = vi.fn().mockReturnValue(new Promise(() => {}));
    const children = [createMockDirectoryNode('/test/sub1', true)];

    preloader.schedulePreload(children, 1, pendingCallback);

    // Path is queued immediately (before setImmediate fires)
    expect(preloader.isQueued('/test/sub1')).toBe(true);
  });

  it('should empty the set when clearQueue is called', () => {
    const pendingCallback = vi.fn().mockReturnValue(new Promise(() => {}));
    const children = [
      createMockDirectoryNode('/test/sub1', true),
      createMockDirectoryNode('/test/sub2', true),
    ];

    preloader.schedulePreload(children, 1, pendingCallback);
    expect(preloader.isQueued('/test/sub1')).toBe(true);
    expect(preloader.isQueued('/test/sub2')).toBe(true);

    preloader.clearQueue();

    expect(preloader.isQueued('/test/sub1')).toBe(false);
    expect(preloader.isQueued('/test/sub2')).toBe(false);
  });

  it('should be a no-op for empty children array', async () => {
    preloader.schedulePreload([], 1, mockCallback);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockCallback).not.toHaveBeenCalled();
  });
});
