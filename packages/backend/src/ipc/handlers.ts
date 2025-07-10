import { ipcMain } from 'electron';
import { WorkspaceService } from '../services/WorkspaceService';

export function setupIpcHandlers(workspaceService: WorkspaceService) {
  // Load directory tree
  ipcMain.handle('workspace:loadDirectory', async (event, path: string) => {
    console.log('[IPC] workspace:loadDirectory called with path:', path);
    try {
      const tree = await workspaceService.loadDirectory(path);
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
  
  // Add more handlers as needed in the future
} 