/**
 * Network Utilities Module for ServerDetector
 * Handles network-related operations and process information retrieval
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const log = require('electron-log');

const execAsync = promisify(exec);

class NetworkUtilities {
  constructor() {
    // Initialize network utilities
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
   * Get detailed process information for a specific PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Detailed process information
   */
  async getDetailedProcessInfo(pid) {
    try {
      const { stdout } = await execAsync(`wmic process where "ProcessId=${pid}" get Name,CommandLine,ExecutablePath,PageFileUsage,WorkingSetSize /format:list`);

      const info = {};
      const lines = stdout.split('\n').filter(line => line.trim());

      lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          info[key.trim()] = valueParts.join('=').trim();
        }
      });

      return info;

    } catch (error) {
      log.error(`Error getting detailed process info for PID ${pid}:`, error);
      return {};
    }
  }

  /**
   * Check if a specific port is in use
   * @param {number} port - Port number to check
   * @returns {Promise<boolean>} True if port is in use
   */
  async isPortInUse(port) {
    try {
      const connections = await this.getNetworkConnections();
      return connections.some(conn => conn.port === port);
    } catch (error) {
      log.error(`Error checking if port ${port} is in use:`, error);
      return false;
    }
  }

  /**
   * Get all processes using a specific port
   * @param {number} port - Port number
   * @returns {Promise<Array>} Array of processes using the port
   */
  async getProcessesByPort(port) {
    try {
      const [processes, connections] = await Promise.all([
        this.getRunningProcesses(),
        this.getNetworkConnections()
      ]);

      const portConnections = connections.filter(conn => conn.port === port);
      const pidToProcess = {};
      processes.forEach(process => {
        pidToProcess[process.pid] = process;
      });

      return portConnections.map(conn => ({
        ...pidToProcess[conn.pid],
        ...conn
      }));

    } catch (error) {
      log.error(`Error getting processes for port ${port}:`, error);
      return [];
    }
  }

  /**
   * Get all listening ports with process information
   * @returns {Promise<Array>} Array of listening ports with process info
   */
  async getListeningPorts() {
    try {
      const [processes, connections] = await Promise.all([
        this.getRunningProcesses(),
        this.getNetworkConnections()
      ]);

      const pidToProcess = {};
      processes.forEach(process => {
        pidToProcess[process.pid] = process;
      });

      return connections
        .filter(conn => conn.state === 'LISTENING')
        .map(conn => ({
          port: conn.port,
          protocol: conn.protocol,
          localAddress: conn.localAddress,
          process: pidToProcess[conn.pid] || null
        }));

    } catch (error) {
      log.error('Error getting listening ports:', error);
      return [];
    }
  }

  /**
   * Test network connectivity to a specific port
   * @param {string} host - Host address
   * @param {number} port - Port number
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection(host, port, timeout = 5000) {
    try {
      const net = require('net');

      return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        const timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            socket.destroy();
            resolve(false);
          }
        }, timeout);

        socket.on('connect', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            socket.destroy();
            resolve(true);
          }
        });

        socket.on('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve(false);
          }
        });

        socket.connect(port, host);
      });

    } catch (error) {
      log.error(`Error testing connection to ${host}:${port}:`, error);
      return false;
    }
  }

  /**
   * Get network interface information
   * @returns {Promise<Array>} Array of network interfaces
   */
  async getNetworkInterfaces() {
    try {
      const { stdout } = await execAsync('ipconfig /all');
      return this.parseIpConfigOutput(stdout);
    } catch (error) {
      log.error('Error getting network interfaces:', error);
      return [];
    }
  }

  /**
   * Parse ipconfig output
   * @param {string} output - Raw ipconfig output
   * @returns {Array} Array of interface information
   */
  parseIpConfigOutput(output) {
    const interfaces = [];
    let currentInterface = null;

    const lines = output.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Start of new interface
      if (trimmedLine && !trimmedLine.startsWith(' ') && !line.startsWith(' ')) {
        if (currentInterface) {
          interfaces.push(currentInterface);
        }
        currentInterface = {
          name: trimmedLine,
          ipv4: [],
          ipv6: [],
          mac: null,
          dns: []
        };
      }

      if (!currentInterface) continue;

      // IPv4 Address
      if (trimmedLine.includes('IPv4 Address')) {
        const match = trimmedLine.match(/IPv4 Address[^\d]+([\d.]+)/);
        if (match) {
          currentInterface.ipv4.push(match[1]);
        }
      }

      // IPv6 Address
      if (trimmedLine.includes('IPv6 Address')) {
        const match = trimmedLine.match(/IPv6 Address[^\d:]+([:\dabcdef]+)/i);
        if (match) {
          currentInterface.ipv6.push(match[1]);
        }
      }

      // Physical Address (MAC)
      if (trimmedLine.includes('Physical Address')) {
        const match = trimmedLine.match(/Physical Address[^\dA-Fa-f]+([0-9A-Fa-f-]+)/);
        if (match) {
          currentInterface.mac = match[1].replace(/-/g, ':');
        }
      }

      // DNS Servers
      if (trimmedLine.includes('DNS Servers')) {
        const match = trimmedLine.match(/DNS Servers[^\d.]+([\d.]+)/);
        if (match) {
          currentInterface.dns.push(match[1]);
        }
      }
    }

    // Add the last interface
    if (currentInterface) {
      interfaces.push(currentInterface);
    }

    return interfaces;
  }

  /**
   * Execute async command (utility method)
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} Command result
   */
  async execAsync(command) {
    return await execAsync(command);
  }

  /**
   * Get system network statistics
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats() {
    try {
      const [listeningPorts, interfaces] = await Promise.all([
        this.getListeningPorts(),
        this.getNetworkInterfaces()
      ]);

      return {
        totalListeningPorts: listeningPorts.length,
        networkInterfaces: interfaces.length,
        portsByProtocol: this.groupPortsByProtocol(listeningPorts),
        portDistribution: this.getPortDistribution(listeningPorts)
      };

    } catch (error) {
      log.error('Error getting network stats:', error);
      return {
        totalListeningPorts: 0,
        networkInterfaces: 0,
        portsByProtocol: {},
        portDistribution: {}
      };
    }
  }

  /**
   * Group ports by protocol
   * @param {Array} ports - Array of port information
   * @returns {Object} Ports grouped by protocol
   */
  groupPortsByProtocol(ports) {
    const grouped = {};
    ports.forEach(port => {
      const protocol = port.protocol || 'unknown';
      if (!grouped[protocol]) {
        grouped[protocol] = [];
      }
      grouped[protocol].push(port);
    });
    return grouped;
  }

  /**
   * Get port distribution ranges
   * @param {Array} ports - Array of port information
   * @returns {Object} Port distribution by ranges
   */
  getPortDistribution(ports) {
    const ranges = {
      'System (0-1023)': 0,
      'User (1024-49151)': 0,
      'Dynamic (49152-65535)': 0
    };

    ports.forEach(port => {
      const portNum = port.port;
      if (portNum <= 1023) {
        ranges['System (0-1023)']++;
      } else if (portNum <= 49151) {
        ranges['User (1024-49151)']++;
      } else {
        ranges['Dynamic (49152-65535)']++;
      }
    });

    return ranges;
  }
}

module.exports = NetworkUtilities;