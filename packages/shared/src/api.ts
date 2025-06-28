import { AppState, Action } from './types';

export interface StateSubscription<T> {
  getValue(): Promise<T>;
  subscribe(callback: (value: T) => void): () => void;
}

export interface BackendAPI {
  dispatch(action: Action): Promise<void>;
  select<K extends keyof AppState>(
    key: K
  ): StateSubscription<AppState[K]>;
  getState(): Promise<AppState>;
} 