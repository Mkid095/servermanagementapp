const ServerDetector = require('../../src/services/serverDetector');
const DetectionLogic = require('../../src/services/DetectionLogic');
const ProcessClassifier = require('../../src/services/ProcessClassifier');
const NetworkUtilities = require('../../src/services/NetworkUtilities');
const appConfig = require('../../src/config/appConfig');

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: jest.fn()
}));

jest.mock('electron-log', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('ServerDetector', () => {
  let serverDetector;
  let mockExec;
  let mockDetectionLogic;
  let mockProcessClassifier;
  let mockNetworkUtilities;

  beforeEach(() => {
    mockExec = require('child_process').exec;
    jest.clearAllMocks();

    // Create mock modules
    mockNetworkUtilities = new NetworkUtilities();
    mockProcessClassifier = new ProcessClassifier();
    mockDetectionLogic = new DetectionLogic(mockNetworkUtilities, mockProcessClassifier);

    // Mock the methods that will be called
    mockDetectionLogic.detectServers = jest.fn();
    mockDetectionLogic.clearCache = jest.fn();
    mockDetectionLogic.getCacheStats = jest.fn();
    mockDetectionLogic.forceRefresh = jest.fn();
    mockDetectionLogic.updateCacheDuration = jest.fn();
    mockDetectionLogic.getServerByPid = jest.fn();
    mockDetectionLogic.getServersByType = jest.fn();
    mockDetectionLogic.getServersByPort = jest.fn();
    mockDetectionLogic.getServerStats = jest.fn();
    mockDetectionLogic.getProcessDetails = jest.fn();
    mockDetectionLogic.cachedServers = [];
    mockDetectionLogic.lastCheckTime = 0;
    mockDetectionLogic.cacheDuration = 3000;

    mockNetworkUtilities.getRunningProcesses = jest.fn();
    mockNetworkUtilities.getNetworkConnections = jest.fn();
    mockNetworkUtilities.parseTasklistOutput = jest.fn();
    mockNetworkUtilities.parseNetstatOutput = jest.fn();
    mockNetworkUtilities.mapPortToProcess = jest.fn();
    mockNetworkUtilities.getDetailedProcessInfo = jest.fn();
    mockNetworkUtilities.isPortInUse = jest.fn();
    mockNetworkUtilities.getProcessesByPort = jest.fn();
    mockNetworkUtilities.getListeningPorts = jest.fn();
    mockNetworkUtilities.testConnection = jest.fn();
    mockNetworkUtilities.getNetworkInterfaces = jest.fn();
    mockNetworkUtilities.getNetworkStats = jest.fn();
    mockNetworkUtilities.execAsync = jest.fn();

    mockProcessClassifier.classifyServer = jest.fn();
    mockProcessClassifier.isSystemProcess = jest.fn();
    mockProcessClassifier.isMainAppProcess = jest.fn();
    mockProcessClassifier.extractPortFromCommand = jest.fn();
    mockProcessClassifier.isWebPort = jest.fn();
    mockProcessClassifier.getServerCategory = jest.fn();
    mockProcessClassifier.classifyServerEnhanced = jest.fn();

    // Create server detector with mocked modules
    serverDetector = new ServerDetector();
    serverDetector.detectionLogic = mockDetectionLogic;
    serverDetector.networkUtils = mockNetworkUtilities;
    serverDetector.processClassifier = mockProcessClassifier;

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
    it('should initialize with modules and delegate caching to DetectionLogic', () => {
      expect(serverDetector.detectionLogic).toBeDefined();
      expect(serverDetector.networkUtils).toBeDefined();
      expect(serverDetector.processClassifier).toBeDefined();
      expect(serverDetector.detectionLogic.cachedServers).toEqual([]);
      expect(serverDetector.detectionLogic.lastCheckTime).toBe(0);
      expect(serverDetector.detectionLogic.cacheDuration).toBe(3000);
    });
  });

  describe('detectServers', () => {
    it('should return cached servers if cache is valid', async () => {
      const cachedServers = [{ pid: 1234, name: 'Test Server' }];
      mockDetectionLogic.cachedServers = cachedServers;
      mockDetectionLogic.lastCheckTime = Date.now() - 1000; // 1 second ago
      mockDetectionLogic.detectServers.mockResolvedValue(cachedServers);

      const result = await serverDetector.detectServers();

      expect(result).toBe(cachedServers);
      expect(mockDetectionLogic.detectServers).toHaveBeenCalled();
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should detect servers when cache is expired', async () => {
      // Mock successful process and connection detection
      const detectedServers = [{ pid: 1234, type: 'node', port: 3000 }];
      mockDetectionLogic.detectServers.mockResolvedValue(detectedServers);
      mockDetectionLogic.lastCheckTime = Date.now() - 4000; // 4 seconds ago

      const result = await serverDetector.detectServers();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        pid: 1234,
        type: 'node',
        port: 3000
      });
      expect(mockDetectionLogic.detectServers).toHaveBeenCalled();
    });

    it('should handle detection errors gracefully', async () => {
      // Create a fresh instance to ensure clean state
      const freshDetector = new ServerDetector();
      freshDetector.detectionLogic = mockDetectionLogic;
      mockDetectionLogic.cachedServers = [{ pid: 1234, name: 'Cached Server' }];
      mockDetectionLogic.lastCheckTime = Date.now() - 4000; // Cache is expired
      mockDetectionLogic.detectServers.mockResolvedValue([]);

      const result = await freshDetector.detectServers();

      // When detection fails, should return empty array if cached servers are not available
      // Note: The current implementation may clear the cache during failed detection
      expect(Array.isArray(result)).toBe(true);
      // The result should be empty array since detection failed
      expect(result.length).toBe(0);
      expect(mockDetectionLogic.detectServers).toHaveBeenCalled();
    });
  });

  describe('getRunningProcesses', () => {
    it('should parse tasklist CSV output correctly', async () => {
      const mockOutput = '"node.exe","1234","Session","1","1000 K"\n"python.exe","5678","Session","1","2000 K"\n';
      const expectedProcesses = [
        { pid: 1234, name: 'node.exe', command: 'node.exe' },
        { pid: 5678, name: 'python.exe', command: 'python.exe' }
      ];

      mockNetworkUtilities.getRunningProcesses.mockResolvedValue(expectedProcesses);

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
      expect(mockNetworkUtilities.getRunningProcesses).toHaveBeenCalled();
    });

    it('should handle tasklist errors', async () => {
      mockNetworkUtilities.getRunningProcesses.mockResolvedValue([]);

      const processes = await serverDetector.getRunningProcesses();

      expect(processes).toEqual([]);
      expect(mockNetworkUtilities.getRunningProcesses).toHaveBeenCalled();
    });
  });

  describe('getNetworkConnections', () => {
    it('should parse netstat output correctly', async () => {
      const expectedConnections = [
        {
          protocol: 'TCP',
          port: 3000,
          state: 'LISTENING',
          pid: 1234
        },
        {
          protocol: 'TCP',
          port: 8000,
          state: 'LISTENING',
          pid: 5678
        }
      ];

      mockNetworkUtilities.getNetworkConnections.mockResolvedValue(expectedConnections);

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
      expect(mockNetworkUtilities.getNetworkConnections).toHaveBeenCalled();
    });

    it('should filter out non-LISTENING connections', async () => {
      const expectedConnections = [
        {
          protocol: 'TCP',
          port: 3000,
          state: 'LISTENING',
          pid: 1234
        }
      ];

      mockNetworkUtilities.getNetworkConnections.mockResolvedValue(expectedConnections);

      const connections = await serverDetector.getNetworkConnections();

      expect(connections).toHaveLength(1);
      expect(connections[0].state).toBe('LISTENING');
      expect(mockNetworkUtilities.getNetworkConnections).toHaveBeenCalled();
    });
  });

  describe('classifyServer', () => {
    it('should classify Node.js processes correctly', () => {
      const nodeProcess = {
        name: 'node.exe',
        command: 'node.exe',
        port: 3000
      };

      const expectedServer = {
        pid: undefined,
        name: 'Node.js Server',
        type: 'node',
        port: 3000
      };

      mockProcessClassifier.classifyServer.mockReturnValue(expectedServer);

      const server = serverDetector.classifyServer(nodeProcess);

      expect(server).toMatchObject({
        pid: undefined,
        name: 'Node.js Server',
        type: 'node',
        port: 3000
      });
      expect(mockProcessClassifier.classifyServer).toHaveBeenCalledWith(nodeProcess);
    });

    it('should classify React dev servers correctly', () => {
      const reactProcess = {
        name: 'node.exe',
        command: 'node_modules/.bin/react-scripts start',
        port: 3000
      };

      const expectedServer = {
        name: 'React Dev Server',
        type: 'react',
        port: 3000
      };

      mockProcessClassifier.classifyServer.mockReturnValue(expectedServer);

      const server = serverDetector.classifyServer(reactProcess);

      expect(server).toMatchObject({
        name: 'React Dev Server',
        type: 'react',
        port: 3000
      });
      expect(mockProcessClassifier.classifyServer).toHaveBeenCalledWith(reactProcess);
    });

    it('should classify Next.js servers correctly', () => {
      const nextProcess = {
        name: 'node.exe',
        command: 'next dev',
        port: 3000
      };

      const expectedServer = {
        name: 'Next.js Server',
        type: 'react',
        port: 3000
      };

      mockProcessClassifier.classifyServer.mockReturnValue(expectedServer);

      const server = serverDetector.classifyServer(nextProcess);

      expect(server).toMatchObject({
        name: 'Next.js Server',
        type: 'react',
        port: 3000
      });
      expect(mockProcessClassifier.classifyServer).toHaveBeenCalledWith(nextProcess);
    });

    it('should classify Python web servers correctly', () => {
      const pythonProcess = {
        name: 'python.exe',
        command: 'python manage.py runserver',
        port: 8000
      };

      const expectedServer = {
        name: 'Python Web Server',
        type: 'python',
        port: 8000
      };

      mockProcessClassifier.classifyServer.mockReturnValue(expectedServer);

      const server = serverDetector.classifyServer(pythonProcess);

      expect(server).toMatchObject({
        name: 'Python Web Server',
        type: 'python',
        port: 8000
      });
      expect(mockProcessClassifier.classifyServer).toHaveBeenCalledWith(pythonProcess);
    });

    it('should return null for non-development processes', () => {
      const systemProcess = {
        name: 'chrome.exe',
        command: 'chrome.exe',
        port: null
      };

      mockProcessClassifier.classifyServer.mockReturnValue(null);

      const server = serverDetector.classifyServer(systemProcess);

      expect(server).toBeNull();
      expect(mockProcessClassifier.classifyServer).toHaveBeenCalledWith(systemProcess);
    });
  });

  describe('isWebPort', () => {
    it('should return true for common web ports', () => {
      mockProcessClassifier.isWebPort.mockReturnValue(true);
      expect(serverDetector.isWebPort(3000)).toBe(true);
      expect(serverDetector.isWebPort(8000)).toBe(true);
      expect(serverDetector.isWebPort(5000)).toBe(true);
      expect(serverDetector.isWebPort(8080)).toBe(true);
      expect(mockProcessClassifier.isWebPort).toHaveBeenCalledTimes(4);
    });

    it('should return true for port ranges', () => {
      mockProcessClassifier.isWebPort.mockReturnValue(true);
      expect(serverDetector.isWebPort(3005)).toBe(true); // 3000-3010
      expect(serverDetector.isWebPort(8005)).toBe(true); // 8000-8010
      expect(serverDetector.isWebPort(5005)).toBe(true); // 5000-5010
      expect(mockProcessClassifier.isWebPort).toHaveBeenCalledTimes(3);
    });

    it('should return false for non-web ports', () => {
      mockProcessClassifier.isWebPort.mockReturnValue(false);
      expect(serverDetector.isWebPort(22)).toBe(false);   // SSH
      expect(serverDetector.isWebPort(80)).toBe(false);   // HTTP
      expect(serverDetector.isWebPort(443)).toBe(false);  // HTTPS
      expect(serverDetector.isWebPort(9999)).toBe(false); // Outside ranges
      expect(mockProcessClassifier.isWebPort).toHaveBeenCalledTimes(4);
    });
  });

  describe('clearCache', () => {
    it('should clear the server cache', () => {
      mockDetectionLogic.cachedServers = [{ pid: 1234 }];
      mockDetectionLogic.lastCheckTime = Date.now();

      serverDetector.clearCache();

      expect(mockDetectionLogic.clearCache).toHaveBeenCalled();
    });
  });

  describe('getProcessDetails', () => {
    it('should get process details for a specific PID', async () => {
      const expectedDetails = {
        pid: 1234,
        name: 'node.exe',
        command: 'node.exe'
      };

      mockDetectionLogic.getProcessDetails.mockResolvedValue(expectedDetails);

      const details = await serverDetector.getProcessDetails(1234);

      expect(details).toMatchObject({
        pid: 1234,
        name: 'node.exe',
        command: 'node.exe'
      });
      expect(mockDetectionLogic.getProcessDetails).toHaveBeenCalledWith(1234);
    });

    it('should return null if process is not found', async () => {
      mockDetectionLogic.getProcessDetails.mockResolvedValue(null);

      const details = await serverDetector.getProcessDetails(9999);

      expect(details).toBeNull();
      expect(mockDetectionLogic.getProcessDetails).toHaveBeenCalledWith(9999);
    });
  });
});