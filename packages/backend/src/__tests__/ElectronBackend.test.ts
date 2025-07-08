import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElectronBackend } from '../ElectronBackend';
import { INITIAL_STATE } from '@workspace/shared';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    handleOnce: vi.fn(),
  },
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

  it('should have getState method', () => {
    expect(typeof backend.getState).toBe('function');
  });

  it('should initialize with default state', () => {
    const state = backend.getState();
    expect(state).toEqual(INITIAL_STATE);
  });

  it('should be an EventEmitter', () => {
    expect(typeof backend.on).toBe('function');
    expect(typeof backend.emit).toBe('function');
    expect(typeof backend.off).toBe('function');
  });
}); 