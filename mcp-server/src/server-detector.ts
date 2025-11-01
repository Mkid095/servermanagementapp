import { exec } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import type { ProcessInfo } from './interfaces.js';

const execAsync = promisify(exec);

export class ServerDetector {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  async detectServers(): Promise<ProcessInfo[]> {
    try {
      // Check cache first
      const cacheKey = 'detected_servers';
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Get all processes
      const processes = await si.processes();
      const serverProcesses: ProcessInfo[] = [];

      // Get network connections
      const networkConnections = await this.getNetworkConnections();

      processes.list.forEach(proc => {
        if (proc.pid && proc.name && this.isServerProcess(proc)) {
          const processInfo: ProcessInfo = {
            pid: proc.pid,
            name: proc.name,
            command: proc.command || '',
            cpu: proc.cpu || 0,
            memory: proc.mem || 0,
            status: proc.state || 'unknown',
            startTime: new Date(proc.started || Date.now()),
            user: proc.user || 'unknown'
          };

          // Find listening ports for this process
          const ports = this.getProcessPorts(proc.pid, networkConnections);
          if (ports.length > 0) {
            processInfo.port = ports[0]; // Use first port found
          }

          serverProcesses.push(processInfo);
        }
      });

      // Cache the results
      this.cache.set(cacheKey, {
        data: serverProcesses,
        timestamp: Date.now()
      });

      return serverProcesses;
    } catch (error) {
      console.error('Error detecting servers:', error);
      return [];
    }
  }

  async getServerByPort(port: number): Promise<ProcessInfo | null> {
    try {
      const servers = await this.detectServers();
      return servers.find(server => server.port === port) || null;
    } catch (error) {
      console.error(`Error getting server by port ${port}:`, error);
      return null;
    }
  }

  async getServerByPid(pid: number): Promise<ProcessInfo | null> {
    try {
      const processes = await si.processes();
      const proc = processes.list.find(p => p.pid === pid);

      if (!proc || !this.isServerProcess(proc)) return null;

      const networkConnections = await this.getNetworkConnections();
      const ports = this.getProcessPorts(pid, networkConnections);

      return {
        pid: proc.pid,
        name: proc.name,
        command: proc.command || '',
        cpu: proc.cpu || 0,
        memory: proc.mem || 0,
        status: proc.state || 'unknown',
        startTime: new Date(proc.started || Date.now()),
        user: proc.user || 'unknown',
        port: ports.length > 0 ? ports[0] : undefined
      };
    } catch (error) {
      console.error(`Error getting server by PID ${pid}:`, error);
      return null;
    }
  }

  async getNetworkConnections() {
    try {
      // Try to get network connections using netstat
      const { stdout } = await execAsync('netstat -ano | findstr "LISTENING"');
      return this.parseNetstatOutput(stdout);
    } catch (error) {
      console.error('Error getting network connections:', error);
      return [];
    }
  }

  private parseNetstatOutput(output: string): Array<{ pid: number; port: number }> {
    const connections: Array<{ pid: number; port: number }> = [];

    output.split('\n').forEach(line => {
      const match = line.match(/TCP\s+[^:]+:(\d+)\s+.*?LISTENING\s+(\d+)/);
      if (match) {
        const port = parseInt(match[1], 10);
        const pid = parseInt(match[2], 10);

        if (!isNaN(port) && !isNaN(pid)) {
          connections.push({ pid, port });
        }
      }
    });

    return connections;
  }

  private getProcessPorts(pid: number, connections: Array<{ pid: number; port: number }>): number[] {
    return connections
      .filter(conn => conn.pid === pid)
      .map(conn => conn.port);
  }

  private isServerProcess(proc: any): boolean {
    if (!proc || !proc.name) return false;

    const serverKeywords = [
      'node', 'npm', 'python', 'python3', 'java', 'javaw',
      'httpd', 'apache', 'nginx', 'mysqld', 'postgres',
      'mongod', 'redis', 'deno', 'bun', 'pm2', 'nodemon',
      'next', 'react', 'vue', 'angular', 'express', 'fastapi',
      'flask', 'django', 'rails', 'laravel', 'spring',
      'tomcat', 'jetty', 'webpack', 'vite', 'parcel'
    ];

    const name = proc.name.toLowerCase();
    const command = (proc.command || '').toLowerCase();

    // Check if it's a known server process
    if (serverKeywords.some(keyword => name.includes(keyword))) {
      return true;
    }

    // Check if it's listening on a port
    if (command.includes('--port') || command.includes('-p ') || command.includes(':3000') ||
        command.includes(':8080') || command.includes(':5000') || command.includes(':9000')) {
      return true;
    }

    // Check for common server file patterns
    if (command.includes('server.js') || command.includes('app.js') ||
        command.includes('main.js') || command.includes('index.js')) {
      return true;
    }

    return false;
  }

  clearCache(): void {
    this.cache.clear();
  }
}