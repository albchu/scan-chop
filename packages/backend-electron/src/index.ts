export { ElectronBackend } from './ElectronBackend';

// Export models
export { BaseModel } from './models/BaseModel';
export { ImageFileModel } from './models/ImageFileModel';
export { DirectoryModel } from './models/DirectoryModel';
export { WorkspaceModel } from './models/WorkspaceModel';

// Export utilities
export { isImageFile } from './utils/isImageFile';
export { sendToRenderer } from './utils/sendToRenderer';

// Note: preload script should be imported separately, not from the main index 