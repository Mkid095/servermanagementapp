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
    
    // Configure electron-log
    log.transports.file.level = 'info';
    log.transports.console.level = 'debug';
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
      show: true, // Show window immediately
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

    // Hide window when minimized (optional - remove if you want normal minimize behavior)
    this.mainWindow.on('minimize', (event) => {
      // Commented out to allow normal minimize behavior
      // event.preventDefault();
      // this.mainWindow.hide();
    });

    // Handle window close with confirmation dialog
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.showCloseConfirmation();
      }
    });

    // Quit when window is actually closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Show window when ready and open dev tools in development mode
    if (process.argv.includes('--dev')) {
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

    // New IPC handlers for enhanced functionality
    ipcMain.handle('restart-server', async (event, serverId) => {
      try {
        const result = await this.processManager.restartServer(serverId);
        
        // Refresh server list after restart
        setTimeout(async () => {
          const servers = await this.serverDetector.detectServers();
          if (this.mainWindow) {
            this.mainWindow.webContents.send('servers-updated', servers);
          }
        }, 3000);
        
        return result;
      } catch (error) {
        log.error('Error restarting server:', error);
        return { 
          success: false, 
          error: error.message || 'Unknown error occurred' 
        };
      }
    });

    ipcMain.handle('get-server-error-logs', async (event, pid) => {
      try {
        return await this.processManager.getServerErrorLogs(pid);
      } catch (error) {
        log.error('Error getting server error logs:', error);
        return { 
          success: false, 
          error: error.message || 'Unknown error occurred' 
        };
      }
    });

    ipcMain.handle('clear-server-error-logs', async (event, pid) => {
      try {
        return await this.processManager.clearServerErrorLogs(pid);
      } catch (error) {
        log.error('Error clearing server error logs:', error);
        return { 
          success: false, 
          error: error.message || 'Unknown error occurred' 
        };
      }
    });

    // Handle server updates from renderer
    ipcMain.on('servers-updated', (event, servers) => {
      if (this.trayMenu) {
        this.trayMenu.updateMenu();
      }
    });
  }

  // Show confirmation dialog when user tries to close the window
  showCloseConfirmation() {
    const { dialog } = require('electron');
    
    const options = {
      type: 'question',
      buttons: ['Minimize to Tray', 'Quit Application', 'Cancel'],
      defaultId: 0,
      title: 'Close Server Manager',
      message: 'What would you like to do?',
      detail: 'You can minimize to system tray to keep monitoring servers in the background, or quit the application completely.',
      icon: path.join(__dirname, '..', 'assets', 'icon.png')
    };

    dialog.showMessageBox(this.mainWindow, options).then(({ response }) => {
      switch (response) {
        case 0: // Minimize to Tray
          this.mainWindow.hide();
          log.info('Window minimized to system tray');
          break;
        case 1: // Quit Application
          this.quit();
          break;
        case 2: // Cancel
          // Do nothing, keep window open
          break;
      }
    }).catch(err => {
      log.error('Error showing close confirmation dialog:', err);
      // Fallback: minimize to tray if dialog fails
      this.mainWindow.hide();
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