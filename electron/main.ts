import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { closeDb, getDb } from './db';
import { registerIpcHandlers } from './ipcHandlers';

const isDev = !app.isPackaged;

// Disable GPU hardware acceleration to avoid unresponsiveness on some systems
app.disableHardwareAcceleration();

function createWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(820, height),
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f0f13',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
  });

  win.once('ready-to-show', () => {
    win.show();
    // Open DevTools automatically for debugging
    if (isDev) {
      win.webContents.openDevTools();
    }
  });

  if (isDev) {
    void win.loadURL('http://localhost:5173');
  } else {
    // __dirname is inside 'dist-electron'. Go up one directory to access 'dist/index.html'.
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  // Explicitly initialize database connection and tables before handlers/window
  try {
    getDb();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDb();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
