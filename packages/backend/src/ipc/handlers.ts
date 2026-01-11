import { ipcMain, dialog, BrowserWindow } from 'electron';
import { WorkspaceService } from '../services/WorkspaceService';
import type { LoadDirectoryOptions, Vector2, FrameData, ProcessingConfig } from '@workspace/shared';
import fs from 'fs/promises';
import path from 'path';

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
  ipcMain.handle('workspace:loadImage', async (event, imagePath: string) => {
    console.log('[IPC] workspace:loadImage called with path:', imagePath);
    try {
      const imageData = await workspaceService.loadImageAsBase64(imagePath);
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
      const updatedFrame = await workspaceService.updateFrame(frameId, updates);
      
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
  
  // Save frame to disk with user-selected path
  ipcMain.handle('workspace:saveFrame', async (
    event,
    frameData: FrameData
  ) => {
    console.log('[IPC] workspace:saveFrame called for frame:', frameData.id);
    
    try {
      // Get the focused window for the dialog
      const focusedWindow = BrowserWindow.getFocusedWindow();
      
      // Generate default filename from label
      const defaultFilename = workspaceService.getSanitizedFrameFilename(frameData);
      
      // Show save dialog with default filename
      const result = await dialog.showSaveDialog(focusedWindow!, {
        title: 'Save Frame',
        defaultPath: defaultFilename,
        filters: [{ name: 'PNG Image', extensions: ['png'] }]
      });
      
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'cancelled' };
      }
      
      const savedPath = await workspaceService.saveFrameToPath(frameData, result.filePath);
      
      return { success: true, data: { filePath: savedPath } };
    } catch (error) {
      console.error('[IPC] Error saving frame:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save frame' 
      };
    }
  });
  
  // Rotate frame by cycling orientation
  ipcMain.handle('workspace:rotateFrame', (
    event,
    frameData: FrameData
  ) => {
    console.log('[IPC] workspace:rotateFrame called for frame:', frameData.id);
    
    const rotatedFrame = workspaceService.rotateFrame(frameData);
    return { success: true, data: rotatedFrame };
  });
  
  // Select a directory using native dialog
  ipcMain.handle('workspace:selectDirectory', async () => {
    console.log('[IPC] workspace:selectDirectory called');
    
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      
      const result = await dialog.showOpenDialog(focusedWindow!, {
        title: 'Select Output Directory',
        properties: ['openDirectory', 'createDirectory']
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'cancelled' };
      }
      
      return { success: true, data: { directory: result.filePaths[0] } };
    } catch (error) {
      console.error('[IPC] Error selecting directory:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to select directory' 
      };
    }
  });
  
  // Check which files already exist in a directory
  ipcMain.handle('workspace:checkFilesExist', async (
    event,
    directory: string,
    filenames: string[]
  ) => {
    console.log('[IPC] workspace:checkFilesExist called with', filenames.length, 'files');
    
    try {
      const existingFiles: string[] = [];
      
      for (const filename of filenames) {
        const filePath = path.join(directory, filename);
        try {
          await fs.access(filePath);
          existingFiles.push(filename);
        } catch {
          // File doesn't exist, which is fine
        }
      }
      
      return { success: true, data: { existingFiles } };
    } catch (error) {
      console.error('[IPC] Error checking files:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check files' 
      };
    }
  });
  
  // Save multiple frames to a directory
  ipcMain.handle('workspace:saveAllFrames', async (
    event,
    directory: string,
    frames: FrameData[],
    filenames: string[]
  ) => {
    console.log('[IPC] workspace:saveAllFrames called with', frames.length, 'frames');
    
    if (frames.length !== filenames.length) {
      return { 
        success: false, 
        error: 'Frames and filenames arrays must have the same length' 
      };
    }
    
    try {
      const savedPaths: string[] = [];
      const errors: { filename: string; error: string }[] = [];
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const filename = filenames[i];
        const outputPath = path.join(directory, filename);
        
        try {
          await workspaceService.saveFrameToPath(frame, outputPath);
          savedPaths.push(outputPath);
        } catch (err) {
          errors.push({
            filename,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }
      
      return { 
        success: true, 
        data: { savedPaths, errors } 
      };
    } catch (error) {
      console.error('[IPC] Error saving frames:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save frames' 
      };
    }
  });
} 