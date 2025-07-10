import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';

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
  
  async loadImage(imagePath: string, options?: {
    downsampleFactor?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<ImageData> {
    console.log('[WorkspaceAPI] Loading image:', imagePath, 'with options:', options);
    
    const response = await window.backend.invoke('workspace:loadImage', imagePath, options) as ApiResponse<ImageData>;
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to load image');
  }
}; 