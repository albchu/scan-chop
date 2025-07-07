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
    // Handle action dispatch
    ipcMain.handle('backend:dispatch', async (_, action: Action) => {
      await this.dispatch(action);
    });

    // Handle state selection
    ipcMain.handle('backend:select', async (_, key: keyof AppState) => {
      return this.state[key];
    });

    // Handle full state retrieval
    ipcMain.handle('backend:getState', async () => {
      return { ...this.state };
    });

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

    // Handle workspace directory loading
    ipcMain.handle(IPC_CHANNELS.LOAD_DIRECTORY, async (event, payload: LoadDirectoryPayload) => {
      const sender = event.sender;
      await this.loadWorkspace(payload.path, sender);
    });
  }

  private async loadWorkspace(directoryPath: string, sender: WebContents): Promise<void> {
    try {
      // Create a new workspace model
      this.workspaceModel = new WorkspaceModel(directoryPath, sender);
      
      // Load the workspace (this will trigger directory and image loading)
      await this.workspaceModel.load();
    } catch (error) {
      console.error('Error loading workspace:', error);
      sender.send('workspace:error', {
        message: error instanceof Error ? error.message : 'Unknown error loading workspace'
      });
    }
  }

  private async dispatch(action: Action): Promise<void> {
    switch (action.type) {
      case 'incrementCounter':
        this.state = {
          ...this.state,
          counter: this.state.counter + 1
        };
        this.emit('state-change:counter', this.state.counter);
        break;

      case 'resetApp':
        this.state = {
          ...INITIAL_STATE
        };
        this.emit('state-change:counter', this.state.counter);
        break;

      default:
        console.warn('Unknown action type:', (action as { type: string }).type);
    }
  }

  getState(): AppState {
    return { ...this.state };
  }
} 