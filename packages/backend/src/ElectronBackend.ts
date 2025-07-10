import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { WorkspaceService } from './services/WorkspaceService';
import { setupIpcHandlers } from './ipc/handlers';

export class ElectronBackend extends EventEmitter {
  private workspaceService: WorkspaceService;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    super();
    this.workspaceService = new WorkspaceService();
    this.setupHandlers();
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupHandlers(): void {
    // Set up all IPC handlers
    setupIpcHandlers(this.workspaceService);
  }

  // Expose for testing or direct access if needed
  public getWorkspaceService(): WorkspaceService {
    return this.workspaceService;
  }
} 