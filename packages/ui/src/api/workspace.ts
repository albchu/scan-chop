import type { DirectoryNode, LoadDirectoryOptions, Vector2, FrameData, ProcessingConfig } from '@workspace/shared';

// Define ImageData type to match backend
export interface ImageData {
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
  }
}; 