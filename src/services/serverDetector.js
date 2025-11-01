/**
 * Server Detector Service
 * Main coordinator for server detection operations
 * Refactored to use modular components
 */

const DetectionLogic = require('./DetectionLogic');
const ProcessClassifier = require('./ProcessClassifier');
const NetworkUtilities = require('./NetworkUtilities');

class ServerDetector {
  constructor() {
    // Initialize modules
    this.networkUtils = new NetworkUtilities();
    this.processClassifier = new ProcessClassifier();
    this.detectionLogic = new DetectionLogic(this.networkUtils, this.processClassifier);
  }

  /**
   * Detect all running development servers
   * @returns {Promise<Array>} Array of server objects
   */
  async detectServers() {
    return await this.detectionLogic.detectServers();
  }

  /**
   * Get process details for a specific PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process details
   */
  async getProcessDetails(pid) {
    return await this.detectionLogic.getProcessDetails(pid);
  }

  /**
   * Clear the server cache
   */
  clearCache() {
    this.detectionLogic.clearCache();
  }

  /**
   * Force refresh server detection
   * @returns {Promise<Array>} Array of server objects
   */
  async forceRefresh() {
    return await this.detectionLogic.forceRefresh();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.detectionLogic.getCacheStats();
  }

  /**
   * Update cache duration
   * @param {number} duration - New cache duration in milliseconds
   */
  updateCacheDuration(duration) {
    this.detectionLogic.updateCacheDuration(duration);
  }

  /**
   * Get server by PID from cache
   * @param {number} pid - Process ID
   * @returns {Object|null} Server object or null
   */
  getServerByPid(pid) {
    return this.detectionLogic.getServerByPid(pid);
  }

  /**
   * Get servers by type from cache
   * @param {string} type - Server type
   * @returns {Array} Array of server objects
   */
  getServersByType(type) {
    return this.detectionLogic.getServersByType(type);
  }

  /**
   * Get servers by port from cache
   * @param {number} port - Port number
   * @returns {Array} Array of server objects
   */
  getServersByPort(port) {
    return this.detectionLogic.getServersByPort(port);
  }

  /**
   * Get server statistics from cache
   * @returns {Object} Server statistics
   */
  getServerStats() {
    return this.detectionLogic.getServerStats();
  }

  /**
   * Enhanced server detection with confidence scoring
   * @returns {Promise<Array>} Array of enhanced server objects
   */
  async detectServersEnhanced() {
    try {
      const [processes, connections] = await Promise.all([
        this.networkUtils.getRunningProcesses(),
        this.networkUtils.getNetworkConnections()
      ]);

      // Map port to process information
      const portToProcess = this.networkUtils.mapPortToProcess(connections, processes);

      // Enhanced classification
      const servers = [];
      const processedPids = new Set();

      // Check processes with open ports first
      Object.values(portToProcess).forEach(processInfo => {
        if (processedPids.has(processInfo.pid)) return;

        const server = this.processClassifier.classifyServerEnhanced(processInfo);
        if (server) {
          servers.push(server);
          processedPids.add(processInfo.pid);
        }
      });

      // Check other processes that might be development servers
      processes.forEach(process => {
        if (processedPids.has(process.pid)) return;

        const server = this.processClassifier.classifyServerEnhanced(process);
        if (server) {
          servers.push(server);
          processedPids.add(process.pid);
        }
      });

      // Validate and filter servers
      const validServers = this.detectionLogic.filterValidServers(servers);

      // Update cache
      this.detectionLogic.cachedServers = validServers;
      this.detectionLogic.lastCheckTime = Date.now();

      return validServers;

    } catch (error) {
      console.error('Error in enhanced server detection:', error);
      // Return cached servers if available, otherwise empty array
      return this.detectionLogic.cachedServers.length > 0 ? this.detectionLogic.cachedServers : [];
    }
  }

  /**
   * Get all running processes (delegated to network utilities)
   * @returns {Promise<Array>} Array of process objects
   */
  async getRunningProcesses() {
    return await this.networkUtils.getRunningProcesses();
  }

  /**
   * Get network connections (delegated to network utilities)
   * @returns {Promise<Array>} Array of connection objects
   */
  async getNetworkConnections() {
    return await this.networkUtils.getNetworkConnections();
  }

  /**
   * Parse tasklist output (delegated to network utilities)
   * @param {string} output - Raw tasklist output
   * @returns {Array} Array of process objects
   */
  parseTasklistOutput(output) {
    return this.networkUtils.parseTasklistOutput(output);
  }

  /**
   * Parse netstat output (delegated to network utilities)
   * @param {string} output - Raw netstat output
   * @returns {Array} Array of connection objects
   */
  parseNetstatOutput(output) {
    return this.networkUtils.parseNetstatOutput(output);
  }

  /**
   * Map ports to process information (delegated to network utilities)
   * @param {Array} connections - Network connections
   * @param {Array} processes - Running processes
   * @returns {Object} Map of port to process info
   */
  mapPortToProcess(connections, processes) {
    return this.networkUtils.mapPortToProcess(connections, processes);
  }

  /**
   * Check if a process is a system process (delegated to process classifier)
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if it's a system process
   */
  isSystemProcess(processInfo) {
    return this.processClassifier.isSystemProcess(processInfo);
  }

  /**
   * Check if a process is our main app process (delegated to process classifier)
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if it's our main app process
   */
  isMainAppProcess(processInfo) {
    return this.processClassifier.isMainAppProcess(processInfo);
  }

  /**
   * Extract port from command line (delegated to process classifier)
   * @param {string} commandLine - Process command line
   * @returns {string|null} Port number or null
   */
  extractPortFromCommand(commandLine) {
    return this.processClassifier.extractPortFromCommand(commandLine);
  }

  /**
   * Check if a port is a web port (delegated to process classifier)
   * @param {number} port - Port number
   * @returns {boolean} True if it's a web port
   */
  isWebPort(port) {
    return this.processClassifier.isWebPort(port);
  }

  /**
   * Get server category (delegated to process classifier)
   * @param {string} type - Server type
   * @returns {string} Category name
   */
  getServerCategory(type) {
    return this.processClassifier.getServerCategory(type);
  }

  /**
   * Classify a server (delegated to process classifier)
   * @param {Object} processInfo - Process information
   * @returns {Object|null} Server object or null
   */
  classifyServer(processInfo) {
    return this.processClassifier.classifyServer(processInfo);
  }

  /**
   * Get detailed process information (delegated to network utilities)
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Detailed process information
   */
  async getDetailedProcessInfo(pid) {
    return await this.networkUtils.getDetailedProcessInfo(pid);
  }

  /**
   * Check if a specific port is in use (delegated to network utilities)
   * @param {number} port - Port number to check
   * @returns {Promise<boolean>} True if port is in use
   */
  async isPortInUse(port) {
    return await this.networkUtils.isPortInUse(port);
  }

  /**
   * Get all processes using a specific port (delegated to network utilities)
   * @param {number} port - Port number
   * @returns {Promise<Array>} Array of processes using the port
   */
  async getProcessesByPort(port) {
    return await this.networkUtils.getProcessesByPort(port);
  }

  /**
   * Get all listening ports (delegated to network utilities)
   * @returns {Promise<Array>} Array of listening ports with process info
   */
  async getListeningPorts() {
    return await this.networkUtils.getListeningPorts();
  }

  /**
   * Test network connection (delegated to network utilities)
   * @param {string} host - Host address
   * @param {number} port - Port number
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection(host, port, timeout = 5000) {
    return await this.networkUtils.testConnection(host, port, timeout);
  }

  /**
   * Get network interfaces (delegated to network utilities)
   * @returns {Promise<Array>} Array of network interfaces
   */
  async getNetworkInterfaces() {
    return await this.networkUtils.getNetworkInterfaces();
  }

  /**
   * Get network statistics (delegated to network utilities)
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats() {
    return await this.networkUtils.getNetworkStats();
  }

  /**
   * Identify development servers (delegated to detection logic)
   * @param {Array} processes - All running processes
   * @param {Object} portToProcess - Port to process mapping
   * @returns {Array} Array of development server objects
   */
  identifyDevelopmentServers(processes, portToProcess) {
    return this.detectionLogic.identifyDevelopmentServers(processes, portToProcess);
  }
}

module.exports = ServerDetector;