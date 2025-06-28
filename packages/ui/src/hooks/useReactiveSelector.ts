import { useEffect, useState } from 'react';
import type { AppState } from '@workspace/shared';
import { INITIAL_STATE } from '@workspace/shared';
import { useBackend } from './useBackend';

export function useReactiveSelector<K extends keyof AppState>(
  key: K
): AppState[K] {
  const backend = useBackend();
  const [value, setValue] = useState<AppState[K] | undefined>(undefined);

  useEffect(() => {
    const subscription = backend.select(key);
    
    // Get initial value
    subscription.getValue().then(setValue);
    
    // Subscribe to changes
    const unsubscribe = subscription.subscribe(setValue);
    
    return unsubscribe;
  }, [backend, key]);

  // Return a default value while loading
  if (value === undefined) {
    // Return the initial state value for this key
    return INITIAL_STATE[key];
  }

  return value;
} 