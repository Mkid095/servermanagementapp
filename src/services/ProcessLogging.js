/**
 * Process Logging Module for ProcessManager
 * Enhanced with proper error handling, file locking, and log rotation
 */

const fs = require('fs').promises;
const path = require('path');
const log = require('electron-log');

class ProcessLogging {
  constructor(errorLogsDir) {
    this.errorLogsDir = errorLogsDir;
    this.maxLogFileSize = 10 * 1024 * 1024; // 10MB max per log file
    this.maxLogEntries = 1000; // Maximum entries per log file
    this.fileHandles = new Map(); // File handle management
    this.initErrorLogs();
  }

  /**
   * Initialize error logs directory with enhanced error handling
   */
  async initErrorLogs() {
    try {
      await fs.mkdir(this.errorLogsDir, { recursive: true });
      log.info(`Error logs directory initialized: ${this.errorLogsDir}`);
    } catch (error) {
      log.error('Failed to create error logs directory:', error);
      // Try to fall back to temp directory
      try {
        const fallbackDir = path.join(require('os').tmpdir(), 'server-manager-logs');
        await fs.mkdir(fallbackDir, { recursive: true });
        this.errorLogsDir = fallbackDir;
        log.info(`Using fallback logs directory: ${fallbackDir}`);
      } catch (fallbackError) {
        // Last resort - use app directory
        this.errorLogsDir = path.join(process.cwd(), 'logs');
        log.warn('All directory creation failed, using current directory');
      }
    }
  }

  /**
   * Get or create file handle with proper locking
   * @param {string} filePath - Path to the log file
   * @returns {Promise<Object>} File handle and info
   */
  async getFileHandle(filePath) {
    try {
      // Check if file already has a handle
      if (this.fileHandles.has(filePath)) {
        return this.fileHandles.get(filePath);
      }

      // Check if file exists and get its stats
      let fileStats;
      try {
        fileStats = await fs.stat(filePath);
      } catch (statError) {
        // File doesn't exist, will be created
        fileStats = { size: 0 };
      }

      // Check if we need to rotate the file
      if (fileStats.size > this.maxLogFileSize) {
        await this.rotateLogFile(filePath);
      }

      // Open file with append mode (creates if doesn't exist)
      const fileHandle = await fs.open(filePath, 'a');
      this.fileHandles.set(filePath, fileHandle);

      return {
        handle: fileHandle,
        isNew: fileStats.size === 0,
        filePath: filePath
      };
    } catch (error) {
      log.error(`Error getting file handle for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Rotate log file when it gets too large
   * @param {string} filePath - Path to the log file to rotate
   */
  async rotateLogFile(filePath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = filePath.replace('.log', `_${timestamp}.log`);

      // Copy current log to backup
      await fs.copyFile(filePath, backupPath);
      log.info(`Log file rotated: ${backupPath}`);

      // Create new empty log file
      await fs.writeFile(filePath, '');

    } catch (error) {
      log.error(`Error rotating log file ${filePath}:`, error);
    }
  }

  /**
   * Close file handle properly
   * @param {string} filePath - Path to the log file
   */
  async closeFileHandle(filePath) {
    try {
      if (this.fileHandles.has(filePath)) {
        const { handle } = this.fileHandles.get(filePath);
        if (handle) {
          await handle.close();
        }
        this.fileHandles.delete(filePath);
      }
    } catch (error) {
      log.error(`Error closing file handle for ${filePath}:`, error);
    }
  }

  /**
   * Parse log entry safely with error handling
   * @param {string} line - Log line to parse
   * @param {string} filePath - Path to the log file (for context)
   * @returns {Object|null} Parsed log entry or null
   */
  parseLogEntry(line, filePath) {
    try {
      // Skip empty lines and whitespace-only lines
      if (!line || !line.trim()) {
        return null;
      }

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            isStructured: true,
            rawLine: line
          };
        }
      } catch (jsonError) {
        // If JSON parsing fails, treat as unstructured log
        log.warn(`Invalid JSON in ${filePath}: ${line.substring(0, 100)}...`);
      }

      // Fallback to unstructured log parsing
      return {
        timestamp: new Date().toISOString(),
        message: line.trim(),
        level: 'info',
        isStructured: false,
        rawLine: line
      };
    } catch (error) {
      log.error(`Error parsing log entry from ${filePath}: ${error.message}`);
      return {
        timestamp: new Date().toISOString(),
        message: line,
        level: 'error',
        isStructured: false,
        rawLine: line,
        parseError: error.message
      };
    }
  }

  /**
   * Get error logs for a specific server with enhanced error handling
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Error logs information
   */
  async getServerErrorLogs(pid) {
    const logFile = path.join(this.errorLogsDir, `server_${pid}_errors.log`);

    try {
      // Check if log file exists
      try {
        await fs.access(logFile);
      } catch (accessError) {
        return {
          success: true,
          logs: [],
          message: 'No error logs found for this server',
          filePath: logFile
        };
      }

      // Read file content directly
      const content = await fs.readFile(logFile, 'utf8');

      if (!content || content.trim().length === 0) {
        return {
          success: true,
          logs: [],
          message: 'Log file is empty',
          filePath: logFile
        };
      }

      // Parse log entries
      const lines = content.split('\n');
      const logs = [];
      let parseErrors = 0;

      for (const line of lines) {
        const entry = this.parseLogEntry(line, logFile);
        if (entry) {
          logs.push(entry);
          if (entry.parseError) {
            parseErrors++;
          }
        }
      }

      if (parseErrors > 0) {
        log.warn(`Encountered ${parseErrors} parsing errors in ${logFile}`);
      }

      // Return last logs (most recent first)
      return {
        success: true,
        logs: logs.slice(-this.maxLogEntries).reverse(),
        totalLogs: logs.length,
        message: `Found ${logs.length} log entries`,
        filePath: logFile
      };

    } catch (error) {
      log.error(`Error accessing log file ${logFile}:`, error);
      return {
        success: false,
        error: error.message,
        filePath: logFile
      };
    }
  }

  /**
   * Enhanced log server error with better formatting and error handling
   * @param {number} pid - Process ID
   * @param {string} message - Error message
   * @param {string} level - Log level (error, warn, info)
   */
  async logServerError(pid, message, level = 'error') {
    const logFile = path.join(this.errorLogsDir, `server_${pid}_errors.log`);

    try {
      // Create enhanced log entry with more context
      const logEntry = {
        timestamp: new Date().toISOString(),
        pid: pid,
        level: level,
        message: message,
        source: 'ServerManager',
        action: 'server_error',
        context: {
          platform: process.platform,
          nodeVersion: process.version,
          electronVersion: process.versions.electron
        }
      };

      // Get file handle and write log entry
      const { handle } = await this.getFileHandle(logFile);

      try {
        await handle.writeFile(JSON.stringify(logEntry) + '\n');

        // Also log to electron-log for immediate visibility
        log[level](`Server PID ${pid}: ${message}`);

      } catch (writeError) {
        log.error(`Error writing to log file ${logFile}:`, writeError);
      }

      // Close file handle
      await this.closeFileHandle(logFile);

    } catch (error) {
      log.error(`Error in logServerError for PID ${pid}:`, error);
    }
  }

  /**
   * Clear error logs for a specific server
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result object
   */
  async clearServerErrorLogs(pid) {
    const logFile = path.join(this.errorLogsDir, `server_${pid}_errors.log`);

    try {
      // Write cleared header to file
      const header = {
        timestamp: new Date().toISOString(),
        message: `Error logs cleared for server PID ${pid}`,
        level: 'info',
        action: 'clear_logs'
      };

      await fs.writeFile(logFile, JSON.stringify(header) + '\n');

      log.info(`Cleared error logs for server PID ${pid}`);

      return {
        success: true,
        message: 'Error logs cleared successfully'
      };

    } catch (error) {
      log.error(`Error clearing logs for PID ${pid}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get server operation history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>} Operation history
   */
  async getOperationHistory(limit = 100) {
    try {
      // Get all log files
      const files = await fs.readdir(this.errorLogsDir);
      const logFiles = files.filter(file => file.endsWith('_errors.log'));

      let allLogs = [];

      for (const file of logFiles) {
        const filePath = path.join(this.errorLogsDir, file);
        const logData = await this.getServerErrorLogs(
          parseInt(file.replace('server_', '').replace('_errors.log', ''))
        );

        if (logData.success) {
          allLogs.push(...(logData.logs || []));
        }
      }

      // Sort by timestamp and limit
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return allLogs.slice(0, limit);

    } catch (error) {
      log.error('Error getting operation history:', error);
      return [];
    }
  }

  /**
   * Get summary of all error logs
   * @returns {Promise<Object>} Summary statistics
   */
  async getAllErrorLogsSummary() {
    try {
      const files = await fs.readdir(this.errorLogsDir);
      const logFiles = files.filter(file => file.endsWith('_errors.log'));

      let totalEntries = 0;
      let totalErrors = 0;
      let totalWarnings = 0;
      let lastEntry = null;

      for (const file of logFiles) {
        const logData = await this.getServerErrorLogs(
          parseInt(file.replace('server_', '').replace('_errors.log', ''))
        );

        if (logData.success) {
          totalEntries += logData.logs.length;

          for (const entry of logData.logs) {
            if (entry.level === 'error') totalErrors++;
            if (entry.level === 'warn') totalWarnings++;

            if (!lastEntry || new Date(entry.timestamp) > new Date(lastEntry.timestamp)) {
              lastEntry = entry;
            }
          }
        }
      }

      return {
        totalLogFiles: logFiles.length,
        totalEntries,
        totalErrors,
        totalWarnings,
        lastEntry
      };

    } catch (error) {
      log.error('Error getting error logs summary:', error);
      return {
        totalLogFiles: 0,
        totalEntries: 0,
        totalErrors: 0,
        totalWarnings: 0,
        lastEntry: null
      };
    }
  }

  /**
   * Clean up old log files
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      const files = await fs.readdir(this.errorLogsDir);
      const logFiles = files.filter(file => file.endsWith('_errors.log'));

      const cutoffTime = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
      let deletedCount = 0;

      for (const file of logFiles) {
        const filePath = path.join(this.errorLogsDir, file);

        try {
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filePath);
            deletedCount++;
            log.info(`Deleted old log file: ${file}`);
          }
        } catch (fileError) {
          log.warn(`Could not process log file ${file}:`, fileError.message);
        }
      }

      return {
        success: true,
        deletedFiles: deletedCount,
        message: `Cleaned up ${deletedCount} old log files`
      };

    } catch (error) {
      log.error('Error cleaning up old logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export logs to a single file
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Export result
   */
  async exportLogs(outputPath) {
    try {
      const files = await fs.readdir(this.errorLogsDir);
      const logFiles = files.filter(file => file.endsWith('_errors.log'));

      let allLogs = [];
      let totalEntries = 0;

      for (const file of logFiles) {
        const logData = await this.getServerErrorLogs(
          parseInt(file.replace('server_', '').replace('_errors.log', ''))
        );

        if (logData.success) {
          allLogs.push(...(logData.logs || []));
          totalEntries += logData.logs.length;
        }
      }

      // Sort by timestamp
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const exportData = {
        exportDate: new Date().toISOString(),
        totalServers: logFiles.length,
        totalEntries,
        logs: allLogs
      };

      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));

      return {
        success: true,
        message: `Exported ${totalEntries} log entries from ${logFiles.length} servers`,
        outputPath
      };

    } catch (error) {
      log.error('Error exporting logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ProcessLogging;