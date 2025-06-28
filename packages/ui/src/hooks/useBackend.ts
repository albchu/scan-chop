import { useContext } from 'react';
import { BackendContext } from '../AppProvider';
import type { BackendAPI } from '@workspace/shared';

export function useBackend(): BackendAPI {
  const backend = useContext(BackendContext);
  if (!backend) {
    throw new Error('useBackend must be used within an AppProvider');
  }
  return backend;
} 