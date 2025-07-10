export { ElectronBackend } from './ElectronBackend';

// Export services
export { WorkspaceService } from './services/WorkspaceService';
export type { LoadDirectoryOptions } from './services/WorkspaceService';

// Export utilities
export { isImageFile } from './utils/isImageFile';

// Export IPC setup
export { setupIpcHandlers } from './ipc/handlers'; 