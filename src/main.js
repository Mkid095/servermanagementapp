const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const TrayMenu = require('./components/TrayMenu');
const ServerDetector = require('./services/serverDetector');
const ProcessManager = require('./services/processManager');
const appConfig = require('./config/appConfig');

class ServerManagerApp {
  constructor() {
    this.mainWindow = null;
    this.trayMenu = null;
    this.isQuitting = false;
    this.serverCheckInterval = null;
    
    // Initialize services
    this.serverDetector = new ServerDetector();
    this.processManager = new ProcessManager();
    
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
    this.trayMenu = new TrayMenu(this.mainWindow, this.processManager);
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
      try {
        const servers = await this.serverDetector.detectServers();
        return servers;
      } catch (error) {
        log.error('Error getting servers:', error);
        return [];
      }
    });

    ipcMain.handle('stop-server', async (event, serverId) => {
      try {
        const result = await this.processManager.stopServer(serverId);
        return result;
      } catch (error) {
        log.error('Error stopping server:', error);
        return { 
          success: false, 
          error: error.message || 'Unknown error occurred' 
        };
      }
    });

    // Additional IPC handlers
    ipcMain.handle('get-process-details', async (event, pid) => {
      try {
        return await this.processManager.getProcessTree(pid);
      } catch (error) {
        log.error('Error getting process details:', error);
        return null;
      }
    });

    ipcMain.handle('refresh-servers', async () => {
      try {
        this.serverDetector.clearCache();
        const servers = await this.serverDetector.detectServers();
        
        // Notify tray menu about server updates
        if (this.trayMenu) {
          this.trayMenu.updateMenu();
        }
        
        return servers;
      } catch (error) {
        log.error('Error refreshing servers:', error);
        return [];
      }
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