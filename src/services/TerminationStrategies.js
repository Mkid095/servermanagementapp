/**
 * Termination Strategies Module for ProcessManager
 * Handles different methods of process termination
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const log = require('electron-log');

const execAsync = promisify(exec);

class TerminationStrategies {
  constructor(terminationTimeout = 10000) {
    this.terminationTimeout = terminationTimeout;
  }

  /**
   * Stop a server by PID using multiple strategies
   * @param {number} pid - Process ID
   * @param {Object} dependencies - Dependencies (processUtils, mainProcessCheck)
   * @returns {Promise<Object>} Result object with success status
   */
  async stopServer(pid, dependencies) {
    try {
      log.info(`Attempting to stop server with PID: ${pid}`);

      // Validate PID
      if (!pid || isNaN(pid) || pid <= 0) {
        return {
          success: false,
          error: 'Invalid PID provided'
        };
      }

      // Security check: verify this is not our main process
      try {
        if (await dependencies.mainProcessCheck.isMainProcess(pid)) {
          return {
            success: false,
            error: 'Cannot terminate main application process'
          };
        }
      } catch (securityCheckError) {
        log.warn('Security check failed, continuing with termination attempt:', securityCheckError.message);
      }

      // First, verify the process exists
      try {
        const processExists = await dependencies.processUtils.verifyProcessExists(pid);
        if (!processExists) {
          return {
            success: false,
            error: `Process with PID ${pid} not found`
          };
        }
      } catch (verificationError) {
        log.warn('Process verification failed, attempting termination anyway:', verificationError.message);
      }

      // Try graceful shutdown first
      const gracefulResult = await this.attemptGracefulShutdown(pid, dependencies);
      if (gracefulResult.success) {
        log.info(`Successfully stopped server with PID: ${pid} (graceful shutdown)`);
        return gracefulResult;
      }

      // If graceful shutdown fails, try force termination
      log.warn(`Graceful shutdown failed for PID ${pid}, attempting force termination`);
      const forceResult = await this.forceTerminate(pid, dependencies);

      if (forceResult.success) {
        log.info(`Successfully stopped server with PID: ${pid} (force termination)`);
        return forceResult;
      }

      // If force termination fails, try Node.js specific methods
      log.warn(`Force termination failed for PID ${pid}, trying Node.js specific methods`);
      const nodeResult = await this.terminateNodeProcess(pid, dependencies);

      if (nodeResult.success) {
        log.info(`Successfully stopped Node.js server with PID: ${pid} (Node.js specific method)`);
        return nodeResult;
      }

      // If all methods fail, return a user-friendly error message
      return {
        success: false,
        error: `Process could not be terminated. The process may have already ended or requires administrator privileges.`
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
   * @param {Object} dependencies - Dependencies
   * @returns {Promise<Object>} Result object
   */
  async terminateNodeProcess(pid, dependencies) {
    try {
      log.info(`Using enhanced Node.js termination for PID: ${pid}`);

      // Get process details first
      const processInfo = await dependencies.processUtils.getProcessInfo(pid);

      // Verify this is actually a Node.js process and not our main app
      if (!processInfo || (!processInfo.toLowerCase().includes('node.exe') && !processInfo.toLowerCase().includes('node '))) {
        log.warn(`Process ${pid} is not a Node.js process:`, processInfo);
        return {
          success: false,
          method: 'node-specific',
          error: 'Process is not a Node.js process'
        };
      }

      // Check if this is our own Electron process
      if (processInfo.toLowerCase().includes('electron.exe') ||
          processInfo.toLowerCase().includes('main.js')) {
        log.warn(`Attempted to terminate main application process ${pid}`);
        return {
          success: false,
          method: 'node-specific',
          error: 'Cannot terminate main application process'
        };
      }

      // Try Node.js specific termination methods - specific PID only
      const nodeMethods = [
        // Send SIGINT to Node.js process (graceful shutdown)
        `taskkill /PID ${pid} /SIGINT`,
        // Force terminate Node.js specifically
        `taskkill /F /PID ${pid}`,
        // Use WMIC for Node.js specific termination (both node.exe and node)
        `wmic process where "ProcessId=${pid} and (Name='node.exe' or Name='node')" call terminate`,
        // Use PowerShell for more control
        `powershell -Command "Stop-Process -Id ${pid} -Force"`,
        // Alternative PowerShell method
        `powershell -Command "Get-Process -Id ${pid} | Stop-Process -Force"`
      ];

      let lastError = null;
      for (const method of nodeMethods) {
        try {
          log.info(`Trying Node.js termination method: ${method}`);
          await execAsync(method);
          await this.sleep(2000);

          const stillRunning = await dependencies.processUtils.verifyProcessExists(pid);
          if (!stillRunning) {
            log.info(`Node.js process ${pid} terminated successfully using: ${method}`);
            return {
              success: true,
              method: 'node-specific',
              message: `Node.js process terminated using: ${method}`
            };
          } else {
            log.warn(`Process ${pid} still running after method: ${method}`);
          }
        } catch (methodError) {
          lastError = methodError;
          log.debug(`Node.js method ${method} failed:`, methodError.message);
          continue;
        }
      }

      const errorMessage = lastError ? lastError.message : 'Node.js process could not be terminated';
      log.error(`All Node.js termination methods failed for PID ${pid}. Last error:`, errorMessage);
      return {
        success: false,
        method: 'node-specific',
        error: errorMessage
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
   * Attempt graceful shutdown of a process
   * @param {number} pid - Process ID
   * @param {Object} dependencies - Dependencies
   * @returns {Promise<Object>} Result object
   */
  async attemptGracefulShutdown(pid, dependencies) {
    try {
      // Verify this is not our main process
      const processInfo = await dependencies.processUtils.getProcessInfo(pid);
      if (processInfo && (processInfo.toLowerCase().includes('electron.exe') ||
          processInfo.toLowerCase().includes('main.js'))) {
        return {
          success: false,
          method: 'graceful',
          error: 'Cannot terminate main application process'
        };
      }

      // Try graceful shutdown methods - AVOID /T flag to prevent tree termination
      const methods = [
        // Method 1: Standard taskkill (graceful) - specific PID only
        `taskkill /PID ${pid}`,
        // Method 2: Send WM_CLOSE message
        `taskkill /PID ${pid} /IM`,
        // Method 3: Node.js specific graceful shutdown
        `taskkill /PID ${pid}`
      ];

      for (const method of methods) {
        try {
          await execAsync(method);
          await this.sleep(1500);

          const stillRunning = await dependencies.processUtils.verifyProcessExists(pid);
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
   * @param {Object} dependencies - Dependencies
   * @returns {Promise<Object>} Result object
   */
  async forceTerminate(pid, dependencies) {
    try {
      // Get process info to verify it's a Node.js server and not our main app
      const processInfo = await dependencies.processUtils.getProcessInfo(pid);
      if (!processInfo) {
        return {
          success: false,
          method: 'force',
          error: 'Process not found'
        };
      }

      // Check if this is our own Electron main process
      if (processInfo.toLowerCase().includes('electron.exe') ||
          processInfo.toLowerCase().includes('main.js')) {
        return {
          success: false,
          method: 'force',
          error: 'Cannot terminate main application process'
        };
      }

      // Try targeted force termination methods - NEVER use /IM to kill all processes
      const forceMethods = [
        // Method 1: Standard force termination (specific PID only)
        `taskkill /F /PID ${pid}`,
        // Method 2: WMIC terminate (specific PID only)
        `wmic process where ProcessId=${pid} call terminate`,
        // Method 3: PowerShell terminate (specific PID only)
        `powershell -Command "Stop-Process -Id ${pid} -Force"`,
        // Method 4: Node.js specific termination (if applicable)
        `wmic process where "ProcessId=${pid} and Name='node.exe'" call terminate`
      ];

      for (const method of forceMethods) {
        try {
          log.info(`Trying force termination method: ${method}`);
          await execAsync(method);
          await this.sleep(2000);

          const stillRunning = await dependencies.processUtils.verifyProcessExists(pid);
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
   * @param {Object} dependencies - Dependencies
   * @returns {Promise<Object>} Result object with individual results
   */
  async stopMultipleServers(pids, dependencies) {
    const results = {};

    for (const pid of pids) {
      results[pid] = await this.stopServer(pid, dependencies);
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
   * Restart a server by stopping and then restarting it with the same command
   * @param {number} pid - Process ID
   * @param {Object} dependencies - Dependencies
   * @returns {Promise<Object>} Result object with success status
   */
  async restartServer(pid, dependencies) {
    try {
      log.info(`Attempting to restart server with PID: ${pid}`);

      // Get process information before stopping
      const processInfo = await dependencies.processUtils.getProcessTree(pid);
      if (!processInfo) {
        return {
          success: false,
          error: `Process with PID ${pid} not found`
        };
      }

      const commandLine = processInfo.commandLine;
      const workingDir = await dependencies.processUtils.getProcessWorkingDirectory(pid);

      // Stop the server
      const stopResult = await this.stopServer(pid, dependencies);
      if (!stopResult.success) {
        return {
          success: false,
          error: `Failed to stop server: ${stopResult.error}`
        };
      }

      // Wait a moment before restarting
      await this.sleep(2000);

      // Restart the server
      const restartResult = await this.startServer(commandLine, workingDir, dependencies);

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
   * @param {Object} dependencies - Dependencies
   * @returns {Promise<Object>} Result object with new PID
   */
  async startServer(commandLine, workingDir = null, dependencies) {
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
   * Sleep helper function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TerminationStrategies;