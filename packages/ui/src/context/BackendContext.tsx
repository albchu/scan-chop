import { createContext, useContext } from 'react';
import type { BackendAPI } from '@workspace/shared';

export const BackendContext = createContext<BackendAPI | null>(null);

export const BackendProvider = BackendContext.Provider;

export function useBackend(): BackendAPI {
    console.log('useBackend called');
    const backend = useContext(BackendContext);
    console.log('Backend from context:', backend);
    console.log('Backend workspace property:', backend?.workspace);
    if (!backend) {
      throw new Error('useBackend must be used within an AppProvider');
    }
    return backend;
  } 