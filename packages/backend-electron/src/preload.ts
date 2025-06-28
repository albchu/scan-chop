import { contextBridge, ipcRenderer } from 'electron';
import type { AppState, Action, BackendAPI, StateSubscription } from '@workspace/shared';

class ElectronStateSubscription<T> implements StateSubscription<T> {
  private unsubscribeId: string | null = null;

  constructor(
    private key: keyof AppState,
    private getValue_: () => Promise<T>
  ) {}

  async getValue(): Promise<T> {
    return this.getValue_();
  }

  subscribe(callback: (value: T) => void): () => void {
    // Set up IPC subscription
    ipcRenderer.invoke('backend:subscribe', this.key).then((unsubscribeId: string) => {
      this.unsubscribeId = unsubscribeId;
      
      // Listen for state updates
      const listener = (_: any, value: T) => callback(value);
      ipcRenderer.on(`backend:state-update:${this.key}`, listener);
      
      // Store cleanup function
      this.cleanup = () => {
        ipcRenderer.off(`backend:state-update:${this.key}`, listener);
        if (this.unsubscribeId) {
          ipcRenderer.invoke(`backend:unsubscribe:${this.unsubscribeId}`);
        }
      };
    });

    return () => this.cleanup();
  }

  private cleanup = () => {};
}

const electronBackend: BackendAPI = {
  async dispatch(action: Action): Promise<void> {
    return ipcRenderer.invoke('backend:dispatch', action);
  },

  select<K extends keyof AppState>(key: K): StateSubscription<AppState[K]> {
    return new ElectronStateSubscription(
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