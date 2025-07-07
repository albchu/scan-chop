import { AppState, Action } from './types';
import { DirectoryReadyPayload, ImageReadyPayload } from './ipcMessages';

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
  workspace?: {
    loadDirectory: (path: string) => Promise<void>;
    onDirectoryReady: (callback: (payload: DirectoryReadyPayload) => void) => () => void;
    onImageReady: (callback: (payload: ImageReadyPayload) => void) => () => void;
    onError: (callback: (error: { message: string }) => void) => () => void;
  };
} 