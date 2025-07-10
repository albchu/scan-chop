import type { DirectoryNode } from '@workspace/shared';

// Type-safe API response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Workspace API methods
export const workspaceApi = {
  async loadDirectory(path: string): Promise<DirectoryNode> {
    console.log('[WorkspaceAPI] Loading directory:', path);
    
    const response = await window.backend.invoke('workspace:loadDirectory', path) as ApiResponse<DirectoryNode>;
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to load directory');
  },
  
  async clearCache(path?: string): Promise<void> {
    console.log('[WorkspaceAPI] Clearing cache for:', path || 'all');
    
    await window.backend.invoke('workspace:clearCache', path);
  }
}; 