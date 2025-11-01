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

    // Add "Stop All Servers and Exit" if there are active servers
    if (this.servers.length > 0) {
      template.push({
        label: `Stop All ${this.servers.length} Servers & Exit`,
        click: () => {
          this.stopAllServersAndExit();
        }
      });
    }

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

  async stopAllServersAndExit() {
    try {
      log.info('User requested to stop all servers and exit application');

      // Show confirmation dialog
      const { dialog } = require('electron');

      const safeServers = this.servers.filter(server =>
      (server.isSafeToStop === true) ||
      (server.isSafeToStop === undefined && server.importance === 'development')
    );

    const criticalServers = this.servers.length - safeServers.length;

    const options = {
        type: 'question',
        buttons: ['Stop All & Exit', 'Cancel'],
        defaultId: 0,
        title: 'Stop All Servers & Exit',
        message: `Stop all ${safeServers.length} development servers and exit Server Manager?`,
        detail: criticalServers > 0 ?
          `This will terminate ${safeServers.length} development servers and exclude ${criticalServers} critical/production servers.` :
          `This will terminate all ${safeServers.length} detected development servers and then close the Server Manager application.`,
        icon: path.join(__dirname, '..', '..', 'assets', 'icon.png')
      };

      const { response } = await dialog.showMessageBox(this.mainWindow, options);

      if (response === 0) { // User clicked "Stop All & Exit"
        log.info('User confirmed - proceeding to stop all servers and exit');

        try {
          // Direct call to processManager to stop all servers
          const result = await this.serverManager.stopAllServersAndExit(this.servers);

          if (result.success) {
            log.info(`Servers stopped successfully: ${result.message}`);

            // Show success dialog
            await dialog.showMessageBox(this.mainWindow, {
              type: 'info',
              buttons: ['OK'],
              defaultId: 0,
              title: 'Servers Stopped',
              message: 'All servers stopped successfully',
              detail: result.message
            });

            // Wait a moment before exiting
            setTimeout(() => {
              this.isQuitting = true;
              require('electron').app.quit();
            }, 1000);

          } else {
            log.error(`Failed to stop some servers: ${result.error || 'Unknown error'}`);

            // Show warning dialog with option to exit anyway
            const warningResult = await dialog.showMessageBox(this.mainWindow, {
              type: 'warning',
              buttons: ['Exit Anyway', 'Cancel'],
              defaultId: 1,
              title: 'Server Stop Warning',
              message: 'Some servers could not be stopped automatically',
              detail: result.error || 'You can exit the application anyway, but some development servers may still be running.',
            });

            if (warningResult.response === 0) { // User clicked "Exit Anyway"
              this.isQuitting = true;
              require('electron').app.quit();
            }
          }
        } catch (serverStopError) {
          log.error('Error stopping servers:', serverStopError);

          // Show error dialog with option to exit anyway
          const errorResult = await dialog.showMessageBox(this.mainWindow, {
            type: 'error',
            buttons: ['Exit Anyway', 'Cancel'],
            defaultId: 1,
            title: 'Server Stop Error',
            message: 'An error occurred while trying to stop servers',
            detail: serverStopError.message + '\n\nYou can exit the application anyway.',
          });

          if (errorResult.response === 0) { // User clicked "Exit Anyway"
            this.isQuitting = true;
            require('electron').app.quit();
          }
        }
      } else {
        log.info('User cancelled the stop all servers and exit operation');
      }
    } catch (error) {
      log.error('Error in stopAllServersAndExit:', error);

      // Show error dialog
      const { dialog } = require('electron');
      await dialog.showMessageBox(this.mainWindow, {
        type: 'error',
        buttons: ['OK'],
        title: 'Error',
        message: 'An error occurred',
        detail: error.message
      });
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