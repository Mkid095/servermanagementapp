const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const log = require('electron-log');
const appConfig = require('../config/appConfig');

const execAsync = promisify(exec);

class ServerDetector {
  constructor() {
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
        this.getRunningProcesses(),
        this.getNetworkConnections()
      ]);

      // Map port to process information
      const portToProcess = this.mapPortToProcess(connections, processes);

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
   * Get all running processes using tasklist
   * @returns {Promise<Array>} Array of process objects
   */
  async getRunningProcesses() {
    try {
      // Use tasklist command to get process information
      const { stdout } = await execAsync('tasklist /fo csv /nh');
      
      return this.parseTasklistOutput(stdout);
    } catch (error) {
      log.error('Error getting process list:', error);
      return [];
    }
  }

  /**
   * Get network connections using netstat
   * @returns {Promise<Array>} Array of connection objects
   */
  async getNetworkConnections() {
    try {
      // Use netstat to get listening ports
      const { stdout } = await execAsync('netstat -ano -p tcp');
      
      return this.parseNetstatOutput(stdout);
    } catch (error) {
      log.error('Error getting network connections:', error);
      return [];
    }
  }

  /**
   * Parse tasklist CSV output
   * @param {string} output - Raw tasklist output
   * @returns {Array} Array of process objects
   */
  parseTasklistOutput(output) {
    const processes = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        // Parse CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
        const parts = line.match(/"([^"]*)"/g);
        if (parts && parts.length >= 2) {
          const imageName = parts[0].replace(/"/g, '');
          const pid = parseInt(parts[1].replace(/"/g, ''), 10);
          
          if (!isNaN(pid) && imageName) {
            processes.push({
              pid,
              name: imageName,
              command: imageName
            });
          }
        }
      } catch (error) {
        log.warn('Error parsing process line:', line, error);
      }
    }

    return processes;
  }

  /**
   * Parse netstat output
   * @param {string} output - Raw netstat output
   * @returns {Array} Array of connection objects
   */
  parseNetstatOutput(output) {
    const connections = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        // Skip header lines and empty lines
        if (line.includes('Proto') || line.includes('Local Address') || line.trim() === '') {
          continue;
        }

        // Parse line: TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1234
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const protocol = parts[0];
          const localAddress = parts[1];
          const state = parts[3];
          const pid = parseInt(parts[4], 10);

          if (protocol === 'TCP' && state === 'LISTENING' && !isNaN(pid)) {
            const portMatch = localAddress.match(/:(\d+)$/);
            if (portMatch) {
              const port = parseInt(portMatch[1], 10);
              connections.push({
                protocol,
                localAddress,
                port,
                state,
                pid
              });
            }
          }
        }
      } catch (error) {
        log.warn('Error parsing connection line:', line, error);
      }
    }

    return connections;
  }

  /**
   * Map ports to process information
   * @param {Array} connections - Network connections
   * @param {Array} processes - Running processes
   * @returns {Object} Map of port to process info
   */
  mapPortToProcess(connections, processes) {
    const portToProcess = {};
    
    // Create PID to process map
    const pidToProcess = {};
    processes.forEach(process => {
      pidToProcess[process.pid] = process;
    });

    // Map each connection to its process
    connections.forEach(connection => {
      if (connection.pid && pidToProcess[connection.pid]) {
        portToProcess[connection.port] = {
          ...pidToProcess[connection.pid],
          port: connection.port,
          protocol: connection.protocol,
          localAddress: connection.localAddress
        };
      }
    });

    return portToProcess;
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

      const server = this.classifyServer(processInfo);
      if (server) {
        servers.push(server);
        processedPids.add(processInfo.pid);
      }
    });

    // Check other processes that might be development servers
    processes.forEach(process => {
      if (processedPids.has(process.pid)) return;

      const server = this.classifyServer(process);
      if (server) {
        servers.push(server);
        processedPids.add(process.pid);
      }
    });

    return servers;
  }

  /**
   * Classify a process as a development server
   * @param {Object} processInfo - Process information
   * @returns {Object|null} Server object or null if not a dev server
   */
  classifyServer(processInfo) {
    const { name, command, port } = processInfo;
    
    // Filter out system processes first
    if (this.isSystemProcess(processInfo)) {
      return null;
    }
    
    // Check if it's a development server based on process name and command
    const patterns = appConfig.processPatterns;
    
    // Node.js processes
    if (name.toLowerCase().includes('node.exe') || name.toLowerCase().includes('node')) {
      let serverType = 'node';
      let serverName = 'Node.js Server';

      // Check for specific Node.js frameworks
      if (command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('react-scripts') || cmd.includes('start')) {
          serverType = 'react';
          serverName = 'React Dev Server';
        } else if (cmd.includes('next')) {
          serverType = 'react';
          serverName = 'Next.js Server';
        } else if (cmd.includes('nuxt')) {
          serverType = 'react';
          serverName = 'Nuxt.js Server';
        } else if (cmd.includes('vite')) {
          serverType = 'react';
          serverName = 'Vite Dev Server';
        } else if (cmd.includes('nodemon') || cmd.includes('ts-node') || cmd.includes('express')) {
          serverType = 'node';
          serverName = 'Express/Node Server';
        }
      }

      const actualPort = port || this.extractPortFromCommand(command);
      const url = actualPort && actualPort !== 'Unknown' ? `http://localhost:${actualPort}` : null;
      
      return {
        pid: processInfo.pid,
        name: serverName,
        type: serverType,
        port: actualPort || 'Unknown',
        url: url,
        command: command || name,
        path: processInfo.path || '',
        startTime: processInfo.startTime || new Date(),
        category: this.getServerCategory(serverType)
      };
    }

    // Python processes
    if (name.toLowerCase().includes('python.exe') || name.toLowerCase().includes('python')) {
      // Check if it's a web server (running on typical web ports)
      if (port && this.isWebPort(port)) {
        const actualPort = port || this.extractPortFromCommand(command);
        const url = actualPort && actualPort !== 'Unknown' ? `http://localhost:${actualPort}` : null;
      
      return {
        pid: processInfo.pid,
        name: 'Python Web Server',
        type: 'python',
        port: actualPort || 'Unknown',
        url: url,
        command: command || name,
        path: processInfo.path || '',
        startTime: processInfo.startTime || new Date(),
        category: this.getServerCategory('python')
      };
      }
    }

    // Other potential development servers
    if (command) {
      const cmd = command.toLowerCase();
      
      // Check for other development server patterns
      if (cmd.includes('http-server') || cmd.includes('serve') || cmd.includes('live-server')) {
        const actualPort = port || this.extractPortFromCommand(command);
        const url = actualPort && actualPort !== 'Unknown' ? `http://localhost:${actualPort}` : null;
      
      return {
        pid: processInfo.pid,
        name: 'Static File Server',
        type: 'static',
        port: actualPort || 'Unknown',
        url: url,
        command: command,
        path: processInfo.path || '',
        startTime: processInfo.startTime || new Date(),
        category: this.getServerCategory('static')
      };
      }
    }

    return null;
  }

  /**
   * Check if a port is a typical web development port
   * @param {number} port - Port number
   * @returns {boolean} True if it's a web port
   */
  isWebPort(port) {
    return appConfig.defaultPorts.includes(port) || 
           (port >= 3000 && port <= 3010) ||  // React/Vue/Next
           (port >= 8000 && port <= 8010) ||  // Django/Flask
           (port >= 5000 && port <= 5010) ||  // Flask/Express
           (port >= 9000 && port <= 9010);   // Additional dev ports
  }

  /**
   * Clear the server cache
   */
  clearCache() {
    this.cachedServers = [];
    this.lastCheckTime = 0;
  }

  /**
   * Get process details for a specific PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process details
   */
  async getProcessDetails(pid) {
    try {
      const { stdout } = await execAsync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`);
      const processes = this.parseTasklistOutput(stdout);
      return processes[0] || null;
    } catch (error) {
      log.error(`Error getting process details for PID ${pid}:`, error);
      return null;
    }
  }

  /**
   * Check if a process is a system process that should be ignored
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if it's a system process
   */
  isSystemProcess(processInfo) {
    const systemProcessNames = [
      'svchost.exe',
      'csrss.exe',
      'wininit.exe',
      'services.exe',
      'lsass.exe',
      'winlogon.exe',
      'explorer.exe',
      'System',
      'System Idle Process',
      'Registry',
      'Memory Compression',
      'dwm.exe',
      'conhost.exe',
      'WmiPrvSE.exe',
      'SearchIndexer.exe',
      'spoolsv.exe',
      'audiodg.exe',
      'dllhost.exe',
      'taskhostw.exe',
      'RuntimeBroker.exe',
      'WindowsExplorer.exe'
    ];

    // Check by process name
    if (systemProcessNames.some(name => 
      processInfo.name.toLowerCase().includes(name.toLowerCase()))) {
      return true;
    }

    // Check by command line patterns
    const systemPatterns = [
      /\\Windows\\System32\\/i,
      /\\Windows\\SysWOW64\\/i,
      /C:\\Windows\\/i,
      /SystemRoot\\/i,
      /\\Microsoft\\/i,
      /\\Windows Defender\\/i,
      /\\Windows Security\\/i
    ];

    if (systemPatterns.some(pattern => pattern.test(processInfo.command || ''))) {
      return true;
    }

    // Check if it's running from Windows directories
    if (processInfo.path && (
      processInfo.path.toLowerCase().includes('\\windows\\system32\\') ||
      processInfo.path.toLowerCase().includes('\\windows\\syswow64\\') ||
      processInfo.path.toLowerCase().includes('\\windows')
    )) {
      return true;
    }

    return false;
  }

  /**
   * Extract port number from command line
   * @param {string} commandLine - Process command line
   * @returns {string|null} Port number or null
   */
  extractPortFromCommand(commandLine) {
    if (!commandLine) return null;

    // Common port patterns
    const portPatterns = [
      /--port\s+(\d+)/i,
      /-p\s+(\d+)/i,
      /-port\s+(\d+)/i,
      /port\s*[:=]\s*(\d+)/i,
      /:(\d+)/i,
      /localhost:(\d+)/i,
      /127\.0\.0\.1:(\d+)/i
    ];

    for (const pattern of portPatterns) {
      const match = commandLine.match(pattern);
      if (match && match[1]) {
        const port = parseInt(match[1]);
        if (port > 0 && port <= 65535) {
          return port.toString();
        }
      }
    }

    return null;
  }

  /**
   * Get server category based on type
   * @param {string} type - Server type
   * @returns {string} Category name
   */
  getServerCategory(type) {
    const categories = {
      'react': 'Frontend Frameworks',
      'node': 'Node.js Applications',
      'python': 'Python Applications',
      'next': 'Frontend Frameworks',
      'nuxt': 'Frontend Frameworks',
      'vite': 'Build Tools',
      'webpack': 'Build Tools',
      'static': 'Static Servers'
    };

    return categories[type] || 'Other Development Servers';
  }
}

module.exports = ServerDetector;