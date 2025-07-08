import { EventEmitter } from 'events';
import { ipcMain, WebContents, BrowserWindow } from 'electron';
import type { AppState, Action } from '@workspace/shared';
import { INITIAL_STATE, IPC_CHANNELS, LoadDirectoryPayload } from '@workspace/shared';
import { WorkspaceModel } from './models/WorkspaceModel';

export class ElectronBackend extends EventEmitter {
  private state: AppState = {
    ...INITIAL_STATE
  };
  private workspaceModel: WorkspaceModel | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    super();
    this.setupIpcHandlers();
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupIpcHandlers(): void {
    // Handle subscription setup
    ipcMain.handle('backend:subscribe', async (event, key: keyof AppState) => {
      const webContents = event.sender;
      
      const listener = (value: any) => {
        webContents.send(`backend:state-update:${key}`, value);
      };

      this.on(`state-change:${key}`, listener);

      // Return unsubscribe function identifier
      const unsubscribeId = `${key}-${Date.now()}-${Math.random()}`;
      
      // Store unsubscribe handler
      ipcMain.handleOnce(`backend:unsubscribe:${unsubscribeId}`, () => {
        this.off(`state-change:${key}`, listener);
      });

      return unsubscribeId;
    });

    // Initial request from the renderer to start loading everything needed to populate the UI
    ipcMain.handle(IPC_CHANNELS.INIT_WORKSPACE, async (event) => {
      const sender = event.sender;
      this.workspaceModel = new WorkspaceModel(sender);
      await this.workspaceModel.load();
    });

    // Handle workspace directory loading
    ipcMain.handle(IPC_CHANNELS.LOAD_DIRECTORY, async (event, payload: LoadDirectoryPayload) => {
      const sender = event.sender;
      await this.loadDirectory(payload.path, sender);
    });
  }

  private async loadDirectory(directoryPath: string, sender: WebContents): Promise<void> {
    try {
      console.log('ALBERT_DEBUG: Loading directory:', directoryPath);
      // Create a new workspace model
      // this.workspaceModel = new WorkspaceModel(directoryPath, sender);
      
      // // Load the workspace (this will trigger directory and image loading)
      // await this.workspaceModel.load();
    } catch (error) {
      console.error('Error loading workspace:', error);
      sender.send('workspace:error', {
        message: error instanceof Error ? error.message : 'Unknown error loading workspace'
      });
    }
  }
} 