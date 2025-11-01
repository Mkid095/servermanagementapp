import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as treeKill from 'tree-kill';
import si from 'systeminformation';
import type { ProcessInfo, ServerActionResult } from './interfaces.js';

const execAsync = promisify(exec);

export class ProcessManager {
  private activeProcesses: Map<number, any> = new Map();

  async listProcesses(): Promise<ProcessInfo[]> {
    try {
      const processes = await si.processes();
      const processList: ProcessInfo[] = [];

      processes.list.forEach(proc => {
        if (proc.name && proc.pid) {
          processList.push({
            pid: proc.pid,
            name: proc.name,
            command: proc.command || '',
            cpu: proc.cpu || 0,
            memory: proc.mem || 0,
            status: proc.state || 'unknown',
            startTime: new Date(proc.started || Date.now()),
            user: proc.user || 'unknown'
          });
        }
      });

      // Filter for potential server processes
      return processList.filter(proc =>
        this.isServerProcess(proc) ||
        proc.name.toLowerCase().includes('node') ||
        proc.name.toLowerCase().includes('python') ||
        proc.name.toLowerCase().includes('java') ||
        proc.name.toLowerCase().includes('http')
      );
    } catch (error) {
      console.error('Error listing processes:', error);
      return [];
    }
  }

  async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
    try {
      const processes = await si.processes();
      const proc = processes.list.find(p => p.pid === pid);

      if (!proc) return null;

      return {
        pid: proc.pid,
        name: proc.name,
        command: proc.command || '',
        cpu: proc.cpu || 0,
        memory: proc.mem || 0,
        status: proc.state || 'unknown',
        startTime: new Date(proc.started || Date.now()),
        user: proc.user || 'unknown'
      };
    } catch (error) {
      console.error(`Error getting process info for PID ${pid}:`, error);
      return null;
    }
  }

  async stopProcess(pid: number): Promise<ServerActionResult> {
    try {
      const processInfo = await this.getProcessInfo(pid);
      if (!processInfo) {
        return {
          success: false,
          message: `Process with PID ${pid} not found`,
          error: 'Process not found'
        };
      }

      // Try graceful termination first
      try {
        process.kill(pid, 'SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if process is still running
        const stillRunning = await this.getProcessInfo(pid);
        if (!stillRunning) {
          return {
            success: true,
            message: `Process ${pid} (${processInfo.name}) stopped successfully`
          };
        }
      } catch (error) {
        // SIGTERM failed, try force kill
      }

      // Force kill if SIGTERM failed
      if (processInfo.pid) {
        await this.forceKillProcess(processInfo.pid);
      }

      // Verify process is stopped
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finalCheck = await this.getProcessInfo(pid);

      if (!finalCheck) {
        return {
          success: true,
          message: `Process ${pid} (${processInfo.name}) force stopped successfully`
        };
      } else {
        return {
          success: false,
          message: `Failed to stop process ${pid}`,
          error: 'Process still running after force kill attempt'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error stopping process ${pid}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async startProcess(command: string, args: string[] = [], options: any = {}): Promise<ServerActionResult> {
    try {
      const process = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        ...options
      });

      process.unref();

      if (process.pid) {
        this.activeProcesses.set(process.pid, process);
      }

      return {
        success: true,
        message: `Process started with PID ${process.pid}`,
        data: {
          pid: process.pid,
          command: `${command} ${args.join(' ')}`
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error starting process: ${command}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async restartProcess(pid: number): Promise<ServerActionResult> {
    try {
      const processInfo = await this.getProcessInfo(pid);
      if (!processInfo) {
        return {
          success: false,
          message: `Process with PID ${pid} not found`,
          error: 'Process not found'
        };
      }

      const command = processInfo.command;
      const stopResult = await this.stopProcess(pid);

      if (!stopResult.success) {
        return stopResult;
      }

      // Wait a moment before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Parse command and restart
      const parts = command.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      return await this.startProcess(cmd, args);
    } catch (error: any) {
      return {
        success: false,
        message: `Error restarting process ${pid}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async forceKillProcess(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
      treeKill.default(pid, 'SIGKILL', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private isServerProcess(process: ProcessInfo): boolean {
    const serverKeywords = [
      'server', 'http', 'https', 'api', 'app', 'service', 'daemon',
      'node', 'npm', 'python', 'java', 'ruby', 'php', 'go'
    ];

    const command = process.command.toLowerCase();
    const name = process.name.toLowerCase();

    return serverKeywords.some(keyword =>
      command.includes(keyword) || name.includes(keyword)
    ) || this.hasPortInCommand(command);
  }

  private hasPortInCommand(command: string): boolean {
    const portPattern = /--port\s+\d+|-p\s+\d+|:\d+/;
    return portPattern.test(command);
  }
}