const { Menu, Tray, app, ipcMain, nativeImage } = require('electron');
const path = require('path');
const log = require('electron-log');

class TrayMenu {
  constructor(mainWindow, serverManager) {
    this.mainWindow = mainWindow;
    this.serverManager = serverManager;
    this.tray = null;
    this.servers = [];
    this.isQuitting = false;
  }

  init() {
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
    
    try {
      // Try to load custom icon first
      this.tray = new Tray(iconPath);
      this.tray.setToolTip('Server Manager - Development Server Monitor');
      
      // Set up initial menu
      this.updateMenu();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      log.info('System tray initialized successfully');
    } catch (error) {
      log.warn('Failed to load custom icon, using default icon:', error.message);
      
      try {
        // Create a simple tray without custom icon - Electron will use default
        this.tray = new Tray(nativeImage.createEmpty());
        this.tray.setToolTip('Server Manager - Development Server Monitor');
        
        // Set up initial menu
        this.updateMenu();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        log.info('System tray initialized with default icon');
      } catch (fallbackError) {
        log.error('Failed to initialize system tray completely:', fallbackError);
        throw fallbackError;
      }
    }
  }

  setupEventHandlers() {
    // Double-click to show/hide window
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

    // Right-click to show context menu
    this.tray.on('right-click', () => {
      this.tray.popUpContextMenu();
    });

    // Handle server updates
    ipcMain.on('servers-updated', (event, servers) => {
      this.servers = servers;
      this.updateMenu();
    });
  }

  updateMenu() {
    if (!this.tray) return;

    const template = this.buildMenuTemplate();
    const contextMenu = Menu.buildFromTemplate(template);
    
    this.tray.setContextMenu(contextMenu);
  }

  buildMenuTemplate() {
    const template = [
      {
        label: 'Server Manager',
        enabled: false
      },
      { type: 'separator' }
    ];

    // Show/Hide window options
    if (this.mainWindow) {
      template.push({
        label: this.mainWindow.isVisible() ? 'Hide Window' : 'Show Window',
        click: () => {
          if (this.mainWindow.isVisible()) {
            this.mainWindow.hide();
          } else {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      });
    }

    // Server status section
    if (this.servers.length > 0) {
      template.push({ type: 'separator' });
      template.push({
        label: `Active Servers (${this.servers.length})`,
        enabled: false
      });

      // Add servers to menu (limit to first 5 to avoid menu being too long)
      this.servers.slice(0, 5).forEach(server => {
        template.push({
          label: `${server.name} (Port: ${server.port})`,
          submenu: [
            {
              label: 'Stop Server',
              click: () => {
                this.stopServer(server.pid);
              }
            },
            {
              label: 'Copy PID',
              click: () => {
                require('electron').clipboard.writeText(server.pid.toString());
              }
            },
            { type: 'separator' },
            {
              label: `PID: ${server.pid}`,
              enabled: false
            },
            {
              label: `Port: ${server.port}`,
              enabled: false
            },
            {
              label: `Type: ${server.type}`,
              enabled: false
            }
          ]
        });
      });

      // If there are more servers, show a "Show All" option
      if (this.servers.length > 5) {
        template.push({
          label: `Show All ${this.servers.length} Servers...`,
          click: () => {
            if (this.mainWindow) {
              this.mainWindow.show();
              this.mainWindow.focus();
            }
          }
        });
      }
    } else {
      template.push({ type: 'separator' });
      template.push({
        label: 'No Active Servers',
        enabled: false
      });
    }

    template.push({ type: 'separator' });
    
    // Quick actions
    template.push({
      label: 'Refresh Servers',
      click: () => {
        this.refreshServers();
      }
    });

    // Application control
    template.push({ type: 'separator' });
    template.push({
      label: 'Quit',
      click: () => {
        this.quit();
      }
    });

    return template;
  }

  async stopServer(pid) {
    try {
      if (this.serverManager) {
        await this.serverManager.stopServer(pid);
      }
    } catch (error) {
      log.error('Error stopping server from tray:', error);
    }
  }

  refreshServers() {
    // This will trigger a server refresh
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('refresh-servers');
    }
  }

  quit() {
    this.isQuitting = true;
    app.quit();
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setServerManager(manager) {
    this.serverManager = manager;
  }
}

module.exports = TrayMenu;