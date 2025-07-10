import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';
import { WorkspaceProvider } from '../context/WorkspaceContext';

// Mock the workspace API
vi.mock('../api/workspace', () => ({
  workspaceApi: {
    loadDirectory: vi.fn().mockResolvedValue({
      path: '/test',
      name: 'test',
      type: 'directory',
      children: [],
    }),
    loadImage: vi.fn().mockResolvedValue({
      imageData: 'data:image/png;base64,test',
      width: 800,
      height: 600,
      originalWidth: 1600,
      originalHeight: 1200
    }),
    clearCache: vi.fn().mockResolvedValue(undefined),
  },
}));

interface AllProvidersProps {
  children: React.ReactNode;
}

// Wrapper component that includes all providers
const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return (
    <WorkspaceProvider>
      {children}
    </WorkspaceProvider>
  );
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the render method
export { customRender as render }; 