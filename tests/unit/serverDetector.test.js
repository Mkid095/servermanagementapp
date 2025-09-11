const ServerDetector = require('../../src/services/serverDetector');
const appConfig = require('../../src/config/appConfig');

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: jest.fn()
}));

jest.mock('electron-log', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('ServerDetector', () => {
  let serverDetector;
  let mockExec;

  beforeEach(() => {
    mockExec = require('child_process').exec;
    jest.clearAllMocks();
    
    serverDetector = new ServerDetector();
    
    // Mock default appConfig
    appConfig.processPatterns = {
      node: ['node.exe', 'node'],
      react: ['react-scripts', 'next', 'nuxt', 'vite'],
      express: ['nodemon', 'ts-node-dev', 'ts-node'],
      python: ['python.exe', 'python', 'python3']
    };
    
    appConfig.defaultPorts = [3000, 8000, 5000, 8080];
  });

  describe('constructor', () => {
    it('should initialize with empty cache', () => {
      expect(serverDetector.cachedServers).toEqual([]);
      expect(serverDetector.lastCheckTime).toBe(0);
      expect(serverDetector.cacheDuration).toBe(3000);
    });
  });

  describe('detectServers', () => {
    it('should return cached servers if cache is valid', async () => {
      const cachedServers = [{ pid: 1234, name: 'Test Server' }];
      serverDetector.cachedServers = cachedServers;
      serverDetector.lastCheckTime = Date.now() - 1000; // 1 second ago

      const result = await serverDetector.detectServers();

      expect(result).toBe(cachedServers);
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should detect servers when cache is expired', async () => {
      // Mock successful process and connection detection
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('tasklist')) {
          callback(null, { stdout: '"node.exe","1234","Session","1","1000 K"\n' });
        } else if (command.includes('netstat')) {
          callback(null, { stdout: 'TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1234\n' });
        }
      });

      serverDetector.lastCheckTime = Date.now() - 4000; // 4 seconds ago

      const result = await serverDetector.detectServers();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        pid: 1234,
        type: 'node',
        port: 3000
      });
    });

    it('should handle detection errors gracefully', async () => {
      // Create a fresh instance to ensure clean state
      const freshDetector = new ServerDetector();
      freshDetector.cachedServers = [{ pid: 1234, name: 'Cached Server' }];
      freshDetector.lastCheckTime = Date.now() - 4000;

      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Command failed'), { stdout: '' });
      });

      const result = await freshDetector.detectServers();

      expect(result).toEqual([{ pid: 1234, name: 'Cached Server' }]);
    });
  });

  describe('getRunningProcesses', () => {
    it('should parse tasklist CSV output correctly', async () => {
      const mockOutput = '"node.exe","1234","Session","1","1000 K"\n"python.exe","5678","Session","1","2000 K"\n';
      
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: mockOutput });
      });

      const processes = await serverDetector.getRunningProcesses();

      expect(processes).toHaveLength(2);
      expect(processes[0]).toMatchObject({
        pid: 1234,
        name: 'node.exe',
        command: 'node.exe'
      });
      expect(processes[1]).toMatchObject({
        pid: 5678,
        name: 'python.exe',
        command: 'python.exe'
      });
    });

    it('should handle tasklist errors', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Tasklist failed'), { stdout: '' });
      });

      const processes = await serverDetector.getRunningProcesses();

      expect(processes).toEqual([]);
    });
  });

  describe('getNetworkConnections', () => {
    it('should parse netstat output correctly', async () => {
      const mockOutput = `Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1234
  TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       5678
  TCP    127.0.0.1:5432          127.0.0.1:12345       ESTABLISHED     8901`;
      
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: mockOutput });
      });

      const connections = await serverDetector.getNetworkConnections();

      expect(connections).toHaveLength(2);
      expect(connections[0]).toMatchObject({
        protocol: 'TCP',
        port: 3000,
        state: 'LISTENING',
        pid: 1234
      });
      expect(connections[1]).toMatchObject({
        protocol: 'TCP',
        port: 8000,
        state: 'LISTENING',
        pid: 5678
      });
    });

    it('should filter out non-LISTENING connections', async () => {
      const mockOutput = `TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1234
  TCP    127.0.0.1:5432          127.0.0.1:12345       ESTABLISHED     8901`;
      
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: mockOutput });
      });

      const connections = await serverDetector.getNetworkConnections();

      expect(connections).toHaveLength(1);
      expect(connections[0].state).toBe('LISTENING');
    });
  });

  describe('classifyServer', () => {
    it('should classify Node.js processes correctly', () => {
      const nodeProcess = {
        name: 'node.exe',
        command: 'node.exe',
        port: 3000
      };

      const server = serverDetector.classifyServer(nodeProcess);

      expect(server).toMatchObject({
        pid: undefined,
        name: 'Node.js Server',
        type: 'node',
        port: 3000
      });
    });

    it('should classify React dev servers correctly', () => {
      const reactProcess = {
        name: 'node.exe',
        command: 'node_modules/.bin/react-scripts start',
        port: 3000
      };

      const server = serverDetector.classifyServer(reactProcess);

      expect(server).toMatchObject({
        name: 'React Dev Server',
        type: 'react',
        port: 3000
      });
    });

    it('should classify Next.js servers correctly', () => {
      const nextProcess = {
        name: 'node.exe',
        command: 'next dev',
        port: 3000
      };

      const server = serverDetector.classifyServer(nextProcess);

      expect(server).toMatchObject({
        name: 'Next.js Server',
        type: 'react',
        port: 3000
      });
    });

    it('should classify Python web servers correctly', () => {
      const pythonProcess = {
        name: 'python.exe',
        command: 'python manage.py runserver',
        port: 8000
      };

      const server = serverDetector.classifyServer(pythonProcess);

      expect(server).toMatchObject({
        name: 'Python Web Server',
        type: 'python',
        port: 8000
      });
    });

    it('should return null for non-development processes', () => {
      const systemProcess = {
        name: 'chrome.exe',
        command: 'chrome.exe',
        port: null
      };

      const server = serverDetector.classifyServer(systemProcess);

      expect(server).toBeNull();
    });
  });

  describe('isWebPort', () => {
    it('should return true for common web ports', () => {
      expect(serverDetector.isWebPort(3000)).toBe(true);
      expect(serverDetector.isWebPort(8000)).toBe(true);
      expect(serverDetector.isWebPort(5000)).toBe(true);
      expect(serverDetector.isWebPort(8080)).toBe(true);
    });

    it('should return true for port ranges', () => {
      expect(serverDetector.isWebPort(3005)).toBe(true); // 3000-3010
      expect(serverDetector.isWebPort(8005)).toBe(true); // 8000-8010
      expect(serverDetector.isWebPort(5005)).toBe(true); // 5000-5010
    });

    it('should return false for non-web ports', () => {
      expect(serverDetector.isWebPort(22)).toBe(false);   // SSH
      expect(serverDetector.isWebPort(80)).toBe(false);   // HTTP
      expect(serverDetector.isWebPort(443)).toBe(false);  // HTTPS
      expect(serverDetector.isWebPort(9999)).toBe(false); // Outside ranges
    });
  });

  describe('clearCache', () => {
    it('should clear the server cache', () => {
      serverDetector.cachedServers = [{ pid: 1234 }];
      serverDetector.lastCheckTime = Date.now();

      serverDetector.clearCache();

      expect(serverDetector.cachedServers).toEqual([]);
      expect(serverDetector.lastCheckTime).toBe(0);
    });
  });

  describe('getProcessDetails', () => {
    it('should get process details for a specific PID', async () => {
      const mockOutput = '"node.exe","1234","Session","1","1000 K"\n';
      
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: mockOutput });
      });

      const details = await serverDetector.getProcessDetails(1234);

      expect(details).toMatchObject({
        pid: 1234,
        name: 'node.exe',
        command: 'node.exe'
      });
    });

    it('should return null if process is not found', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '' });
      });

      const details = await serverDetector.getProcessDetails(9999);

      expect(details).toBeNull();
    });
  });
});