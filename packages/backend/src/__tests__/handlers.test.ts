import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupIpcHandlers } from '../ipc/handlers.js';
import type { FrameData, DirectoryNode } from '@workspace/shared';

// Mock electron -- capture registered handlers so we can invoke them directly
const registeredHandlers = new Map<string, Function>();
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler);
    }),
  },
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
  },
}));

import { dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';

// Build a mock WorkspaceService with every method stubbed
function createMockWorkspaceService() {
  return {
    loadDirectory: vi.fn(),
    clearCache: vi.fn(),
    loadImageAsBase64: vi.fn(),
    generateFrame: vi.fn(),
    updateFrame: vi.fn(),
    saveFrameToPath: vi.fn(),
    rotateFrame: vi.fn(),
    getSanitizedFrameFilename: vi.fn().mockReturnValue('Frame_1.png'),
    getFrame: vi.fn(),
    getAllFrames: vi.fn(),
    deleteFrame: vi.fn(),
    clearCurrentImageCache: vi.fn(),
  };
}

function createMockFrameData(overrides?: Partial<FrameData>): FrameData {
  return {
    id: 'page-abc-frame-1',
    label: 'Frame 1',
    x: 100,
    y: 50,
    width: 200,
    height: 150,
    rotation: 0,
    orientation: 0,
    imageData: 'data:image/png;base64,mockdata',
    pageId: 'page-abc',
    ...overrides,
  };
}

// Helper to invoke a captured handler (simulates an IPC call from the renderer)
function invokeHandler(channel: string, ...args: any[]) {
  const handler = registeredHandlers.get(channel);
  if (!handler)
    throw new Error(`No handler registered for channel: ${channel}`);
  // First argument to ipcMain.handle callbacks is the IPC event object
  return handler({}, ...args);
}

describe('IPC Handlers', () => {
  let mockService: ReturnType<typeof createMockWorkspaceService>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
    mockService = createMockWorkspaceService();
    setupIpcHandlers(mockService as any);
  });

  describe('handler registration', () => {
    it('should register all 10 expected channels', () => {
      const expectedChannels = [
        'workspace:loadDirectory',
        'workspace:clearCache',
        'workspace:loadImage',
        'workspace:generateFrame',
        'workspace:updateFrame',
        'workspace:saveFrame',
        'workspace:rotateFrame',
        'workspace:selectDirectory',
        'workspace:checkFilesExist',
        'workspace:saveAllFrames',
      ];

      const registeredChannels = Array.from(registeredHandlers.keys());
      expect(registeredChannels).toHaveLength(10);
      for (const channel of expectedChannels) {
        expect(registeredChannels).toContain(channel);
      }
    });
  });

  describe('workspace:loadDirectory', () => {
    it('should return success with directory data', async () => {
      const mockTree: DirectoryNode = {
        name: 'dir',
        path: '/test/dir',
        isDirectory: true,
        hasChildren: true,
        childrenLoaded: true,
        children: [],
      };
      mockService.loadDirectory.mockResolvedValue(mockTree);

      const result = await invokeHandler(
        'workspace:loadDirectory',
        '/test/dir',
        { depth: 1 }
      );

      expect(result).toEqual({ success: true, data: mockTree });
      expect(mockService.loadDirectory).toHaveBeenCalledWith('/test/dir', {
        depth: 1,
      });
    });

    it('should return failure when service throws', async () => {
      mockService.loadDirectory.mockRejectedValue(new Error('scan failed'));

      const result = await invokeHandler(
        'workspace:loadDirectory',
        '/bad/path'
      );

      expect(result).toEqual({ success: false, error: 'scan failed' });
    });
  });

  describe('workspace:generateFrame', () => {
    it('should return success with frame data', async () => {
      const frame = createMockFrameData();
      mockService.generateFrame.mockResolvedValue(frame);

      const result = await invokeHandler(
        'workspace:generateFrame',
        '/test/img.jpg',
        { x: 100, y: 200 }
      );

      expect(result).toEqual({ success: true, data: frame });
    });

    it('should return failure when generation throws', async () => {
      mockService.generateFrame.mockRejectedValue(new Error('No region found'));

      const result = await invokeHandler(
        'workspace:generateFrame',
        '/test/img.jpg',
        { x: 0, y: 0 }
      );

      expect(result).toEqual({ success: false, error: 'No region found' });
    });
  });

  describe('workspace:updateFrame', () => {
    it('should return success with updated frame', async () => {
      const updated = createMockFrameData({ label: 'Renamed' });
      mockService.updateFrame.mockResolvedValue(updated);

      const result = await invokeHandler(
        'workspace:updateFrame',
        'page-abc-frame-1',
        { label: 'Renamed' }
      );

      expect(result).toEqual({ success: true, data: updated });
    });

    it('should return failure when frame not found', async () => {
      mockService.updateFrame.mockResolvedValue(undefined);

      const result = await invokeHandler(
        'workspace:updateFrame',
        'nonexistent-frame',
        { label: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('nonexistent-frame');
    });
  });

  describe('workspace:saveFrame', () => {
    it('should save file when user completes dialog', async () => {
      const frame = createMockFrameData();
      (dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/out/photo.png',
      });
      mockService.saveFrameToPath.mockResolvedValue('/out/photo.png');

      const result = await invokeHandler('workspace:saveFrame', frame);

      expect(result).toEqual({
        success: true,
        data: { filePath: '/out/photo.png' },
      });
      expect(mockService.saveFrameToPath).toHaveBeenCalledWith(
        frame,
        '/out/photo.png'
      );
    });

    it('should return cancelled when user dismisses dialog', async () => {
      const frame = createMockFrameData();
      (dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true,
      });

      const result = await invokeHandler('workspace:saveFrame', frame);

      expect(result).toEqual({ success: false, error: 'cancelled' });
      expect(mockService.saveFrameToPath).not.toHaveBeenCalled();
    });

    it('should return failure when save throws', async () => {
      const frame = createMockFrameData();
      (dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/out/photo.png',
      });
      mockService.saveFrameToPath.mockRejectedValue(new Error('Disk full'));

      const result = await invokeHandler('workspace:saveFrame', frame);

      expect(result).toEqual({ success: false, error: 'Disk full' });
    });
  });

  describe('workspace:saveAllFrames', () => {
    it('should save all frames successfully', async () => {
      const frames = [
        createMockFrameData({ id: 'f1' }),
        createMockFrameData({ id: 'f2' }),
        createMockFrameData({ id: 'f3' }),
      ];
      const filenames = ['photo1.png', 'photo2.png', 'photo3.png'];
      mockService.saveFrameToPath.mockImplementation(
        (_frame: any, outputPath: string) => Promise.resolve(outputPath)
      );

      const result = await invokeHandler(
        'workspace:saveAllFrames',
        '/out',
        frames,
        filenames
      );

      expect(result.success).toBe(true);
      expect(result.data.savedPaths).toHaveLength(3);
      expect(result.data.errors).toHaveLength(0);
    });

    it('should return immediate error on mismatched array lengths', async () => {
      const frames = [createMockFrameData(), createMockFrameData()];
      const filenames = ['a.png', 'b.png', 'c.png'];

      const result = await invokeHandler(
        'workspace:saveAllFrames',
        '/out',
        frames,
        filenames
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('same length');
      expect(mockService.saveFrameToPath).not.toHaveBeenCalled();
    });

    it('should report partial failures in errors array', async () => {
      const frames = [
        createMockFrameData({ id: 'f1' }),
        createMockFrameData({ id: 'f2' }),
        createMockFrameData({ id: 'f3' }),
      ];
      const filenames = ['ok1.png', 'fail.png', 'ok2.png'];

      mockService.saveFrameToPath
        .mockResolvedValueOnce('/out/ok1.png')
        .mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValueOnce('/out/ok2.png');

      const result = await invokeHandler(
        'workspace:saveAllFrames',
        '/out',
        frames,
        filenames
      );

      // success is true even when individual saves fail
      expect(result.success).toBe(true);
      expect(result.data.savedPaths).toHaveLength(2);
      expect(result.data.errors).toHaveLength(1);
      expect(result.data.errors[0].filename).toBe('fail.png');
      expect(result.data.errors[0].error).toBe('Write failed');
    });
  });

  describe('workspace:checkFilesExist', () => {
    it('should return filenames that exist on disk', async () => {
      const mockAccess = fs.access as ReturnType<typeof vi.fn>;
      mockAccess
        .mockResolvedValueOnce(undefined) // file1.png exists
        .mockRejectedValueOnce(new Error('ENOENT')) // file2.png missing
        .mockResolvedValueOnce(undefined); // file3.png exists

      const result = await invokeHandler('workspace:checkFilesExist', '/dir', [
        'file1.png',
        'file2.png',
        'file3.png',
      ]);

      expect(result.success).toBe(true);
      expect(result.data.existingFiles).toEqual(['file1.png', 'file3.png']);
    });

    it('should return empty array when no files exist', async () => {
      const mockAccess = fs.access as ReturnType<typeof vi.fn>;
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await invokeHandler('workspace:checkFilesExist', '/dir', [
        'a.png',
        'b.png',
      ]);

      expect(result.success).toBe(true);
      expect(result.data.existingFiles).toEqual([]);
    });
  });

  describe('workspace:rotateFrame', () => {
    it('should return rotated orientation', async () => {
      const frame = createMockFrameData({ orientation: 0 });
      mockService.rotateFrame.mockReturnValue({ orientation: 90 });

      const result = await invokeHandler('workspace:rotateFrame', frame);

      expect(result).toEqual({ success: true, data: { orientation: 90 } });
      expect(mockService.rotateFrame).toHaveBeenCalledWith(frame);
    });
  });
});
