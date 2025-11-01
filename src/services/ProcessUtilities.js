/**
 * Process Utilities Module for ProcessManager
 * Handles process information retrieval and utilities
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const log = require('electron-log');
const path = require('path');

const execAsync = promisify(exec);

class ProcessUtilities {
  constructor() {
    // Configuration
  }

  /**
   * Get detailed process information
   * @param {number} pid - Process ID
   * @returns {Promise<string>} Process information string
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
      // Try multiple methods to verify process existence
      const methods = [
        `tasklist /fi "PID eq ${pid}" /fo csv /nh`,
        `wmic process where "ProcessId=${pid}" get ProcessId /format:list`,
        `powershell -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue"`
      ];

      for (const method of methods) {
        try {
          const { stdout } = await execAsync(method);
          if (stdout.trim().length > 0 && !stdout.toLowerCase().includes('no task')) {
            return true;
          }
        } catch (methodError) {
          continue; // Try next method
        }
      }

      return false;
    } catch (error) {
      return false;
    }
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
   * Check if a process is the main Electron application process
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} True if this is the main process
   */
  async isMainProcess(pid) {
    try {
      // Get our own process ID
      const currentPid = process.pid;

      // Check if the PID is our own process
      if (pid === currentPid) {
        return true;
      }

      // Get process command line to check if it's our main app
      const processInfo = await this.getProcessInfo(pid);
      if (!processInfo) {
        return false;
      }

      // Check for indicators that this is our main Electron process
      const isElectronMain = processInfo.toLowerCase().includes('electron.exe') &&
                           processInfo.toLowerCase().includes('main.js');

      // Also check parent processes to prevent killing parent of our app
      const { stdout } = await execAsync(`wmic process where ProcessId=${currentPid} get ParentProcessId /format:csv`);
      const parentPid = parseInt(stdout.split(',')[1]);

      return isElectronMain || pid === parentPid;

    } catch (error) {
      log.error(`Error checking if PID ${pid} is main process:`, error);
      return false; // Default to false for safety
    }
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
   * Sanitize sensitive information from process command line
   * @param {string} commandLine - Original command line
   * @returns {string} Sanitized command line
   */
  sanitizeCommandLine(commandLine) {
    if (!commandLine) return '';

    let sanitized = commandLine;

    // Remove sensitive information like passwords, tokens, keys
    const sensitivePatterns = [
      /password=[^\s]+/gi,
      /token=[^\s]+/gi,
      /key=[^\s]+/gi,
      /secret=[^\s]+/gi,
      /auth=[^\s]+/gi,
      /credential=[^\s]+/gi
    ];

    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, match => {
        const key = match.split('=')[0];
        return `${key}=***REDACTED***`;
      });
    });

    return sanitized;
  }

  /**
   * Validate PID format
   * @param {number} pid - Process ID to validate
   * @returns {boolean} True if valid PID
   */
  isValidPid(pid) {
    return typeof pid === 'number' &&
           pid > 0 &&
           pid <= 4294967295 && // Max 32-bit PID
           Number.isInteger(pid);
  }

  /**
   * Check if a process is a Windows system process (ABSOLUTELY PROHIBITED)
   * @param {number} pid - Process ID to check
   * @returns {Promise<boolean>} True if this is a system process
   */
  async isSystemProcess(pid) {
    try {
      // Method 1: Check against known system process list
      const { stdout } = await this.getProcessCommandLine(pid);
      if (!stdout) return false;

      const commandLine = stdout.toLowerCase();
      const processName = stdout.split(/[,\s]+/)[0]?.split('=')[1]?.trim() || '';

      // Windows system processes that should NEVER be terminated
      const criticalSystemProcesses = [
        'services.exe',
        'wininit.exe',
        'csrss.exe',
        'dwm.exe',
        'winlogon.exe',
        'explorer.exe',
        'taskmgr.exe',
        'lsm.exe',
        'smss.exe',
        'winlogon.exe',
        'wmiprvse.exe',
        'win32k.sys',
        'kernel32.dll',
        'user32.dll',
        'ntdll.dll',
        'svchost.exe',
        'conhost.exe',
        'lsass.exe',
        'spoolsv.exe',
        'powershell.exe',
        'cmd.exe'
      ];

      // Check if process name matches critical system processes
      for (const sysProc of criticalSystemProcesses) {
        if (processName.includes(sysProc.toLowerCase())) {
          return true;
        }
      }

      // Method 2: Check for system indicators in command line
      const systemIndicators = [
        'system32',
        'windows',
        'systemroot',
        'windir',
        'c:\\windows\\',
        'c:\\program files\\',
        '\\system32\\',
        'system directory',
        'microsoft',
        'windows defender',
        'security',
        'antivirus'
      ];

      for (const indicator of systemIndicators) {
        if (commandLine.includes(indicator.toLowerCase())) {
          return true;
        }
      }

      return false;
    } catch (error) {
      log.warn('Error checking if process is system process:', error);
      return false;
    }
  }

  /**
   * Safe parseInt for PID values
   * @param {string|number} value - Value to parse
   * @returns {number|null} Parsed PID or null
   */
  safeParsePid(value) {
    try {
      const pid = parseInt(value, 10);
      return this.isValidPid(pid) ? pid : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get process environment variables
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Environment variables
   */
  async getProcessEnvironment(pid) {
    try {
      // This is a more complex operation that may require additional tools
      // For now, return basic info
      const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get CommandLine /format:csv`);
      return { commandLine: stdout };
    } catch (error) {
      log.error(`Error getting process environment for PID ${pid}:`, error);
      return {};
    }
  }

  /**
   * Get process memory usage details
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Memory usage details
   */
  async getProcessMemoryInfo(pid) {
    try {
      const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get WorkingSetSize,PageFileUsage,VirtualSize /format:csv`);

      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length < 2) return null;

      const parts = lines[1].split(',');

      return {
        workingSetSize: parts[1] ? parseInt(parts[1]) / 1024 / 1024 : 0, // MB
        pageFileUsage: parts[2] ? parseInt(parts[2]) / 1024 / 1024 : 0, // MB
        virtualSize: parts[3] ? parseInt(parts[3]) / 1024 / 1024 : 0 // MB
      };

    } catch (error) {
      log.error(`Error getting memory info for PID ${pid}:`, error);
      return null;
    }
  }
}

module.exports = ProcessUtilities;