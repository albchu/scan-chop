import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { ElectronBackend } from '@workspace/backend';

// Initialize the backend
const backend = new ElectronBackend();

const createWindow = (): void => {
  console.log('[Main] Creating window...');
  console.log('[Main] __dirname:', __dirname);
  console.log('[Main] Preload path:', join(__dirname, 'preload.js'));
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  });

  // Set the main window on the backend
  backend.setMainWindow(mainWindow);

  // Add console logging for debugging
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

  // Add preload error handling
  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[Main] Preload error:', error);
    console.error('[Main] Preload path:', preloadPath);
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadFile(join(__dirname, 'renderer', 'renderer.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, 'renderer', 'renderer.html'));
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
}); 