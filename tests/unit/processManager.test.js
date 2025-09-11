const ProcessManager = require('../../src/services/processManager');

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('electron-log', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('ProcessManager', () => {
  let processManager;
  let mockExec;

  beforeEach(() => {
    mockExec = require('child_process').exec;
    jest.clearAllMocks();
    
    processManager = new ProcessManager();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(processManager.terminationTimeout).toBe(10000);
    });
  });

  describe('stopServer', () => {
    it('should stop server successfully with graceful shutdown', async () => {
      // Mock process exists
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('tasklist /fi')) {
          callback(null, { stdout: '"node.exe","1234","Session","1","1000 K"\n' });
        } else if (command.includes('taskkill /PID') && !command.includes('/F')) {
          callback(null, { stdout: '' });
        }
      });

      // Mock that process no longer exists after graceful shutdown
      const originalVerifyProcessExists = processManager.verifyProcessExists;
      processManager.verifyProcessExists = jest.fn()
        .mockResolvedValueOnce(true)  // Before shutdown
        .mockResolvedValueOnce(false); // After shutdown

      const result = await processManager.stopServer(1234);

      expect(result).toMatchObject({
        success: true,
        method: 'graceful'
      });

      // Restore original method
      processManager.verifyProcessExists = originalVerifyProcessExists;
    }, 15000);

    it('should return error if process does not exist', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('tasklist /fi')) {
          callback(null, { stdout: '' });
        }
      });

      const result = await processManager.stopServer(9999);

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });
    });

    it('should attempt force termination if graceful shutdown fails', async () => {
      // Mock graceful shutdown fails but force termination succeeds
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('tasklist /fi')) {
          callback(null, { stdout: '"node.exe","1234","Session","1","1000 K"\n' });
        } else if (command.includes('taskkill /PID 1234') && !command.includes('/F')) {
          callback(new Error('Process still running'), { stdout: '' });
        } else if (command.includes('taskkill /F /PID')) {
          callback(null, { stdout: '' });
        }
      });

      const result = await processManager.stopServer(1234);

      expect(result).toMatchObject({
        success: true,
        method: 'force'
      });
    });

    it('should handle general errors gracefully', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('System error'), { stdout: '' });
      });

      const result = await processManager.stopServer(1234);

      expect(result).toMatchObject({
        success: false
      });
      expect(result.error).toContain('System error');
    });
  });

  describe('verifyProcessExists', () => {
    it('should return true if process exists', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '"node.exe","1234","Session","1","1000 K"\n' });
      });

      const exists = await processManager.verifyProcessExists(1234);

      expect(exists).toBe(true);
    });

    it('should return false if process does not exist', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '' });
      });

      const exists = await processManager.verifyProcessExists(9999);

      expect(exists).toBe(false);
    });

    it('should return false on command error', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Command failed'), { stdout: '' });
      });

      const exists = await processManager.verifyProcessExists(1234);

      expect(exists).toBe(false);
    });
  });

  describe('attemptGracefulShutdown', () => {
    it('should return success if process terminates gracefully', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('taskkill /PID')) {
          callback(null, { stdout: '' });
        }
      });

      // Mock process no longer exists after graceful shutdown
      const originalVerifyProcessExists = processManager.verifyProcessExists;
      processManager.verifyProcessExists = jest.fn()
        .mockResolvedValueOnce(true)  // First call (before shutdown)
        .mockResolvedValueOnce(false); // Second call (after shutdown)

      const result = await processManager.attemptGracefulShutdown(1234);

      expect(result).toMatchObject({
        success: true,
        method: 'graceful'
      });

      // Restore original method
      processManager.verifyProcessExists = originalVerifyProcessExists;
    });

    it('should return failure if process does not terminate gracefully', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('taskkill /PID')) {
          callback(new Error('Process still running'), { stdout: '' });
        }
      });

      const result = await processManager.attemptGracefulShutdown(1234);

      expect(result).toMatchObject({
        success: false,
        method: 'graceful'
      });
    });
  });

  describe('forceTerminate', () => {
    it('should return success if process is force terminated', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('taskkill /F /PID')) {
          callback(null, { stdout: '' });
        }
      });

      const result = await processManager.forceTerminate(1234);

      expect(result).toMatchObject({
        success: true,
        method: 'force'
      });
    });

    it('should return failure if force termination fails', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('taskkill /F /PID')) {
          callback(new Error('Access denied'), { stdout: '' });
        }
      });

      const result = await processManager.forceTerminate(1234);

      expect(result).toMatchObject({
        success: false,
        method: 'force',
        error: 'Access denied'
      });
    });
  });

  describe('stopMultipleServers', () => {
    it('should stop multiple servers and return results', async () => {
      const mockStopServer = jest.fn()
        .mockResolvedValueOnce({ success: true, pid: 1234 })
        .mockResolvedValueOnce({ success: false, pid: 5678 })
        .mockResolvedValueOnce({ success: true, pid: 9012 });

      processManager.stopServer = mockStopServer;

      const result = await processManager.stopMultipleServers([1234, 5678, 9012]);

      expect(result).toMatchObject({
        success: false, // Not all succeeded
        total: 3,
        successful: 2,
        failed: 1,
        results: {
          '1234': { success: true, pid: 1234 },
          '5678': { success: false, pid: 5678 },
          '9012': { success: true, pid: 9012 }
        }
      });
    });

    it('should return success if all servers are stopped', async () => {
      const mockStopServer = jest.fn()
        .mockResolvedValue({ success: true });

      processManager.stopServer = mockStopServer;

      const result = await processManager.stopMultipleServers([1234, 5678]);

      expect(result).toMatchObject({
        success: true,
        total: 2,
        successful: 2,
        failed: 0
      });
    });
  });

  describe('getProcessTree', () => {
    it('should return process tree information', async () => {
      const mockMainOutput = `Node,MyNode,1234,1000,"node server.js"
Node,ChildNode,5678,1234,"node worker.js"`;
      
      const mockChildOutput = `Node,ChildNode,5678,Name`;

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('where "ProcessId=1234"')) {
          callback(null, { stdout: mockMainOutput });
        } else if (command.includes('where "ParentProcessId=1234"')) {
          callback(null, { stdout: mockChildOutput });
        }
      });

      const tree = await processManager.getProcessTree(1234);

      expect(tree).toMatchObject({
        pid: 1234,
        name: 'MyNode',
        children: [
          { pid: 5678, name: 'ChildNode' }
        ]
      });
    });

    it('should return null if process is not found', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '' });
      });

      const tree = await processManager.getProcessTree(9999);

      expect(tree).toBeNull();
    });
  });

  describe('isDevelopmentServer', () => {
    it('should return true for development server processes', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: 'Node,node.exe,1234,1000,"node_modules/.bin/react-scripts start"' });
      });

      const isDevServer = await processManager.isDevelopmentServer(1234);

      expect(isDevServer).toBe(true);
    });

    it('should return false for non-development processes', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: 'Node,chrome.exe,1234,1000,"chrome.exe"' });
      });

      const isDevServer = await processManager.isDevelopmentServer(1234);

      expect(isDevServer).toBe(false);
    });
  });

  describe('getProcessResources', () => {
    it('should return process resource information', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: 'Node,node.exe,1234,10000000,5000000,3000000' });
      });

      const resources = await processManager.getProcessResources(1234);

      expect(resources).toMatchObject({
        memoryUsage: expect.any(Number),
        userTime: 5000000,
        kernelTime: 3000000
      });

      expect(resources.memoryUsage).toBeGreaterThan(0);
    });

    it('should return null if process is not found', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '' });
      });

      const resources = await processManager.getProcessResources(9999);

      expect(resources).toBeNull();
    });
  });
});