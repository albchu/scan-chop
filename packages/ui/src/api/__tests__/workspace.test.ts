import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FrameData } from '@workspace/shared';

vi.spyOn(console, 'log').mockImplementation(() => {});

// Do NOT mock the workspace module — we're testing the real implementation.
// Instead, mock the electron bridge it depends on.
let workspaceApi: typeof import('../workspace').workspaceApi;

describe('workspaceApi', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockInvoke = vi.fn();
    (globalThis as Record<string, unknown>).window = {
      backend: { invoke: mockInvoke },
    };
    // Dynamic import to pick up the mocked window.backend
    const mod = await import('../workspace');
    workspaceApi = mod.workspaceApi;
  });

  // ── loadDirectory ─────────────────────────────────────────────────
  describe('loadDirectory', () => {
    it('returns data on success', async () => {
      const tree = {
        name: 'root',
        path: '/root',
        isDirectory: true,
        children: [],
      };
      mockInvoke.mockResolvedValue({ success: true, data: tree });

      const result = await workspaceApi.loadDirectory('/root');

      expect(mockInvoke).toHaveBeenCalledWith(
        'workspace:loadDirectory',
        '/root',
        undefined
      );
      expect(result).toEqual(tree);
    });

    it('throws on failure response', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'Not found' });

      await expect(workspaceApi.loadDirectory('/bad')).rejects.toThrow(
        'Not found'
      );
    });

    it('throws when success is true but data is missing', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: undefined });

      await expect(workspaceApi.loadDirectory('/bad')).rejects.toThrow(
        'Failed to load directory'
      );
    });
  });

  // ── clearCache ────────────────────────────────────────────────────
  describe('clearCache', () => {
    it('invokes IPC without checking response', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await workspaceApi.clearCache('/path');

      expect(mockInvoke).toHaveBeenCalledWith('workspace:clearCache', '/path');
    });
  });

  // ── loadImage ─────────────────────────────────────────────────────
  describe('loadImage', () => {
    it('returns image data on success', async () => {
      const img = {
        imageData: 'data:img',
        width: 100,
        height: 50,
        originalWidth: 200,
        originalHeight: 100,
      };
      mockInvoke.mockResolvedValue({ success: true, data: img });

      const result = await workspaceApi.loadImage('/img.png');

      expect(result).toEqual(img);
    });

    it('throws on failure', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'Corrupt file' });

      await expect(workspaceApi.loadImage('/bad.png')).rejects.toThrow(
        'Corrupt file'
      );
    });
  });

  // ── generateFrame ─────────────────────────────────────────────────
  describe('generateFrame', () => {
    it('passes seed and config to IPC and returns frame data', async () => {
      const frame = { id: 'f1', x: 10, y: 20 };
      mockInvoke.mockResolvedValue({ success: true, data: frame });

      const result = await workspaceApi.generateFrame(
        '/img.png',
        { x: 50, y: 60 },
        { whiteThreshold: 220 }
      );

      expect(mockInvoke).toHaveBeenCalledWith(
        'workspace:generateFrame',
        '/img.png',
        { x: 50, y: 60 },
        { whiteThreshold: 220 }
      );
      expect(result).toEqual(frame);
    });

    it('throws on failure', async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        error: 'No region found',
      });

      await expect(
        workspaceApi.generateFrame('/img.png', { x: 0, y: 0 })
      ).rejects.toThrow('No region found');
    });
  });

  // ── updateFrame ───────────────────────────────────────────────────
  describe('updateFrame', () => {
    it('returns updated frame on success', async () => {
      const updated = { id: 'f1', x: 99 };
      mockInvoke.mockResolvedValue({ success: true, data: updated });

      const result = await workspaceApi.updateFrame('f1', { x: 99 });

      expect(result).toEqual(updated);
    });

    it('throws on failure', async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        error: 'Frame not found',
      });

      await expect(workspaceApi.updateFrame('f1', {})).rejects.toThrow(
        'Frame not found'
      );
    });
  });

  // ── selectDirectory ───────────────────────────────────────────────
  describe('selectDirectory', () => {
    it('returns directory path on success', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        data: { directory: '/chosen' },
      });

      const result = await workspaceApi.selectDirectory();

      expect(result).toBe('/chosen');
    });

    it('returns null when user cancels', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'cancelled' });

      const result = await workspaceApi.selectDirectory();

      expect(result).toBeNull();
    });

    it('throws on non-cancel errors', async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      await expect(workspaceApi.selectDirectory()).rejects.toThrow(
        'Permission denied'
      );
    });
  });

  // ── checkFilesExist ───────────────────────────────────────────────
  describe('checkFilesExist', () => {
    it('returns array of existing filenames', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        data: { existingFiles: ['a.png', 'b.png'] },
      });

      const result = await workspaceApi.checkFilesExist('/dir', [
        'a.png',
        'b.png',
        'c.png',
      ]);

      expect(result).toEqual(['a.png', 'b.png']);
    });

    it('throws on failure', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'Access denied' });

      await expect(workspaceApi.checkFilesExist('/dir', [])).rejects.toThrow(
        'Access denied'
      );
    });
  });

  // ── saveAllFrames ─────────────────────────────────────────────────
  describe('saveAllFrames', () => {
    it('returns saved paths and errors on success', async () => {
      const result = { savedPaths: ['/a.png'], errors: [] };
      mockInvoke.mockResolvedValue({ success: true, data: result });

      const response = await workspaceApi.saveAllFrames(
        '/dir',
        [] as FrameData[],
        ['a.png']
      );

      expect(response).toEqual(result);
    });

    it('throws on failure', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'Disk full' });

      await expect(workspaceApi.saveAllFrames('/dir', [], [])).rejects.toThrow(
        'Disk full'
      );
    });
  });

  // ── saveFrame ─────────────────────────────────────────────────────
  describe('saveFrame', () => {
    it('returns file path on success', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        data: { filePath: '/saved.png' },
      });

      const result = await workspaceApi.saveFrame({
        id: 'f1',
      } as unknown as FrameData);

      expect(result).toEqual({ filePath: '/saved.png' });
    });

    it('returns null when user cancels', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'cancelled' });

      const result = await workspaceApi.saveFrame({
        id: 'f1',
      } as unknown as FrameData);

      expect(result).toBeNull();
    });

    it('throws on non-cancel errors', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'Write failed' });

      await expect(
        workspaceApi.saveFrame({ id: 'f1' } as unknown as FrameData)
      ).rejects.toThrow('Write failed');
    });
  });

  // ── rotateFrame ───────────────────────────────────────────────────
  describe('rotateFrame', () => {
    it('returns partial frame updates on success', async () => {
      mockInvoke.mockResolvedValue({
        success: true,
        data: { orientation: 90 },
      });

      const result = await workspaceApi.rotateFrame({
        id: 'f1',
      } as unknown as FrameData);

      expect(result).toEqual({ orientation: 90 });
    });

    it('throws on failure', async () => {
      mockInvoke.mockResolvedValue({
        success: false,
        error: 'Rotation failed',
      });

      await expect(
        workspaceApi.rotateFrame({ id: 'f1' } as unknown as FrameData)
      ).rejects.toThrow('Rotation failed');
    });
  });
});
