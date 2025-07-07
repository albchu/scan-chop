import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { ElectronBackend } from '@workspace/backend-electron';

// Initialize the backend
const backend = new ElectronBackend();

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  });

  // Set the main window on the backend
  backend.setMainWindow(mainWindow);

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