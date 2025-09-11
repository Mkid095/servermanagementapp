const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

class ServerManagerApp {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.isQuitting = false;
    this.serverCheckInterval = null;
    
    log.initialize({ preload: true });
    log.info('Server Manager starting...');
  }

  init() {
    // Handle single instance
    const gotTheLock = app.requestSingleInstanceLock();
    
    if (!gotTheLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      // Someone tried to run a second instance, focus our window
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    app.whenReady().then(() => {
      this.createWindow();
      this.createTray();
      this.setupEventHandlers();
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });

    // Load the renderer
    this.mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

    // Hide window when minimized
    this.mainWindow.on('minimize', (event) => {
      event.preventDefault();
      this.mainWindow.hide();
    });

    // Quit when window is closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  createTray() {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    
    this.tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Server Manager',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      },
      {
        label: 'Hide Server Manager',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setToolTip('Server Manager');
    this.tray.setContextMenu(contextMenu);

    // Double-click to show/hide
    this.tray.on('double-click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.hide();
        } else {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    });
  }

  setupEventHandlers() {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // IPC handlers for server management
    ipcMain.handle('get-servers', async () => {
      // This will be implemented in the server detection service
      return [];
    });

    ipcMain.handle('stop-server', async (event, serverId) => {
      // This will be implemented in the process manager service
      return { success: true };
    });
  }
}

// Initialize the application
const serverManager = new ServerManagerApp();
serverManager.init();