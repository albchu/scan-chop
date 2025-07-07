import { contextBridge, ipcRenderer } from 'electron';
import type { AppState, Action, BackendAPI, StateSubscription } from '@workspace/shared';
import { IPC_CHANNELS, LoadDirectoryPayload, DirectoryReadyPayload, ImageReadyPayload } from '@workspace/shared';

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

// Extend the backend API with workspace functionality
interface ExtendedBackendAPI extends BackendAPI {
  workspace: {
    loadDirectory: (path: string) => Promise<void>;
    onDirectoryReady: (callback: (payload: DirectoryReadyPayload) => void) => () => void;
    onImageReady: (callback: (payload: ImageReadyPayload) => void) => () => void;
    onError: (callback: (error: { message: string }) => void) => () => void;
  };
}

const electronBackend: ExtendedBackendAPI = {
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
  },

  workspace: {
    async loadDirectory(path: string): Promise<void> {
      const payload: LoadDirectoryPayload = { path };
      return ipcRenderer.invoke(IPC_CHANNELS.LOAD_DIRECTORY, payload);
    },

    onDirectoryReady(callback: (payload: DirectoryReadyPayload) => void): () => void {
      const listener = (_: any, payload: DirectoryReadyPayload) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.DIRECTORY_READY, listener);
      return () => ipcRenderer.off(IPC_CHANNELS.DIRECTORY_READY, listener);
    },

    onImageReady(callback: (payload: ImageReadyPayload) => void): () => void {
      const listener = (_: any, payload: ImageReadyPayload) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.IMAGE_READY, listener);
      return () => ipcRenderer.off(IPC_CHANNELS.IMAGE_READY, listener);
    },

    onError(callback: (error: { message: string }) => void): () => void {
      const listener = (_: any, error: { message: string }) => callback(error);
      ipcRenderer.on('workspace:error', listener);
      return () => ipcRenderer.off('workspace:error', listener);
    }
  }
};

// Expose the backend API to the renderer process
contextBridge.exposeInMainWorld('api', electronBackend); 