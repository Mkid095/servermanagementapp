const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const TrayMenu = require('./components/TrayMenu');
const appConfig = require('./config/appConfig');

class ServerManagerApp {
  constructor() {
    this.mainWindow = null;
    this.trayMenu = null;
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
      width: appConfig.windowWidth,
      height: appConfig.windowHeight,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      autoHideMenuBar: appConfig.autoHideMenuBar,
      icon: path.join(__dirname, '..', 'assets', 'icon.png')
    });

    // Load the renderer
    this.mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

    // Hide window when minimized
    this.mainWindow.on('minimize', (event) => {
      event.preventDefault();
      this.mainWindow.hide();
    });

    // Handle window close (don't quit, just hide)
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // Quit when window is actually closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Show window when ready (for development)
    if (process.argv.includes('--dev')) {
      this.mainWindow.show();
      this.mainWindow.webContents.openDevTools();
    }
  }

  createTray() {
    this.trayMenu = new TrayMenu(this.mainWindow);
    this.trayMenu.init();
  }

  setupEventHandlers() {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
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

    // Handle server updates from renderer
    ipcMain.on('servers-updated', (event, servers) => {
      if (this.trayMenu) {
        this.trayMenu.updateMenu();
      }
    });
  }

  quit() {
    this.isQuitting = true;
    
    // Clean up resources
    if (this.serverCheckInterval) {
      clearInterval(this.serverCheckInterval);
    }
    
    if (this.trayMenu) {
      this.trayMenu.destroy();
    }
    
    app.quit();
  }
}

// Initialize the application
const serverManager = new ServerManagerApp();
serverManager.init();