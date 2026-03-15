import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '../workspaceStore';
import { workspaceApi } from '../../api/workspace';
import type { DirectoryNode } from '@workspace/shared';

vi.mock('../../api/workspace', () => ({
  workspaceApi: {
    loadDirectory: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

const mockTree: DirectoryNode = {
  name: 'photos',
  path: '/Users/test/photos',
  isDirectory: true,
  children: [
    {
      name: 'scan1.png',
      path: '/Users/test/photos/scan1.png',
      isDirectory: false,
    },
  ],
};

describe('workspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Merge-reset state fields without wiping action functions
    useWorkspaceStore.setState({
      currentDirectory: null,
      rootDirectory: null,
      directoryTree: null,
      isLoading: false,
      error: null,
    });
  });

  // ── loadDirectory ─────────────────────────────────────────────────
  describe('loadDirectory', () => {
    it('loads and stores directory tree on success', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockResolvedValue(mockTree);

      await useWorkspaceStore.getState().loadDirectory('/Users/test/photos');

      const state = useWorkspaceStore.getState();
      expect(state.currentDirectory).toBe('/Users/test/photos');
      expect(state.rootDirectory).toBe('/Users/test/photos');
      expect(state.directoryTree).toEqual(mockTree);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on Error instance failure', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockRejectedValue(
        new Error('Permission denied')
      );

      await useWorkspaceStore.getState().loadDirectory('/forbidden');

      const state = useWorkspaceStore.getState();
      expect(state.error).toBe('Permission denied');
      expect(state.isLoading).toBe(false);
    });

    it('sets generic error message for non-Error thrown values', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockRejectedValue('string error');

      await useWorkspaceStore.getState().loadDirectory('/bad');

      expect(useWorkspaceStore.getState().error).toBe(
        'Failed to load directory'
      );
    });

    it('merges custom options with defaults', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockResolvedValue(mockTree);

      await useWorkspaceStore.getState().loadDirectory('/test', { depth: 5 });

      expect(workspaceApi.loadDirectory).toHaveBeenCalledWith('/test', {
        depth: 5,
        preloadDepth: 2,
        excludeEmpty: true,
      });
    });
  });

  // ── loadSubDirectory ──────────────────────────────────────────────
  describe('loadSubDirectory', () => {
    it('returns tree data without modifying store state', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockResolvedValue(mockTree);

      const result = await useWorkspaceStore
        .getState()
        .loadSubDirectory('/sub');

      expect(result).toEqual(mockTree);
      // Store state should remain unchanged
      expect(useWorkspaceStore.getState().currentDirectory).toBeNull();
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });

    it('re-throws error without setting state.error', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockRejectedValue(
        new Error('Network failure')
      );

      await expect(
        useWorkspaceStore.getState().loadSubDirectory('/bad')
      ).rejects.toThrow('Network failure');

      expect(useWorkspaceStore.getState().error).toBeNull();
    });
  });

  // ── setRootDirectory ──────────────────────────────────────────────
  describe('setRootDirectory', () => {
    it('replaces root and current directory on success', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockResolvedValue(mockTree);

      await useWorkspaceStore.getState().setRootDirectory('/new/root');

      const state = useWorkspaceStore.getState();
      expect(state.currentDirectory).toBe('/new/root');
      expect(state.rootDirectory).toBe('/new/root');
      expect(state.directoryTree).toEqual(mockTree);
    });

    it('sets error on failure', async () => {
      vi.mocked(workspaceApi.loadDirectory).mockRejectedValue(
        new Error('Not found')
      );

      await useWorkspaceStore.getState().setRootDirectory('/missing');

      expect(useWorkspaceStore.getState().error).toBe('Not found');
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });
  });

  // ── refreshDirectory ──────────────────────────────────────────────
  describe('refreshDirectory', () => {
    it('clears cache then reloads current directory', async () => {
      vi.mocked(workspaceApi.clearCache).mockResolvedValue(undefined);
      vi.mocked(workspaceApi.loadDirectory).mockResolvedValue(mockTree);

      useWorkspaceStore.setState({ currentDirectory: '/test/dir' });

      await useWorkspaceStore.getState().refreshDirectory();

      expect(workspaceApi.clearCache).toHaveBeenCalledWith('/test/dir');
      expect(workspaceApi.loadDirectory).toHaveBeenCalled();
    });

    it('returns immediately when no current directory', async () => {
      await useWorkspaceStore.getState().refreshDirectory();

      expect(workspaceApi.clearCache).not.toHaveBeenCalled();
      expect(workspaceApi.loadDirectory).not.toHaveBeenCalled();
    });
  });

  // ── clearError ────────────────────────────────────────────────────
  describe('clearError', () => {
    it('sets error to null', () => {
      useWorkspaceStore.setState({ error: 'Some error' });
      useWorkspaceStore.getState().clearError();
      expect(useWorkspaceStore.getState().error).toBeNull();
    });
  });
});
