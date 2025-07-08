import { contextBridge, ipcRenderer } from 'electron';
import type { BackendAPI } from '@workspace/shared';
import { IPC_CHANNELS, LoadDirectoryPayload, DirectoryReadyPayload, ImageReadyPayload } from '@workspace/shared';

// Immediate log to verify preload is executing
console.log('[Preload] Script starting...');

try {
  // Implement the renderer-side client for the ipc interactions
  const electronBackend: BackendAPI = {
    workspace: {
      async initWorkspace() {
        return ipcRenderer.invoke(IPC_CHANNELS.INIT_WORKSPACE);
      },

      async loadDirectory(path: string) {
        const payload: LoadDirectoryPayload = { path };
        return ipcRenderer.invoke(IPC_CHANNELS.LOAD_DIRECTORY, payload);
      },

      onDirectoryReady(callback: (payload: DirectoryReadyPayload) => void) {
        const listener = (_: any, payload: DirectoryReadyPayload) => callback(payload);
        ipcRenderer.on(IPC_CHANNELS.DIRECTORY_READY, listener);
        return () => ipcRenderer.off(IPC_CHANNELS.DIRECTORY_READY, listener);
      },

      onImageReady(callback: (payload: ImageReadyPayload) => void) {
        const listener = (_: any, payload: ImageReadyPayload) => callback(payload);
        ipcRenderer.on(IPC_CHANNELS.IMAGE_READY, listener);
        return () => ipcRenderer.off(IPC_CHANNELS.IMAGE_READY, listener);
      },

      onError(callback: (error: { message: string }) => void) {
        const listener = (_: any, error: { message: string }) => callback(error);
        ipcRenderer.on('workspace:error', listener);
        return () => ipcRenderer.off('workspace:error', listener);
      }
    }
  };

  // Debug logging
  console.log('[Preload] Exposing electronBackend to window.api');
  console.log('[Preload] electronBackend.workspace:', electronBackend.workspace);

  // Expose the backend API to the renderer process
  contextBridge.exposeInMainWorld('api', electronBackend);
  
  console.log('[Preload] API exposed successfully');
} catch (error) {
  console.error('[Preload] Error in preload script:', error);
  if (error instanceof Error) {
    console.error('[Preload] Error stack:', error.stack);
  }
} 