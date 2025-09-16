const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const log = require('electron-log');

const execAsync = promisify(exec);

class ProcessManager {
  constructor() {
    this.terminationTimeout = 10000; // 10 seconds timeout for graceful shutdown
    this.errorLogsDir = path.join(__dirname, '..', '..', 'logs');
    this.initErrorLogs();
  }

  /**
   * Initialize error logs directory
   */
  async initErrorLogs() {
    try {
      await fs.mkdir(this.errorLogsDir, { recursive: true });
    } catch (error) {
      log.warn('Could not create error logs directory:', error);
    }
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
        return forceResult;
      }

      // If force termination fails, try Node.js specific methods
      log.warn(`Force termination failed for PID ${pid}, trying Node.js specific methods`);
      const nodeResult = await this.terminateNodeProcess(pid);
      
      if (nodeResult.success) {
        log.info(`Successfully stopped Node.js server with PID: ${pid} (Node.js specific method)`);
        return nodeResult;
      }

      // If all methods fail, return the last error
      return {
        success: false,
        error: `Process could not be terminated with any method. Last error: ${nodeResult.error}`
      };

    } catch (error) {
      log.error(`Error stopping server with PID ${pid}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while stopping server'
      };
    }
  }

  /**
   * Enhanced Node.js process termination
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async terminateNodeProcess(pid) {
    try {
      log.info(`Using enhanced Node.js termination for PID: ${pid}`);
      
      // Get process details first
      const processInfo = await this.getProcessInfo(pid);
      
      // Try Node.js specific termination methods
      const nodeMethods = [
        // Send SIGINT to Node.js process
        `taskkill /PID ${pid} /SIGINT`,
        // Force terminate Node.js specifically
        `taskkill /F /PID ${pid} /T`,
        // Kill all Node.js processes from the same command line
        `wmic process where "ProcessId=${pid} and Name='node.exe'" call terminate`,
        // Use PowerShell for more control
        `powershell -Command "Stop-Process -Id ${pid} -Force"`
      ];

      for (const method of nodeMethods) {
        try {
          await execAsync(method);
          await this.sleep(2000);
          
          const stillRunning = await this.verifyProcessExists(pid);
          if (!stillRunning) {
            return {
              success: true,
              method: 'node-specific',
              message: `Node.js process terminated using: ${method}`
            };
          }
        } catch (methodError) {
          log.debug(`Node.js method ${method} failed:`, methodError.message);
          continue;
        }
      }

      return {
        success: false,
        method: 'node-specific',
        error: 'Node.js process could not be terminated'
      };

    } catch (error) {
      log.error(`Error in Node.js termination for PID ${pid}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get detailed process information
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process information
   */
  async getProcessInfo(pid) {
    try {
      const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get Name,CommandLine,ExecutablePath /format:list`);
      return stdout;
    } catch (error) {
      return null;
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
      // Try multiple graceful shutdown methods
      const methods = [
        // Method 1: Standard taskkill (graceful)
        `taskkill /PID ${pid}`,
        // Method 2: Send WM_CLOSE message
        `taskkill /PID ${pid} /IM`,
        // Method 3: Node.js specific graceful shutdown
        `taskkill /PID ${pid} /T`
      ];

      for (const method of methods) {
        try {
          await execAsync(method);
          await this.sleep(1500);
          
          const stillRunning = await this.verifyProcessExists(pid);
          if (!stillRunning) {
            return {
              success: true,
              method: 'graceful',
              message: `Process terminated gracefully using: ${method}`
            };
          }
        } catch (methodError) {
          log.debug(`Graceful method ${method} failed for PID ${pid}:`, methodError.message);
          continue;
        }
      }

      return {
        success: false,
        method: 'graceful',
        error: 'All graceful shutdown methods failed'
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
      // Try multiple force termination methods in order of aggression
      const forceMethods = [
        // Method 1: Standard force termination
        `taskkill /F /PID ${pid}`,
        // Method 2: Force terminate with tree (kill child processes too)
        `taskkill /F /PID ${pid} /T`,
        // Method 3: Force terminate by image name if PID fails
        `taskkill /F /IM node.exe`,
        // Method 4: Most aggressive - system level termination
        `wmic process where ProcessId=${pid} call terminate`
      ];

      for (const method of forceMethods) {
        try {
          log.info(`Trying force termination method: ${method}`);
          await execAsync(method);
          await this.sleep(2000);
          
          const stillRunning = await this.verifyProcessExists(pid);
          if (!stillRunning) {
            return {
              success: true,
              method: 'force',
              message: `Process force terminated using: ${method}`
            };
          }
        } catch (methodError) {
          log.debug(`Force method ${method} failed for PID ${pid}:`, methodError.message);
          continue;
        }
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
   * Restart a server by stopping and then restarting it with the same command
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object with success status
   */
  async restartServer(pid) {
    try {
      log.info(`Attempting to restart server with PID: ${pid}`);

      // Get process information before stopping
      const processInfo = await this.getProcessTree(pid);
      if (!processInfo) {
        return {
          success: false,
          error: `Process with PID ${pid} not found`
        };
      }

      const commandLine = processInfo.commandLine;
      const workingDir = await this.getProcessWorkingDirectory(pid);

      // Stop the server
      const stopResult = await this.stopServer(pid);
      if (!stopResult.success) {
        return {
          success: false,
          error: `Failed to stop server: ${stopResult.error}`
        };
      }

      // Wait a moment before restarting
      await this.sleep(2000);

      // Restart the server
      const restartResult = await this.startServer(commandLine, workingDir);
      
      if (restartResult.success) {
        log.info(`Successfully restarted server. New PID: ${restartResult.newPid}`);
      }

      return restartResult;

    } catch (error) {
      log.error(`Error restarting server with PID ${pid}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred while restarting server'
      };
    }
  }

  /**
   * Start a server with the given command
   * @param {string} commandLine - Command line to execute
   * @param {string} workingDir - Working directory for the process
   * @returns {Promise<Object>} Result object with new PID
   */
  async startServer(commandLine, workingDir = null) {
    try {
      const { exec } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const child = exec(commandLine, {
          cwd: workingDir || process.cwd(),
          detached: true,
          stdio: 'ignore'
        });

        child.unref();
        
        // Give the process a moment to start
        setTimeout(() => {
          if (child.pid) {
            resolve({
              success: true,
              newPid: child.pid,
              message: 'Server restarted successfully'
            });
          } else {
            reject(new Error('Failed to start server process'));
          }
        }, 1000);

        child.on('error', (error) => {
          reject(error);
        });
      });

    } catch (error) {
      log.error('Error starting server:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the working directory of a process
   * @param {number} pid - Process ID
   * @returns {Promise<string>} Working directory
   */
  async getProcessWorkingDirectory(pid) {
    try {
      const { stdout } = await execAsync(`wmic process where "ProcessId=${pid}" get ExecutablePath /format:csv`);
      
      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length < 2) return null;

      const executablePath = lines[1].split(',')[1];
      if (executablePath) {
        return path.dirname(executablePath);
      }

      return null;

    } catch (error) {
      log.error(`Error getting working directory for PID ${pid}:`, error);
      return null;
    }
  }

  /**
   * Get error logs for a specific server
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Error logs information
   */
  async getServerErrorLogs(pid) {
    try {
      const logFile = path.join(this.errorLogsDir, `server_${pid}_errors.log`);
      
      // Check if log file exists
      try {
        await fs.access(logFile);
      } catch {
        return {
          success: true,
          logs: [],
          message: 'No error logs found for this server'
        };
      }

      // Read log file
      const content = await fs.readFile(logFile, 'utf8');
      const logs = content.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { timestamp: new Date().toISOString(), message: line, level: 'info' };
          }
        });

      return {
        success: true,
        logs: logs.slice(-50), // Return last 50 log entries
        totalLogs: logs.length
      };

    } catch (error) {
      log.error(`Error getting error logs for PID ${pid}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log an error for a specific server
   * @param {number} pid - Process ID
   * @param {string} message - Error message
   * @param {string} level - Log level (error, warn, info)
   */
  async logServerError(pid, message, level = 'error') {
    try {
      const logFile = path.join(this.errorLogsDir, `server_${pid}_errors.log`);
      const logEntry = {
        timestamp: new Date().toISOString(),
        pid: pid,
        level: level,
        message: message
      };

      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
      
      // Also log to electron-log
      log[level](`Server PID ${pid}: ${message}`);

    } catch (error) {
      log.error(`Error logging server error for PID ${pid}:`, error);
    }
  }

  /**
   * Clear error logs for a specific server
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async clearServerErrorLogs(pid) {
    try {
      const logFile = path.join(this.errorLogsDir, `server_${pid}_errors.log`);
      
      try {
        await fs.unlink(logFile);
        return {
          success: true,
          message: 'Error logs cleared successfully'
        };
      } catch {
        return {
          success: true,
          message: 'No error logs to clear'
        };
      }

    } catch (error) {
      log.error(`Error clearing error logs for PID ${pid}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Monitor a server for errors and log them
   * @param {number} pid - Process ID
   * @param {string} serverName - Server name for logging
   */
  async monitorServerErrors(pid, serverName) {
    try {
      // Check if process is still running
      const isRunning = await this.verifyProcessExists(pid);
      if (!isRunning) {
        await this.logServerError(pid, `Server "${serverName}" has stopped unexpectedly`, 'warn');
        return;
      }

      // Get process resources
      const resources = await this.getProcessResources(pid);
      if (resources) {
        // Log high memory usage
        if (resources.memoryUsage > 1000) { // More than 1GB
          await this.logServerError(pid, `High memory usage detected: ${resources.memoryUsage.toFixed(2)} MB`, 'warn');
        }
      }

      // Continue monitoring
      setTimeout(() => this.monitorServerErrors(pid, serverName), 30000); // Check every 30 seconds

    } catch (error) {
      log.error(`Error monitoring server ${pid}:`, error);
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