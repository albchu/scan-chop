import type { DirectoryNode, LoadDirectoryOptions, Vector2, FrameData, ProcessingConfig } from '@workspace/shared';

// Define ImageData type to match backend
interface ImageData {
  imageData: string;  // base64 data URL
  width: number;      // actual width of the returned image
  height: number;     // actual height of the returned image
  originalWidth: number;  // original image width before scaling
  originalHeight: number; // original image height before scaling
}

// Type-safe API response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Workspace API methods
export const workspaceApi = {
  async loadDirectory(path: string, options?: LoadDirectoryOptions): Promise<DirectoryNode> {
    console.log('[WorkspaceAPI] Loading directory:', path, 'with options:', options);
    
    const response = await window.backend.invoke('workspace:loadDirectory', path, options) as ApiResponse<DirectoryNode>;
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to load directory');
  },
  
  async clearCache(path?: string): Promise<void> {
    console.log('[WorkspaceAPI] Clearing cache for:', path || 'all');
    
    await window.backend.invoke('workspace:clearCache', path);
  },
  
  async loadImage(imagePath: string): Promise<ImageData> {
    console.log('[WorkspaceAPI] Loading image:', imagePath);
    
    const response = await window.backend.invoke('workspace:loadImage', imagePath) as ApiResponse<ImageData>;
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to load image');
  },

  async generateFrame(
    imagePath: string, 
    seed: Vector2,
    config?: ProcessingConfig
  ): Promise<FrameData> {
    console.log('[WorkspaceAPI] Generating frame at seed:', seed);
    
    const response = await window.backend.invoke(
      'workspace:generateFrame', 
      imagePath, 
      seed,
      config
    ) as ApiResponse<FrameData>;
    
    console.log('[WorkspaceAPI] generateFrame response:', response);
    
    if (response.success && response.data) {
      console.log('[WorkspaceAPI] Frame data from backend:', response.data);
      console.log('[WorkspaceAPI] Has imageData:', !!response.data.imageData);
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to generate frame');
  },

  async updateFrame(
    frameId: string,
    updates: Partial<FrameData>
  ): Promise<FrameData> {
    console.log('[WorkspaceAPI] Updating frame:', frameId, updates);
    
    const response = await window.backend.invoke(
      'workspace:updateFrame',
      frameId,
      updates
    ) as ApiResponse<FrameData>;
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update frame');
  },

  async selectDirectory(): Promise<string | null> {
    console.log('[WorkspaceAPI] Selecting directory');
    
    const response = await window.backend.invoke(
      'workspace:selectDirectory'
    ) as ApiResponse<{ directory: string }>;
    
    if (response.success && response.data) {
      return response.data.directory;
    }
    
    if (response.error === 'cancelled') {
      return null;
    }
    
    throw new Error(response.error || 'Failed to select directory');
  },

  async checkFilesExist(
    directory: string,
    filenames: string[]
  ): Promise<string[]> {
    console.log('[WorkspaceAPI] Checking files exist in:', directory);
    
    const response = await window.backend.invoke(
      'workspace:checkFilesExist',
      directory,
      filenames
    ) as ApiResponse<{ existingFiles: string[] }>;
    
    if (response.success && response.data) {
      return response.data.existingFiles;
    }
    
    throw new Error(response.error || 'Failed to check files');
  },

  async saveAllFrames(
    directory: string,
    frames: FrameData[],
    filenames: string[]
  ): Promise<{ savedPaths: string[]; errors: { filename: string; error: string }[] }> {
    console.log('[WorkspaceAPI] Saving', frames.length, 'frames to:', directory);
    
    const response = await window.backend.invoke(
      'workspace:saveAllFrames',
      directory,
      frames,
      filenames
    ) as ApiResponse<{ savedPaths: string[]; errors: { filename: string; error: string }[] }>;
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to save frames');
  }
}; 