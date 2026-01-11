import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Define the API that will be exposed to the renderer
const backendAPI = {
  // Request-Response pattern
  invoke: (channel: string, ...args: any[]) => {
    // Whitelist channels for security
    const allowedChannels = [
      'workspace:loadDirectory',
      'workspace:clearCache',
      'workspace:loadImage',
      'workspace:generateFrame',
      'workspace:updateFrame',
      'workspace:saveFrame',
      'workspace:rotateFrame',
      'workspace:selectDirectory',
      'workspace:checkFilesExist',
      'workspace:saveAllFrames',
    ];
    
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    
    throw new Error(`Channel ${channel} is not allowed`);
  },
  
  // For future event-based patterns
  on: (channel: string, callback: (...args: any[]) => void) => {
    const allowedChannels: string[] = [
      // Add event channels here when needed
    ];
    
    if (allowedChannels.includes(channel)) {
      const subscription = (_: IpcRendererEvent, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return unsubscribe function
      return () => ipcRenderer.off(channel, subscription);
    }
    
    throw new Error(`Channel ${channel} is not allowed`);
  },
  
  // For future one-way communication
  send: (channel: string, ...args: any[]) => {
    const allowedChannels: string[] = [
      // Add send channels here when needed
    ];
    
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Channel ${channel} is not allowed`);
    }
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('backend', backendAPI);

// Type declaration for TypeScript
export type BackendAPI = typeof backendAPI; 