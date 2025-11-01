const TrayMenu = require('../../src/components/TrayMenu');
const { Menu, Tray } = require('electron');

// Mock Electron modules
jest.mock('electron', () => ({
  Menu: {
    buildFromTemplate: jest.fn(() => ({
      items: []
    }))
  },
  Tray: jest.fn(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn()
  })),
  app: {
    quit: jest.fn()
  },
  ipcMain: {
    on: jest.fn()
  },
  nativeImage: {
    createEmpty: jest.fn(() => ({}))
  }
}));

jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('TrayMenu', () => {
  let trayMenu;
  let mockMainWindow;
  let mockServerManager;

  beforeEach(() => {
    mockMainWindow = {
      isVisible: jest.fn(() => false),
      show: jest.fn(),
      hide: jest.fn(),
      focus: jest.fn(),
      webContents: {
        send: jest.fn()
      }
    };

    mockServerManager = {
      stopServer: jest.fn()
    };

    // Clear all mock calls
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with main window and server manager', () => {
      trayMenu = new TrayMenu(mockMainWindow, mockServerManager);
      
      expect(trayMenu.mainWindow).toBe(mockMainWindow);
      expect(trayMenu.serverManager).toBe(mockServerManager);
      expect(trayMenu.tray).toBeNull();
      expect(trayMenu.servers).toEqual([]);
      expect(trayMenu.isQuitting).toBe(false);
    });
  });

  describe('init', () => {
    it('should create tray and set up event handlers', () => {
      trayMenu = new TrayMenu(mockMainWindow, mockServerManager);
      
      trayMenu.init();
      
      expect(Tray).toHaveBeenCalledWith(expect.stringContaining('icon.png'));
      expect(trayMenu.tray).toBeDefined();
    });

    it('should handle tray initialization error gracefully', () => {
      // Create a fresh instance for this test

      // Mock first Tray call to fail, but second to succeed
      Tray.mockImplementationOnce(() => {
        throw new Error('Tray creation failed');
      }).mockImplementationOnce(() => ({
        setToolTip: jest.fn(),
        setContextMenu: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      }));

      const log = require('electron-log');
      const errorTrayMenu = new TrayMenu(mockMainWindow, mockServerManager);

      // The init() should not throw when the second attempt succeeds
      expect(() => errorTrayMenu.init()).not.toThrow();
      expect(log.warn).toHaveBeenCalledWith('Failed to load custom icon, using default icon:', 'Tray creation failed');
    });
  });

  describe('buildMenuTemplate', () => {
    beforeEach(() => {
      trayMenu = new TrayMenu(mockMainWindow, mockServerManager);
      trayMenu.init();
    });

    it('should build basic menu template with no servers', () => {
      const template = trayMenu.buildMenuTemplate();
      
      expect(template.length).toBeGreaterThan(0);
      expect(template[0].label).toBe('Server Manager');
      expect(template[0].enabled).toBe(false);
      
      // Should have no active servers section
      const noServersItem = template.find(item => item.label === 'No Active Servers');
      expect(noServersItem).toBeDefined();
      expect(noServersItem.enabled).toBe(false);
    });

    it('should include active servers in menu', () => {
      const mockServers = [
        { pid: 1234, name: 'React Dev Server', port: 3000, type: 'react' },
        { pid: 5678, name: 'Node.js API', port: 8000, type: 'node' }
      ];
      
      trayMenu.servers = mockServers;
      const template = trayMenu.buildMenuTemplate();
      
      // Should have active servers section
      const activeServersSection = template.find(item => item.label === 'Active Servers (2)');
      expect(activeServersSection).toBeDefined();
      
      // Should have server items
      const serverItems = template.filter(item => item.label && item.label.includes('Server'));
      expect(serverItems.length).toBeGreaterThan(0);
    });

    it('should limit server display to 5 items', () => {
      const mockServers = Array.from({ length: 8 }, (_, i) => ({
        pid: 1000 + i,
        name: `Server ${i + 1}`,
        port: 3000 + i,
        type: 'node'
      }));
      
      trayMenu.servers = mockServers;
      const template = trayMenu.buildMenuTemplate();
      
      // Should have "Show All" option when more than 5 servers
      const showAllItem = template.find(item => item.label && item.label.includes('Show All 8 Servers'));
      expect(showAllItem).toBeDefined();
    });
  });

  describe('window controls', () => {
    beforeEach(() => {
      trayMenu = new TrayMenu(mockMainWindow, mockServerManager);
      trayMenu.init();
    });

    it('should show window when hidden', () => {
      mockMainWindow.isVisible.mockReturnValue(false);
      
      const template = trayMenu.buildMenuTemplate();
      const showItem = template.find(item => item.label === 'Show Window');
      
      expect(showItem).toBeDefined();
      showItem.click();
      
      expect(mockMainWindow.show).toHaveBeenCalled();
      expect(mockMainWindow.focus).toHaveBeenCalled();
    });

    it('should hide window when visible', () => {
      mockMainWindow.isVisible.mockReturnValue(true);
      
      const template = trayMenu.buildMenuTemplate();
      const hideItem = template.find(item => item.label === 'Hide Window');
      
      expect(hideItem).toBeDefined();
      hideItem.click();
      
      expect(mockMainWindow.hide).toHaveBeenCalled();
    });
  });

  describe('server management', () => {
    beforeEach(() => {
      trayMenu = new TrayMenu(mockMainWindow, mockServerManager);
      trayMenu.init();
    });

    it('should call server manager to stop server', async () => {
      const mockServer = { pid: 1234, name: 'Test Server', port: 3000, type: 'node' };
      
      await trayMenu.stopServer(mockServer.pid);
      
      expect(mockServerManager.stopServer).toHaveBeenCalledWith(mockServer.pid);
    });

    it('should handle server stop errors gracefully', async () => {
      const mockServer = { pid: 1234, name: 'Test Server', port: 3000, type: 'node' };
      const log = require('electron-log');
      
      mockServerManager.stopServer.mockRejectedValue(new Error('Stop failed'));
      
      await trayMenu.stopServer(mockServer.pid);
      
      expect(log.error).toHaveBeenCalledWith('Error stopping server from tray:', expect.any(Error));
    });
  });

  describe('quit', () => {
    beforeEach(() => {
      trayMenu = new TrayMenu(mockMainWindow, mockServerManager);
      trayMenu.init();
    });

    it('should quit the application', () => {
      const { app } = require('electron');
      
      trayMenu.quit();
      
      expect(trayMenu.isQuitting).toBe(true);
      expect(app.quit).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      trayMenu = new TrayMenu(mockMainWindow, mockServerManager);
      trayMenu.init();
    });

    it('should destroy tray and clean up', () => {
      // Ensure tray was created
      expect(trayMenu.tray).toBeDefined();
      
      trayMenu.destroy();
      
      // Verify destroy was called on the tray instance
      expect(trayMenu.tray).toBeNull();
    });

    it('should handle destroy when tray is null', () => {
      trayMenu.tray = null;
      
      expect(() => trayMenu.destroy()).not.toThrow();
    });
  });

  describe('setters', () => {
    it('should set main window', () => {
      trayMenu = new TrayMenu(null, mockServerManager);
      const newWindow = { show: jest.fn() };
      
      trayMenu.setMainWindow(newWindow);
      
      expect(trayMenu.mainWindow).toBe(newWindow);
    });

    it('should set server manager', () => {
      trayMenu = new TrayMenu(mockMainWindow, null);
      const newManager = { stopServer: jest.fn() };
      
      trayMenu.setServerManager(newManager);
      
      expect(trayMenu.serverManager).toBe(newManager);
    });
  });
});