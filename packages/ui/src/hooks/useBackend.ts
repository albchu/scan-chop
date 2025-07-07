import { useContext } from 'react';
import { BackendContext } from '../AppProvider';
import type { BackendAPI } from '@workspace/shared';

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