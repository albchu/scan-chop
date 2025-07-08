import { DirectoryReadyPayload, ImageReadyPayload } from './ipcMessages';

export interface BackendAPI {
  workspace: {
    initWorkspace: () => Promise<void>;
    loadDirectory: (path: string) => Promise<void>;
    onDirectoryReady: (callback: (payload: DirectoryReadyPayload) => void) => () => void;
    onImageReady: (callback: (payload: ImageReadyPayload) => void) => () => void;
    onError: (callback: (error: { message: string }) => void) => () => void;
  };
} 