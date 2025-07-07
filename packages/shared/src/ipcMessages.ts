export const IPC_CHANNELS = {
  LOAD_DIRECTORY: 'directory:load',
  DIRECTORY_READY: 'directory:ready',
  IMAGE_READY: 'image:ready',
} as const;

export type IpcChannels = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// Type definitions for IPC payloads
export interface LoadDirectoryPayload {
  path: string;
}

export interface DirectoryReadyPayload {
  path: string;
  imagePaths: string[];
  subdirectories: string[];
}

export interface ImageReadyPayload {
  path: string;
  width: number;
  height: number;
  dataUrl: string;
} 