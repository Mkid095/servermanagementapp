/**
 * Process Manager Service
 * Main coordinator for process management operations
 * Refactored to use modular components
 */

const TerminationStrategies = require('./TerminationStrategies');
const ProcessUtilities = require('./ProcessUtilities');
const ProcessLogging = require('./ProcessLogging');
const path = require('path');
const log = require('electron-log');

class ProcessManager {
  constructor() {
    this.terminationTimeout = 10000; // 10 seconds timeout for graceful shutdown
    this.errorLogsDir = path.join(__dirname, '..', '..', 'logs');

    // Initialize modules
    this.terminationStrategies = new TerminationStrategies(this.terminationTimeout);
    this.processUtils = new ProcessUtilities();
    this.logging = new ProcessLogging(this.errorLogsDir);

    // Prepare dependencies for modules
    this.dependencies = {
      processUtils: this.processUtils,
      mainProcessCheck: this.processUtils
    };

    // Initialize error logs
    this.logging.initErrorLogs();
  }

  /**
   * Stop a server by PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object with success status
   */
  async stopServer(pid) {
    try {
      // Log the operation
      await this.logging.logServerOperation(pid, 'stop', true, 'Attempting to stop server');

      // ABSOLUTE SAFETY CHECK: Never attempt to stop system processes
      const processInfo = await this.processUtils.getProcessInfo(pid);

      // CRITICAL SYSTEM PROCESSES - ABSOLUTELY PROHIBITED
      if (this.processUtils.isSystemProcess(pid)) {
        const error = 'CRITICAL: This is a Windows system process and cannot be terminated for safety';
        await this.logging.logServerOperation(pid, 'stop', false, error);
        return {
          success: false,
          error: error,
          isProtected: true,
          isSystemProtected: true
        };
      }

      // CRITICAL SERVER PROCESSES - USER CONFIRMATION REQUIRED
      if (this.isCriticalServer(processInfo)) {
        // TODO: Show user confirmation dialog for critical processes
        const error = 'This appears to be a critical production server. Manual intervention required.';
        await this.logging.logServerOperation(pid, 'stop', false, error);
        return {
          success: false,
          error: error,
          isProtected: true,
          requiresManualIntervention: true
        };
      }

      const result = await this.terminationStrategies.stopServer(pid, this.dependencies);

      // Log the result
      await this.logging.logServerOperation(
        pid,
        'stop',
        result.success,
        result.success ? 'Server stopped successfully' : result.error
      );

      return result;

    } catch (error) {
      log.error(`Error stopping server with PID ${pid}:`, error);
      await this.logging.logServerOperation(pid, 'stop', false, error.message);

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
    return await this.terminationStrategies.terminateNodeProcess(pid, this.dependencies);
  }

  /**
   * Attempt graceful shutdown of a process
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async attemptGracefulShutdown(pid) {
    return await this.terminationStrategies.attemptGracefulShutdown(pid, this.dependencies);
  }

  /**
   * Force terminate a process
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async forceTerminate(pid) {
    return await this.terminationStrategies.forceTerminate(pid, this.dependencies);
  }

  /**
   * Stop multiple servers
   * @param {Array<number>} pids - Array of process IDs
   * @returns {Promise<Object>} Result object with individual results
   */
  async stopMultipleServers(pids) {
    return await this.terminationStrategies.stopMultipleServers(pids, this.dependencies);
  }

  /**
   * Stop all detected servers and prepare for application exit
   * @param {Array<Object>} servers - Array of server objects with pid property
   * @returns {Promise<Object>} Result object with success status and details
   */
  async stopAllServersAndExit(servers) {
    try {
      if (!servers || servers.length === 0) {
        return {
          success: true,
          message: 'No servers to stop',
          stoppedCount: 0,
          failedCount: 0,
          results: {}
        };
      }

      // Filter out servers that are not safe to stop (protect critical servers)
      const safeToStopServers = servers.filter(server => {
        // Include server if it's explicitly marked as safe to stop
        if (server.isSafeToStop === true) {
          return true;
        }

        // Include server if it doesn't have the safety flag but appears to be development server
        if (server.isSafeToStop === undefined && server.importance === 'development') {
          return true;
        }

        // Exclude servers marked as critical or production
        return false;
      });

      const excludedServers = servers.length - safeToStopServers.length;

      if (excludedServers > 0) {
        log.warn(`Excluding ${excludedServers} servers that are critical/production servers from automatic termination`);
      }

      // Extract PIDs from safe servers
      const pids = safeToStopServers.map(server => server.pid).filter(pid => pid && pid > 0);

      if (pids.length === 0) {
        return {
          success: true,
          message: excludedServers > 0 ?
            `Excluded ${excludedServers} critical servers. No safe servers to stop.` :
            'No safe servers to stop.',
          stoppedCount: 0,
          failedCount: 0,
          excludedCount: excludedServers,
          results: {}
        };
      }

      log.info(`Attempting to stop ${pids.length} safe-to-stop servers before application exit (excluded ${excludedServers} critical servers)`);

      // Stop all safe servers using existing stopMultipleServers method
      const result = await this.stopMultipleServers(pids);

      // Log the operation
      await this.logging.logServerOperation(
        0, // Use 0 to indicate all servers
        'stop-all-and-exit',
        result.failed === 0, // Success depends on all safe servers being stopped
        result.failed === 0 ?
          `Successfully stopped ${result.successful} of ${safeToStopServers.length} safe servers. Excluded ${excludedServers} critical servers.` :
          `Failed to stop ${result.failed} of ${safeToStopServers.length} safe servers. Excluded ${excludedServers} critical servers.`
      );

      return {
        success: result.failed === 0,
        message: `Stopped ${result.successful} of ${safeToStopServers.length} safe servers. ${excludedServers > 0 ? `Excluded ${excludedServers} critical servers.` : ''}`,
        stoppedCount: result.successful,
        failedCount: result.failed,
        excludedCount: excludedServers,
        results: result.results,
        safeServersStopped: result.successful,
        criticalServersExcluded: excludedServers
      };

    } catch (error) {
      log.error('Error stopping all servers:', error);

      // Log error
      await this.logging.logServerOperation(
        0, // Use 0 to indicate all servers
        'stop-all-and-exit',
        false,
        error.message
      );

      return {
        success: false,
        error: error.message || 'Unknown error occurred while stopping servers',
        stoppedCount: 0,
        failedCount: servers ? servers.length : 0,
        excludedCount: 0,
        results: {}
      };
    }
  }

  /**
   * Get process information including children processes
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process information
   */
  async getProcessTree(pid) {
    return await this.processUtils.getProcessTree(pid);
  }

  /**
   * Check if a process is a development server
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} True if it's a development server
   */
  async isDevelopmentServer(pid) {
    return await this.processUtils.isDevelopmentServer(pid);
  }

  /**
   * Get system resource usage for a process
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Resource usage information
   */
  async getProcessResources(pid) {
    return await this.processUtils.getProcessResources(pid);
  }

  /**
   * Restart a server by stopping and then restarting it with the same command
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object with success status
   */
  async restartServer(pid) {
    try {
      // Log the operation
      await this.logging.logServerOperation(pid, 'restart', true, 'Attempting to restart server');

      const result = await this.terminationStrategies.restartServer(pid, this.dependencies);

      // Log the result
      await this.logging.logServerOperation(
        pid,
        'restart',
        result.success,
        result.success ? `Server restarted successfully. New PID: ${result.newPid}` : result.error
      );

      return result;

    } catch (error) {
      log.error(`Error restarting server with PID ${pid}:`, error);
      await this.logging.logServerOperation(pid, 'restart', false, error.message);

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
    return await this.terminationStrategies.startServer(commandLine, workingDir, this.dependencies);
  }

  /**
   * Get the working directory of a process
   * @param {number} pid - Process ID
   * @returns {Promise<string>} Working directory
   */
  async getProcessWorkingDirectory(pid) {
    return await this.processUtils.getProcessWorkingDirectory(pid);
  }

  /**
   * Get error logs for a specific server
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Error logs information
   */
  async getServerErrorLogs(pid) {
    return await this.logging.getServerErrorLogs(pid);
  }

  /**
   * Log an error for a specific server
   * @param {number} pid - Process ID
   * @param {string} message - Error message
   * @param {string} level - Log level (error, warn, info)
   */
  async logServerError(pid, message, level = 'error') {
    await this.logging.logServerError(pid, message, level);
  }

  /**
   * Clear error logs for a specific server
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async clearServerErrorLogs(pid) {
    return await this.logging.clearServerErrorLogs(pid);
  }

  /**
   * Monitor a server for errors and log them
   * @param {number} pid - Process ID
   * @param {string} serverName - Server name for logging
   */
  async monitorServerErrors(pid, serverName) {
    await this.logging.monitorServerErrors(pid, serverName, this.processUtils);
  }

  /**
   * Check if a process is the main Electron application process
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} True if this is the main process
   */
  async isMainProcess(pid) {
    return await this.processUtils.isMainProcess(pid);
  }

  /**
   * Sanitize sensitive information from process command line
   * @param {string} commandLine - Original command line
   * @returns {string} Sanitized command line
   */
  sanitizeCommandLine(commandLine) {
    return this.processUtils.sanitizeCommandLine(commandLine);
  }

  /**
   * Get process details for a specific PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process details
   */
  async getProcessDetails(pid) {
    return await this.processUtils.getProcessDetails(pid);
  }

  /**
   * Get server operation history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>} Operation history
   */
  async getOperationHistory(limit = 100) {
    return await this.logging.getOperationHistory(limit);
  }

  /**
   * Get all server error logs summary
   * @returns {Promise<Object>} Summary of all error logs
   */
  async getAllErrorLogsSummary() {
    return await this.logging.getAllErrorLogsSummary();
  }

  /**
   * Clean up old log files
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldLogs(daysToKeep = 30) {
    return await this.logging.cleanupOldLogs(daysToKeep);
  }

  /**
   * Export logs to a single file
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Export result
   */
  async exportLogs(outputPath) {
    return await this.logging.exportLogs(outputPath);
  }

  /**
   * Get process memory usage details
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Memory usage details
   */
  async getProcessMemoryInfo(pid) {
    return await this.processUtils.getProcessMemoryInfo(pid);
  }

  /**
   * Get process environment variables
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Environment variables
   */
  async getProcessEnvironment(pid) {
    return await this.processUtils.getProcessEnvironment(pid);
  }

  /**
   * Sleep helper function (delegated to termination strategies)
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return this.terminationStrategies.sleep(ms);
  }

  /**
   * Check if a server is critical and should NOT be stopped automatically
   * @param {string} processInfo - Process information string
   * @returns {boolean} True if this is a critical server
   */
  isCriticalServer(processInfo) {
    if (!processInfo) return false;

    const info = processInfo.toLowerCase();

    // Critical server patterns that should NEVER be stopped
    const criticalPatterns = [
      // Database servers
      /postgresql/i,
      /mysql/i,
      /mongodb/i,
      /redis/i,
      /oracle/i,

      // Web servers and proxies
      /apache/i,
      /nginx/i,
      /iis/i,
      /tomcat/i,
      /jetty/i,
      /haproxy/i,

      // System services
      /systemd/i,
      /service/i,
      /daemon/i,

      // Security applications
      /antivirus/i,
      /security/i,
      /firewall/i,

      // Production indicators
      /production/i,
      /prod/i,
      /cluster/i,
      /master.*process/i,
      /worker.*process/i,

      // Backup and monitoring
      /backup/i,
      /monitor/i,
      /log.*agent/i,

      // PM2 process management
      /pm2/i,
      /forever/i,

      // Mail servers
      /mail/i,
      /smtp/i,
      /postfix/i,

      // Other system processes
      /windows/i,
      /system32/i,
      /program files/i
    ];

    // Check for critical patterns
    for (const pattern of criticalPatterns) {
      if (pattern.test(info)) {
        return true;
      }
    }

    return false;
  }
}

module.exports = ProcessManager;