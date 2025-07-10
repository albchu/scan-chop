import type { DirectoryNode, LoadDirectoryOptions } from '@workspace/shared';

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
  }): Promise<string> {
    console.log('[WorkspaceAPI] Loading image:', imagePath, 'with options:', options);
    
    const response = await window.backend.invoke('workspace:loadImage', imagePath, options) as ApiResponse<string>;
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to load image');
  }
}; 