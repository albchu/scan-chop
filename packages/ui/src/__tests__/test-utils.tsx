import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import { useUIStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useCanvasStore } from '../stores/canvasStore';

// Mock the workspace API with all methods
vi.mock('../api/workspace', () => ({
  workspaceApi: {
    loadDirectory: vi.fn().mockResolvedValue({
      path: '/test',
      name: 'test',
      isDirectory: true,
      children: [],
    }),
    loadImage: vi.fn().mockResolvedValue({
      imageData: 'data:image/png;base64,test',
      width: 800,
      height: 600,
      originalWidth: 1600,
      originalHeight: 1200,
    }),
    clearCache: vi.fn().mockResolvedValue(undefined),
    generateFrame: vi.fn().mockResolvedValue({
      id: 'page-1-frame-1',
      label: 'Frame 1',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      orientation: 0,
      imageData: 'data:image/png;base64,frame',
      pageId: 'page-1',
    }),
    updateFrame: vi.fn().mockResolvedValue({
      id: 'page-1-frame-1',
      label: 'Frame 1',
      x: 150,
      y: 150,
      width: 200,
      height: 150,
      rotation: 0,
      orientation: 0,
      imageData: 'data:image/png;base64,frame',
      pageId: 'page-1',
    }),
    selectDirectory: vi.fn().mockResolvedValue('/selected/directory'),
    checkFilesExist: vi.fn().mockResolvedValue([]),
    saveAllFrames: vi.fn().mockResolvedValue({ savedPaths: [], errors: [] }),
    saveFrame: vi.fn().mockResolvedValue({ filePath: '/test/frame.png' }),
    rotateFrame: vi.fn().mockResolvedValue({ orientation: 90 }),
  },
}));

// Store initial states for resetting between tests
const uiStoreInitialState = useUIStore.getState();
const workspaceStoreInitialState = useWorkspaceStore.getState();
const canvasStoreInitialState = useCanvasStore.getState();

/**
 * Reset all Zustand stores to their initial state.
 * Call in afterEach() to prevent cross-test contamination.
 */
export const resetAllStores = () => {
  useUIStore.setState(uiStoreInitialState, true);
  useWorkspaceStore.setState(workspaceStoreInitialState, true);
  useCanvasStore.setState(canvasStoreInitialState, true);
};

interface AllProvidersProps {
  children: React.ReactNode;
}

// Wrapper component - no providers needed for Zustand
const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return <>{children}</>;
};

// Custom render function
const customRender = (
  ui: ReactElement<any>,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the render method
export { customRender as render };
