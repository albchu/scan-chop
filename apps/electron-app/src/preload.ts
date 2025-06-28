import { contextBridge, ipcRenderer } from 'electron';
import type { AppState, Action, BackendAPI, StateSubscription } from '@workspace/shared';

// Create subscription objects that work with contextBridge
function createElectronStateSubscription<T>(
  key: keyof AppState,
  getValueFn: () => Promise<T>
): StateSubscription<T> {
  let unsubscribeId: string | null = null;
  let cleanup = () => {};

  return {
    async getValue(): Promise<T> {
      return getValueFn();
    },

    subscribe(callback: (value: T) => void): () => void {
      // Set up IPC subscription
      ipcRenderer.invoke('backend:subscribe', key).then((id: string) => {
        unsubscribeId = id;
        
        // Listen for state updates
        const listener = (_: any, value: T) => callback(value);
        ipcRenderer.on(`backend:state-update:${key}`, listener);
        
        // Store cleanup function
        cleanup = () => {
          ipcRenderer.off(`backend:state-update:${key}`, listener);
          if (unsubscribeId) {
            ipcRenderer.invoke(`backend:unsubscribe:${unsubscribeId}`);
          }
        };
      });

      return () => cleanup();
    }
  };
}

const electronBackend: BackendAPI = {
  async dispatch(action: Action): Promise<void> {
    return ipcRenderer.invoke('backend:dispatch', action);
  },

  select<K extends keyof AppState>(key: K): StateSubscription<AppState[K]> {
    return createElectronStateSubscription(
      key,
      () => ipcRenderer.invoke('backend:select', key)
    );
  },

  async getState(): Promise<AppState> {
    return ipcRenderer.invoke('backend:getState');
  }
};

// Expose the backend API to the renderer process
contextBridge.exposeInMainWorld('api', electronBackend); 