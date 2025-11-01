/**
 * Process Classifier Module for ServerDetector
 * Handles classification of processes as development servers
 */

const appConfig = require('../config/appConfig');
const log = require('electron-log');

class ProcessClassifier {
  constructor() {
    // Initialize classifier with configuration
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
      return this.classifyNodeServer(processInfo);
    }

    // Python processes
    if (name.toLowerCase().includes('python.exe') || name.toLowerCase().includes('python')) {
      return this.classifyPythonServer(processInfo);
    }

    // Other potential development servers
    if (command) {
      return this.classifyOtherServer(processInfo);
    }

    return null;
  }

  /**
   * Classify Node.js server
   * @param {Object} processInfo - Process information
   * @returns {Object|null} Server object or null
   */
  classifyNodeServer(processInfo) {
    const { name, command, port } = processInfo;

    // ABSOLUTE PROTECTION: Never classify system processes as stoppable servers
    if (this.isSystemProcess(processInfo)) {
      return null;
    }

    // Check if this is a critical Node.js process that should NOT be stopped
    if (this.isCriticalNodeProcess(processInfo)) {
      return null; // Don't classify critical Node.js processes as stoppable servers
    }

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
      category: this.getServerCategory(serverType),
      importance: 'development', // Mark as development server
      isSafeToStop: true
    };
  }

  /**
   * Classify Python server
   * @param {Object} processInfo - Process information
   * @returns {Object|null} Server object or null
   */
  classifyPythonServer(processInfo) {
    const { name, command, port } = processInfo;

    // Check if this is a critical/production Python process that should NOT be stopped
    if (this.isCriticalPythonProcess(processInfo)) {
      return null; // Don't classify critical Python processes as stoppable servers
    }

    // Enhanced detection: check if it's any kind of Python development server
    if (this.isPythonDevelopmentServer(processInfo)) {
      const actualPort = port || this.extractPortFromCommand(command);
      const url = actualPort && actualPort !== 'Unknown' ? `http://localhost:${actualPort}` : null;

      return {
        pid: processInfo.pid,
        name: this.getPythonServerName(processInfo),
        type: 'python',
        port: actualPort || 'Unknown',
        url: url,
        command: command || name,
        path: processInfo.path || '',
        startTime: processInfo.startTime || new Date(),
        category: this.getServerCategory('python'),
        importance: 'development', // Mark as development server
        isSafeToStop: true
      };
    }

    return null;
  }

  /**
   * Classify other server types
   * @param {Object} processInfo - Process information
   * @returns {Object|null} Server object or null
   */
  classifyOtherServer(processInfo) {
    const { command, port } = processInfo;

    if (!command) return null;

    const cmd = command.toLowerCase();

    // Check if this is a critical process that should NOT be stopped
    if (this.isCriticalOtherProcess(processInfo)) {
      return null;
    }

    // Check for other development server patterns
    if (cmd.includes('http-server') || cmd.includes('serve') || cmd.includes('live-server') ||
        cmd.includes('webpack') || cmd.includes('parcel') || cmd.includes('rollup')) {
      const actualPort = port || this.extractPortFromCommand(command);
      const url = actualPort && actualPort !== 'Unknown' ? `http://localhost:${actualPort}` : null;

      return {
        pid: processInfo.pid,
        name: this.getOtherServerName(processInfo),
        type: 'static',
        port: actualPort || 'Unknown',
        url: url,
        command: command,
        path: processInfo.path || '',
        startTime: processInfo.startTime || new Date(),
        category: this.getServerCategory('static'),
        importance: 'development', // Mark as development server
        isSafeToStop: true
      };
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

    // Security: Check if it's our own Electron app process
    if (this.isMainAppProcess(processInfo)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a process is our main Electron app process
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if it's our main app process
   */
  isMainAppProcess(processInfo) {
    const command = (processInfo.command || '').toLowerCase();
    const name = (processInfo.name || '').toLowerCase();

    // Check for Electron main process indicators
    const electronMainPatterns = [
      /electron\.exe.*main\.js/i,
      /main\.js/i,
      /servermanagementapp/i,
      /server-manager/i
    ];

    // Check if it's an Electron process running our main.js
    if (name.includes('electron.exe') && electronMainPatterns.some(pattern => pattern.test(command))) {
      return true;
    }

    // Check if it's our own process by PID
    if (processInfo.pid === process.pid) {
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

  /**
   * Check if a Node.js process is critical and should NOT be stopped
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if this is a critical Node.js process
   */
  isCriticalNodeProcess(processInfo) {
    const { command, name, path } = processInfo;
    const cmd = (command || '').toLowerCase();
    const procPath = (path || '').toLowerCase();

    // Critical Node.js applications that should NEVER be stopped
    const criticalPatterns = [
      // Production web servers
      /pm2/i,
      /forever/i,
      /systemd/i,
      /service/i,

      // Database applications
      /mongodb/i,
      /mysql/i,
      /redis/i,

      // Web servers and proxies
      /nginx/i,
      /apache/i,
      /haproxy/i,
      /varnish/i,

      // System services
      /daemon/i,
      /cron/i,
      /backup/i,

      // Security applications
      /antivirus/i,
      /security/i,
      /firewall/i,

      // Production indicators
      /production/i,
      /prod/i,
      /cluster/i,
      /master/i,
      /worker/i
    ];

    // Check command line for critical patterns
    for (const pattern of criticalPatterns) {
      if (pattern.test(cmd)) {
        return true;
      }
    }

    // Check path for critical system directories
    const criticalPaths = [
      '\\windows\\',
      '\\program files\\',
      '\\program files (x86)\\',
      '\\system32\\',
      '/usr/bin/',
      '/usr/sbin/',
      '/etc/',
      '/var/',
      '/opt/'
    ];

    for (const criticalPath of criticalPaths) {
      if (procPath.includes(criticalPath)) {
        return true;
      }
    }

    // Check for critical Node.js applications by name
    const criticalApps = [
      'pm2',
      'systemd',
      'service',
      'nginx',
      'apache',
      'mongodb',
      'redis-server'
    ];

    for (const app of criticalApps) {
      if (cmd.includes(app) || name.toLowerCase().includes(app)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a Python process is critical and should NOT be stopped
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if this is a critical Python process
   */
  isCriticalPythonProcess(processInfo) {
    const { command, name, path } = processInfo;
    const cmd = (command || '').toLowerCase();
    const procPath = (path || '').toLowerCase();

    // Critical Python applications that should NEVER be stopped
    const criticalPatterns = [
      // Database servers
      /postgresql/i,
      /mysql/i,
      /mariadb/i,
      /mongodb/i,
      /redis/i,
      /cassandra/i,

      // Email servers
      /mail/i,
      /smtp/i,
      /postfix/i,
      /sendmail/i,

      // System services
      /systemd/i,
      /service/i,
      /daemon/i,

      // Production applications
      /apache/i,
      /nginx/i,
      /gunicorn/i,
      /uwsgi/i,

      // Security/antivirus
      /antivirus/i,
      /security/i,
      /firewall/i,

      // Backup services
      /backup/i,
      /rsync/i,
      /cron/i
    ];

    // Check command line for critical patterns
    for (const pattern of criticalPatterns) {
      if (pattern.test(cmd)) {
        return true;
      }
    }

    // Check path for critical system directories
    const criticalPaths = [
      '\\windows\\',
      '\\program files\\',
      '\\program files (x86)\\',
      '\\system32\\',
      '/usr/bin/',
      '/usr/sbin/',
      '/etc/',
      '/var/',
      '/opt/'
    ];

    for (const criticalPath of criticalPaths) {
      if (procPath.includes(criticalPath)) {
        return true;
      }
    }

    // Check for critical Python applications by name
    const criticalApps = [
      'postgresql',
      'mysql',
      'mariadb',
      'redis-server',
      'apache',
      'nginx',
      'dovecot',
      'postfix',
      'sshd'
    ];

    for (const app of criticalApps) {
      if (cmd.includes(app) || name.toLowerCase().includes(app)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a Python process is likely a development server
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if this is likely a development server
   */
  isPythonDevelopmentServer(processInfo) {
    const { command, port } = processInfo;
    const cmd = (command || '').toLowerCase();

    // 1. Check if it's running on typical development ports
    if (port && (this.isWebPort(port) || this.isDevelopmentPort(port))) {
      return true;
    }

    // 2. Check for common development server patterns
    const devServerPatterns = [
      // Web frameworks
      /flask/i,
      /django/i,
      /fastapi/i,
      /tornado/i,
      /aiohttp/i,
      /quart/i,
      /sanic/i,
      /falcon/i,
      /bottle/i,
      /cherrypy/i,
      /pyramid/i,
      /turbo gears/i,

      // Development tools
      /runserver/i,
      /devserver/i,
      /debugserver/i,
      /manage\.py/i,  // Django management
      /wsgi/i,
      /asgi/i,

      // Package managers and tools
      /pip/i,
      /conda/i,
      /virtualenv/i,
      /venv/i,
      /jupyter/i,
      /ipython/i,

      // Build tools
      /webpack/i,
      /vite/i,
      /rollup/i,
      /parcel/i,

      // Test runners
      /pytest/i,
      /unittest/i,
      /nose/i,

      // Common development patterns
      /app\.py/i,
      /main\.py/i,
      /server\.py/i,
      /start\.py/i,
      /dev\.py/i,
      /debug\.py/i,
      /localhost/i,
      /127\.0\.0\.1/i,
      /0\.0\.0\.0/i
    ];

    for (const pattern of devServerPatterns) {
      if (pattern.test(cmd)) {
        return true;
      }
    }

    // 3. Check for port information in command (indicates server)
    if (this.extractPortFromCommand(cmd)) {
      return true;
    }

    // 4. Check for common development directories
    const devDirectories = [
      '\\appdata\\',
      '\\users\\',
      '\\desktop\\',
      '\\documents\\',
      '/home/',
      '/user/',
      '/project/',
      '/dev/',
      '/src/',
      '/workspace/',
      '/tmp/',
      '/temp/'
    ];

    for (const devDir of devDirectories) {
      if ((processInfo.path || '').toLowerCase().includes(devDir)) {
        return true;
      }
    }

    // If none of the above patterns match, it's likely not a development server
    return false;
  }

  /**
   * Get appropriate name for Python server based on framework detection
   * @param {Object} processInfo - Process information
   * @returns {string} Server name
   */
  getPythonServerName(processInfo) {
    const { command } = processInfo;
    const cmd = (command || '').toLowerCase();

    // Framework-specific naming
    if (cmd.includes('django')) {
      return 'Django Dev Server';
    } else if (cmd.includes('flask')) {
      return 'Flask Web Server';
    } else if (cmd.includes('fastapi')) {
      return 'FastAPI Server';
    } else if (cmd.includes('tornado')) {
      return 'Tornado Web Server';
    } else if (cmd.includes('aiohttp')) {
      return 'AsyncIO Web Server';
    } else if (cmd.includes('quart')) {
      return 'Quart Web Server';
    } else if (cmd.includes('streamlit')) {
      return 'Streamlit App';
    } else if (cmd.includes('jupyter')) {
      return 'Jupyter Notebook';
    } else if (cmd.includes('dash')) {
      return 'Plotly Dash App';
    } else if (cmd.includes('bokeh')) {
      return 'Bokeh Server';
    } else if (cmd.includes('gradio')) {
      return 'Gradio App';
    }

    // General patterns
    if (cmd.includes('runserver')) {
      return 'Python Dev Server';
    } else if (cmd.includes('wsgi')) {
      return 'Python WSGI Server';
    } else if (cmd.includes('asgi')) {
      return 'Python ASGI Server';
    }

    return 'Python Web Server';
  }

  /**
   * Check if a port is a development port
   * @param {number} port - Port number
   * @returns {boolean} True if it's a development port
   */
  isDevelopmentPort(port) {
    // Expanded range for development servers
    return (port >= 1024 && port <= 9999) ||  // User applications
           (port >= 3000 && port <= 8999) ||  // Common dev range
           (port >= 5000 && port <= 9999);   // Extended dev range
  }

  /**
   * Check if an "other" process is critical and should NOT be stopped
   * @param {Object} processInfo - Process information
   * @returns {boolean} True if this is a critical process
   */
  isCriticalOtherProcess(processInfo) {
    const { command, name, path } = processInfo;
    const cmd = (command || '').toLowerCase();
    const procPath = (path || '').toLowerCase();

    // Critical other applications that should NEVER be stopped
    const criticalPatterns = [
      // Production web servers
      /apache/i,
      /nginx/i,
      /iis/i,
      /tomcat/i,
      /jetty/i,

      // Database services
      /oracle/i,
      /sqlserver/i,
      /postgres/i,

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
      /server.*farm/i,
      /cluster/i,

      // Backup and monitoring
      /backup/i,
      /monitor/i,
      /log.*agent/i
    ];

    // Check command line for critical patterns
    for (const pattern of criticalPatterns) {
      if (pattern.test(cmd)) {
        return true;
      }
    }

    // Check path for critical system directories
    const criticalPaths = [
      '\\windows\\',
      '\\program files\\',
      '\\program files (x86)\\',
      '\\system32\\',
      '/usr/bin/',
      '/usr/sbin/',
      '/etc/',
      '/var/',
      '/opt/'
    ];

    for (const criticalPath of criticalPaths) {
      if (procPath.includes(criticalPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get appropriate name for other development servers
   * @param {Object} processInfo - Process information
   * @returns {string} Server name
   */
  getOtherServerName(processInfo) {
    const { command } = processInfo;
    const cmd = (command || '').toLowerCase();

    if (cmd.includes('http-server')) {
      return 'HTTP Server';
    } else if (cmd.includes('webpack')) {
      return 'Webpack Dev Server';
    } else if (cmd.includes('parcel')) {
      return 'Parcel Dev Server';
    } else if (cmd.includes('vite')) {
      return 'Vite Dev Server';
    } else if (cmd.includes('rollup')) {
      return 'Rollup Dev Server';
    } else if (cmd.includes('serve')) {
      return 'Static File Server';
    } else if (cmd.includes('live-server')) {
      return 'Live Server';
    }

    return 'Other Dev Server';
  }

  /**
   * Enhanced server classification with more detailed analysis
   * @param {Object} processInfo - Process information
   * @returns {Object|null} Enhanced server object or null
   */
  classifyServerEnhanced(processInfo) {
    const basicServer = this.classifyServer(processInfo);
    if (!basicServer) return null;

    // Add enhanced information
    return {
      ...basicServer,
      // Additional classification details
      isDevelopmentServer: true,
      confidence: this.calculateClassificationConfidence(processInfo, basicServer),
      tags: this.generateServerTags(processInfo, basicServer),
      priority: this.calculateServerPriority(basicServer)
    };
  }

  /**
   * Calculate classification confidence score
   * @param {Object} processInfo - Process information
   * @param {Object} server - Server object
   * @returns {number} Confidence score (0-1)
   */
  calculateClassificationConfidence(processInfo, server) {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on known patterns
    if (server.type === 'react' && processInfo.command) {
      const cmd = processInfo.command.toLowerCase();
      if (cmd.includes('react-scripts') || cmd.includes('next') || cmd.includes('vite')) {
        confidence += 0.3;
      }
    }

    // Boost confidence if running on typical dev ports
    if (server.port !== 'Unknown' && this.isWebPort(parseInt(server.port))) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate tags for server classification
   * @param {Object} processInfo - Process information
   * @param {Object} server - Server object
   * @returns {Array} Array of tags
   */
  generateServerTags(processInfo, server) {
    const tags = [];

    // Add basic type tags
    tags.push(server.type);

    // Add framework-specific tags
    if (server.type === 'react' && processInfo.command) {
      const cmd = processInfo.command.toLowerCase();
      if (cmd.includes('next')) tags.push('nextjs');
      if (cmd.includes('vite')) tags.push('vite');
      if (cmd.includes('react-scripts')) tags.push('create-react-app');
    }

    // Add port-based tags
    if (server.port !== 'Unknown') {
      const port = parseInt(server.port);
      if (port === 3000) tags.push('default-react-port');
      if (port === 8000) tags.push('django-default');
      if (port === 5000) tags.push('flask-default');
    }

    return tags;
  }

  /**
   * Calculate server priority for display/management
   * @param {Object} server - Server object
   * @returns {number} Priority score (higher = more important)
   */
  calculateServerPriority(server) {
    let priority = 0;

    // Boost priority for certain server types
    const typePriority = {
      'react': 3,
      'node': 2,
      'python': 2,
      'static': 1
    };

    priority += typePriority[server.type] || 0;

    // Boost priority if URL is available
    if (server.url) priority += 1;

    // Boost priority for certain categories
    if (server.category === 'Frontend Frameworks') priority += 1;

    return priority;
  }
}

module.exports = ProcessClassifier;