const { exec } = require('child_process');
const { promisify } = require('util');
const log = require('electron-log');

const execAsync = promisify(exec);

class ProcessManager {
  constructor() {
    this.terminationTimeout = 10000; // 10 seconds timeout for graceful shutdown
  }

  /**
   * Stop a server by PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object with success status
   */
  async stopServer(pid) {
    try {
      log.info(`Attempting to stop server with PID: ${pid}`);

      // First, verify the process exists
      const processExists = await this.verifyProcessExists(pid);
      if (!processExists) {
        return {
          success: false,
          error: `Process with PID ${pid} not found`
        };
      }

      // Try graceful shutdown first
      const gracefulResult = await this.attemptGracefulShutdown(pid);
      if (gracefulResult.success) {
        log.info(`Successfully stopped server with PID: ${pid} (graceful shutdown)`);
        return gracefulResult;
      }

      // If graceful shutdown fails, try force termination
      log.warn(`Graceful shutdown failed for PID ${pid}, attempting force termination`);
      const forceResult = await this.forceTerminate(pid);
      
      if (forceResult.success) {
        log.info(`Successfully stopped server with PID: ${pid} (force termination)`);
      }

      return forceResult;

    } catch (error) {
      log.error(`Error stopping server with PID ${pid}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while stopping server'
      };
    }
  }

  /**
   * Verify if a process exists
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} True if process exists
   */
  async verifyProcessExists(pid) {
    try {
      const { stdout } = await execAsync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Attempt graceful shutdown of a process
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async attemptGracefulShutdown(pid) {
    try {
      // Send SIGTERM equivalent (Windows uses taskkill /f for force, but we try gentle first)
      await execAsync(`taskkill /PID ${pid}`);
      
      // Wait a bit to see if process terminates gracefully
      await this.sleep(2000);
      
      // Check if process is still running
      const stillRunning = await this.verifyProcessExists(pid);
      
      if (!stillRunning) {
        return {
          success: true,
          method: 'graceful',
          message: 'Process terminated gracefully'
        };
      }

      return {
        success: false,
        method: 'graceful',
        error: 'Process did not terminate gracefully'
      };

    } catch (error) {
      log.warn(`Graceful shutdown failed for PID ${pid}:`, error.message);
      return {
        success: false,
        method: 'graceful',
        error: error.message
      };
    }
  }

  /**
   * Force terminate a process
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async forceTerminate(pid) {
    try {
      // Force terminate the process
      await execAsync(`taskkill /F /PID ${pid}`);
      
      // Wait a moment to ensure termination
      await this.sleep(1000);
      
      // Verify process is terminated
      const stillRunning = await this.verifyProcessExists(pid);
      
      if (!stillRunning) {
        return {
          success: true,
          method: 'force',
          message: 'Process force terminated'
        };
      }

      return {
        success: false,
        method: 'force',
        error: 'Process could not be terminated'
      };

    } catch (error) {
      log.error(`Force termination failed for PID ${pid}:`, error.message);
      return {
        success: false,
        method: 'force',
        error: error.message
      };
    }
  }

  /**
   * Stop multiple servers
   * @param {Array<number>} pids - Array of process IDs
   * @returns {Promise<Object>} Result object with individual results
   */
  async stopMultipleServers(pids) {
    const results = {};
    
    for (const pid of pids) {
      results[pid] = await this.stopServer(pid);
    }

    const successful = Object.values(results).filter(r => r.success).length;
    const failed = Object.values(results).filter(r => !r.success).length;

    log.info(`Stopped ${successful} servers successfully, ${failed} failed`);

    return {
      success: failed === 0,
      total: pids.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get process information including children processes
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process information
   */
  async getProcessTree(pid) {
    try {
      // Get process details
      const { stdout } = await execAsync(`wmic process where "ProcessId=${pid}" get Name,ProcessId,ParentProcessId,CommandLine /format:csv`);
      
      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length < 2) return null;

      // Parse the main process
      const mainProcess = this.parseWmicLine(lines[1]);
      
      // Get child processes
      const { stdout: childStdout } = await execAsync(`wmic process where "ParentProcessId=${pid}" get ProcessId,Name /format:csv`);
      const childLines = childStdout.split('\n').filter(line => line.trim());
      
      const children = [];
      for (let i = 1; i < childLines.length; i++) {
        const child = this.parseWmicLine(childLines[i]);
        if (child && child.ProcessId) {
          children.push({
            pid: parseInt(child.ProcessId),
            name: child.Name || 'Unknown'
          });
        }
      }

      return {
        pid: parseInt(mainProcess.ProcessId),
        name: mainProcess.Name || 'Unknown',
        commandLine: mainProcess.CommandLine || '',
        parentPid: mainProcess.ParentProcessId ? parseInt(mainProcess.ParentProcessId) : null,
        children
      };

    } catch (error) {
      log.error(`Error getting process tree for PID ${pid}:`, error);
      return null;
    }
  }

  /**
   * Parse WMIC CSV output line
   * @param {string} line - CSV line
   * @returns {Object} Parsed object
   */
  parseWmicLine(line) {
    const parts = line.split(',');
    const result = {};
    
    // The first line contains headers, but we'll map by position for simplicity
    if (parts.length >= 4) {
      result.Node = parts[0];
      result.Name = parts[1];
      result.ProcessId = parts[2];
      result.ParentProcessId = parts[3];
      result.CommandLine = parts.slice(4).join(',');
    }
    
    return result;
  }

  /**
   * Check if a process is a development server
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} True if it's a development server
   */
  async isDevelopmentServer(pid) {
    try {
      const { stdout } = await execAsync(`wmic process where "ProcessId=${pid}" get CommandLine /format:csv`);
      
      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length < 2) return false;

      const commandLine = lines[1].split(',').slice(4).join(',').toLowerCase();
      
      // Check for development server indicators
      const devServerIndicators = [
        'node_modules',
        'react-scripts',
        'next',
        'nuxt',
        'vite',
        'webpack',
        'nodemon',
        'ts-node',
        'dev-server',
        'localhost',
        '127.0.0.1',
        '--port',
        '-p',
        'start',
        'dev',
        'serve'
      ];

      return devServerIndicators.some(indicator => commandLine.includes(indicator));

    } catch (error) {
      log.error(`Error checking if PID ${pid} is development server:`, error);
      return false;
    }
  }

  /**
   * Get system resource usage for a process
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Resource usage information
   */
  async getProcessResources(pid) {
    try {
      const { stdout } = await execAsync(`wmic process where "ProcessId=${pid}" get WorkingSetSize,UserModeTime,KernelModeTime /format:csv`);
      
      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length < 2) return null;

      const parts = lines[1].split(',');
      
      return {
        memoryUsage: parts[1] ? parseInt(parts[1]) / 1024 / 1024 : 0, // Convert to MB
        userTime: parts[2] ? parseInt(parts[2]) : 0,
        kernelTime: parts[3] ? parseInt(parts[3]) : 0
      };

    } catch (error) {
      log.error(`Error getting resources for PID ${pid}:`, error);
      return null;
    }
  }

  /**
   * Sleep helper function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ProcessManager;