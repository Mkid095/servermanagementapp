/**
 * Detection Logic Module for ServerDetector
 * Handles the core server detection logic and coordination
 */

const log = require('electron-log');

class DetectionLogic {
  constructor(networkUtils, processClassifier) {
    this.networkUtils = networkUtils;
    this.processClassifier = processClassifier;
    this.cachedServers = [];
    this.lastCheckTime = 0;
    this.cacheDuration = 3000; // 3 seconds cache
  }

  /**
   * Detect all running development servers
   * @returns {Promise<Array>} Array of server objects
   */
  async detectServers() {
    const now = Date.now();

    // Return cached results if cache is still valid
    if (this.cachedServers.length > 0 && (now - this.lastCheckTime) < this.cacheDuration) {
      return this.cachedServers;
    }

    try {
      // Get all processes and network connections
      const [processes, connections] = await Promise.all([
        this.networkUtils.getRunningProcesses(),
        this.networkUtils.getNetworkConnections()
      ]);

      // Map port to process information
      const portToProcess = this.networkUtils.mapPortToProcess(connections, processes);

      // Identify development servers
      const servers = this.identifyDevelopmentServers(processes, portToProcess);

      // Update cache
      this.cachedServers = servers;
      this.lastCheckTime = now;

      log.info(`Detected ${servers.length} development servers`);
      return servers;

    } catch (error) {
      log.error('Error detecting servers:', error);
      // Return cached servers if available, otherwise empty array
      return this.cachedServers.length > 0 ? this.cachedServers : [];
    }
  }

  /**
   * Identify development servers from processes and port mappings
   * @param {Array} processes - All running processes
   * @param {Object} portToProcess - Port to process mapping
   * @returns {Array} Array of development server objects
   */
  identifyDevelopmentServers(processes, portToProcess) {
    const servers = [];
    const processedPids = new Set();

    // Check processes with open ports first
    Object.values(portToProcess).forEach(processInfo => {
      if (processedPids.has(processInfo.pid)) return;

      const server = this.processClassifier.classifyServer(processInfo);
      if (server) {
        servers.push(server);
        processedPids.add(processInfo.pid);
      }
    });

    // Check other processes that might be development servers
    processes.forEach(process => {
      if (processedPids.has(process.pid)) return;

      const server = this.processClassifier.classifyServer(process);
      if (server) {
        servers.push(server);
        processedPids.add(process.pid);
      }
    });

    return servers;
  }

  /**
   * Get process details for a specific PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process details
   */
  async getProcessDetails(pid) {
    try {
      const { stdout } = await this.networkUtils.execAsync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`);
      const processes = this.networkUtils.parseTasklistOutput(stdout);
      return processes[0] || null;
    } catch (error) {
      log.error(`Error getting process details for PID ${pid}:`, error);
      return null;
    }
  }

  /**
   * Clear the server cache
   */
  clearCache() {
    this.cachedServers = [];
    this.lastCheckTime = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const cacheAge = this.lastCheckTime ? now - this.lastCheckTime : 0;
    const isCacheValid = this.cachedServers.length > 0 && cacheAge < this.cacheDuration;

    return {
      cachedServers: this.cachedServers.length,
      lastCheckTime: this.lastCheckTime,
      cacheAge: cacheAge,
      isCacheValid: isCacheValid,
      cacheDuration: this.cacheDuration
    };
  }

  /**
   * Force refresh server detection
   * @returns {Promise<Array>} Array of server objects
   */
  async forceRefresh() {
    this.clearCache();
    return await this.detectServers();
  }

  /**
   * Update cache duration
   * @param {number} duration - New cache duration in milliseconds
   */
  updateCacheDuration(duration) {
    if (duration > 0) {
      this.cacheDuration = duration;
      log.info(`Updated server detection cache duration to ${duration}ms`);
    }
  }

  /**
   * Get server by PID from cache
   * @param {number} pid - Process ID
   * @returns {Object|null} Server object or null
   */
  getServerByPid(pid) {
    return this.cachedServers.find(server => server.pid === pid) || null;
  }

  /**
   * Get servers by type from cache
   * @param {string} type - Server type
   * @returns {Array} Array of server objects
   */
  getServersByType(type) {
    return this.cachedServers.filter(server => server.type === type);
  }

  /**
   * Get servers by port from cache
   * @param {number} port - Port number
   * @returns {Array} Array of server objects
   */
  getServersByPort(port) {
    return this.cachedServers.filter(server => server.port === port.toString());
  }

  /**
   * Get server statistics from cache
   * @returns {Object} Server statistics
   */
  getServerStats() {
    const stats = {
      total: this.cachedServers.length,
      byType: {},
      byPort: {},
      byCategory: {}
    };

    this.cachedServers.forEach(server => {
      // Count by type
      stats.byType[server.type] = (stats.byType[server.type] || 0) + 1;

      // Count by port
      stats.byPort[server.port] = (stats.byPort[server.port] || 0) + 1;

      // Count by category
      const category = server.category || 'Other';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Validate server object structure
   * @param {Object} server - Server object to validate
   * @returns {boolean} True if valid
   */
  validateServer(server) {
    const requiredFields = ['pid', 'name', 'type'];
    const optionalFields = ['port', 'url', 'command', 'path', 'startTime', 'category'];

    // Check required fields
    for (const field of requiredFields) {
      if (!server[field]) {
        log.warn(`Server missing required field: ${field}`, server);
        return false;
      }
    }

    // Validate PID
    if (typeof server.pid !== 'number' || server.pid <= 0) {
      log.warn(`Server has invalid PID: ${server.pid}`, server);
      return false;
    }

    // Validate optional fields if present
    for (const field of optionalFields) {
      if (server[field] !== undefined && server[field] !== null) {
        // Add specific validation for certain fields
        if (field === 'port' && server.port !== 'Unknown') {
          const portNum = parseInt(server.port);
          if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
            log.warn(`Server has invalid port: ${server.port}`, server);
            return false;
          }
        }

        if (field === 'url' && server.url) {
          try {
            new URL(server.url);
          } catch {
            log.warn(`Server has invalid URL: ${server.url}`, server);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Filter and validate servers
   * @param {Array} servers - Array of server objects
   * @returns {Array} Filtered and validated servers
   */
  filterValidServers(servers) {
    const validServers = servers.filter(server => this.validateServer(server));

    if (validServers.length !== servers.length) {
      log.warn(`Filtered out ${servers.length - validServers.length} invalid servers`);
    }

    return validServers;
  }
}

module.exports = DetectionLogic;