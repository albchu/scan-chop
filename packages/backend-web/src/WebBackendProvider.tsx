import { createContext, useContext, ReactNode } from 'react';
import type { BackendAPI } from '@workspace/shared';
import { useWebBackend } from './WebBackend';

interface WebBackendProviderProps {
  children: ReactNode;
}

const WebBackendContext = createContext<BackendAPI | null>(null);

export function WebBackendProvider({ children }: WebBackendProviderProps) {
  const backend = useWebBackend();

  return (
    <WebBackendContext.Provider value={backend}>
      {children}
    </WebBackendContext.Provider>
  );
}

export function useWebBackendContext(): BackendAPI {
  const backend = useContext(WebBackendContext);
  if (!backend) {
    throw new Error('useWebBackendContext must be used within WebBackendProvider');
  }
  return backend;
} 