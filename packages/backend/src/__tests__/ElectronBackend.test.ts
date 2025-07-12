import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElectronBackend } from '../ElectronBackend';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    handleOnce: vi.fn(),
  },
}));

// Mock the setupIpcHandlers function
vi.mock('../ipc/handlers', () => ({
  setupIpcHandlers: vi.fn(),
}));

describe('ElectronBackend', () => {
  let backend: ElectronBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new ElectronBackend();
  });

  it('should be instantiable', () => {
    expect(backend).toBeInstanceOf(ElectronBackend);
  });

  it('should have getWorkspaceService method', () => {
    expect(typeof backend.getWorkspaceService).toBe('function');
  });

  it('should return WorkspaceService instance', () => {
    const workspaceService = backend.getWorkspaceService();
    expect(workspaceService).toBeDefined();
    expect(workspaceService.constructor.name).toBe('WorkspaceService');
  });

  it('should be an EventEmitter', () => {
    expect(typeof backend.on).toBe('function');
    expect(typeof backend.emit).toBe('function');
    expect(typeof backend.off).toBe('function');
  });
}); 