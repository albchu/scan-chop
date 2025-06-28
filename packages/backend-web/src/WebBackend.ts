import { useCallback, useRef, useState, useEffect } from 'react';
import type { AppState, Action, BackendAPI, StateSubscription } from '@workspace/shared';
import { INITIAL_STATE } from '@workspace/shared';

type StateListener<T> = (value: T) => void;

class WebStateSubscription<T> implements StateSubscription<T> {
  constructor(
    private getValue_: () => T,
    private subscribe_: (callback: StateListener<T>) => () => void
  ) {}

  async getValue(): Promise<T> {
    return this.getValue_();
  }

  subscribe(callback: StateListener<T>): () => void {
    return this.subscribe_(callback);
  }
}

// React hook-based web backend implementation
export function useWebBackend(): BackendAPI {
  const [state, setState] = useState<AppState>({
    ...INITIAL_STATE
  });

  const listenersRef = useRef(new Map<keyof AppState, Set<StateListener<AppState[keyof AppState]>>>());

  // Initialize listeners on first render
  useEffect(() => {
    Object.keys(state).forEach(key => {
      if (!listenersRef.current.has(key)) {
        listenersRef.current.set(key, new Set());
      }
    });
  }, [state]);

  const notifyListeners = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]): void => {
    const listeners = listenersRef.current.get(key);
    if (listeners) {
      listeners.forEach((listener: StateListener<AppState[K]>) => listener(value));
    }
  }, []);

  const dispatch = useCallback(async (action: Action): Promise<void> => {
    switch (action.type) {
      case 'incrementCounter':
        setState((prevState: AppState) => {
          const newState = {
            ...prevState,
            counter: prevState.counter + 1
          };
          // Notify listeners after state update
          setTimeout(() => notifyListeners('counter', newState.counter), 0);
          return newState;
        });
        break;

      case 'resetApp':
        setState(() => {
          const newState = { ...INITIAL_STATE };
          // Notify listeners after state update
          setTimeout(() => notifyListeners('counter', newState.counter), 0);
          return newState;
        });
        break;

      default:
        console.warn('Unknown action type:', (action as { type: string }).type);
    }
  }, [notifyListeners]);

  const select = useCallback(<K extends keyof AppState>(key: K): StateSubscription<AppState[K]> => {
    return new WebStateSubscription(
      () => state[key],
      (callback: StateListener<AppState[K]>) => {
        const listeners = listenersRef.current.get(key);
        if (listeners) {
          listeners.add(callback);
          return () => listeners.delete(callback);
        }
        return () => {}; // No-op unsubscribe
      }
    );
  }, [state]);

  const getState = useCallback(async (): Promise<AppState> => {
    return { ...state };
  }, [state]);

  return {
    dispatch,
    select,
    getState
  };
} 