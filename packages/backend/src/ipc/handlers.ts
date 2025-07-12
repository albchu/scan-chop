import { ipcMain } from 'electron';
import { WorkspaceService } from '../services/WorkspaceService';
import type { LoadDirectoryOptions, Vector2, FrameData, ProcessingConfig } from '@workspace/shared';

export function setupIpcHandlers(workspaceService: WorkspaceService) {
  // Load directory tree with depth options
  ipcMain.handle('workspace:loadDirectory', async (event, path: string, options?: LoadDirectoryOptions) => {
    console.log('[IPC] workspace:loadDirectory called with path:', path, 'options:', options);
    try {
      const tree = await workspaceService.loadDirectory(path, options);
      return { success: true, data: tree };
    } catch (error) {
      console.error('[IPC] Error loading directory:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
  
  // Clear cache (useful for refresh functionality)
  ipcMain.handle('workspace:clearCache', async (event, path?: string) => {
    console.log('[IPC] workspace:clearCache called');
    workspaceService.clearCache(path);
    return { success: true };
  });
  
  // Clear only image cache
  ipcMain.handle('workspace:clearImageCache', async (event, path?: string) => {
    console.log('[IPC] workspace:clearImageCache called');
    workspaceService.clearImageCache(path);
    return { success: true };
  });
  
  // Get image cache statistics
  ipcMain.handle('workspace:getImageCacheStats', async () => {
    console.log('[IPC] workspace:getImageCacheStats called');
    const stats = workspaceService.getImageCacheStats();
    return { success: true, data: stats };
  });
  
  // Load image file as base64
  ipcMain.handle('workspace:loadImage', async (event, imagePath: string, options?: {
    downsampleFactor?: number;
    maxWidth?: number;
    maxHeight?: number;
  }) => {
    console.log('[IPC] workspace:loadImage called with path:', imagePath, 'options:', options);
    try {
      const imageData = await workspaceService.loadImageAsBase64(imagePath, options);
      return { success: true, data: imageData };
    } catch (error) {
      console.error('[IPC] Error loading image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
  
  // Generate frame from seed point
  ipcMain.handle('workspace:generateFrame', async (
    event, 
    imagePath: string, 
    seed: Vector2,
    config?: ProcessingConfig
  ) => {
    console.log('[IPC] workspace:generateFrame called with seed:', seed);
    
    try {
      const frameData = await workspaceService.generateFrame(
        imagePath, 
        seed, 
        config
      );
      
      return { success: true, data: frameData };
    } catch (error) {
      console.error('[IPC] Error generating frame:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate frame' 
      };
    }
  });
  
  // Update existing frame
  ipcMain.handle('workspace:updateFrame', async (
    event,
    frameId: string,
    updates: Partial<FrameData>
  ) => {
    console.log('[IPC] workspace:updateFrame called for frame:', frameId);
    
    try {
      const updatedFrame = workspaceService.updateFrame(frameId, updates);
      
      if (!updatedFrame) {
        return { 
          success: false, 
          error: `Frame ${frameId} not found` 
        };
      }
      
      return { success: true, data: updatedFrame };
    } catch (error) {
      console.error('[IPC] Error updating frame:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update frame' 
      };
    }
  });
  
  // Add more handlers as needed in the future
} 