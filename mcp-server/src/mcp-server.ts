import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ProcessManager } from './process-manager.js';
import { ServerDetector } from './server-detector.js';
import type { ServerAction, ServerActionResult, ProcessInfo } from './interfaces.js';

export class ServerManagerMCPServer {
  private server: Server;
  private processManager: ProcessManager;
  private serverDetector: ServerDetector;

  constructor() {
    this.server = new Server(
      {
        name: 'server-manager-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.processManager = new ProcessManager();
    this.serverDetector = new ServerDetector();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_servers',
            description: 'List all running development servers',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'stop_server',
            description: 'Stop a running server by PID',
            inputSchema: {
              type: 'object',
              properties: {
                pid: {
                  type: 'number',
                  description: 'Process ID of the server to stop',
                },
              },
              required: ['pid'],
            },
          },
          {
            name: 'start_server',
            description: 'Start a new server process',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Command to execute',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Arguments for the command',
                },
                cwd: {
                  type: 'string',
                  description: 'Working directory for the process',
                },
              },
              required: ['command'],
            },
          },
          {
            name: 'restart_server',
            description: 'Restart a server by PID',
            inputSchema: {
              type: 'object',
              properties: {
                pid: {
                  type: 'number',
                  description: 'Process ID of the server to restart',
                },
              },
              required: ['pid'],
            },
          },
          {
            name: 'get_server_info',
            description: 'Get detailed information about a specific server',
            inputSchema: {
              type: 'object',
              properties: {
                pid: {
                  type: 'number',
                  description: 'Process ID of the server',
                },
              },
              required: ['pid'],
            },
          },
          {
            name: 'get_server_by_port',
            description: 'Find server listening on a specific port',
            inputSchema: {
              type: 'object',
              properties: {
                port: {
                  type: 'number',
                  description: 'Port number to search for',
                },
              },
              required: ['port'],
            },
          },
          {
            name: 'list_processes',
            description: 'List all running processes',
            inputSchema: {
              type: 'object',
              properties: {
                filter: {
                  type: 'string',
                  description: 'Filter processes by name or command',
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_servers':
            return await this.handleListServers();
          case 'stop_server':
            return await this.handleStopServer(args);
          case 'start_server':
            return await this.handleStartServer(args);
          case 'restart_server':
            return await this.handleRestartServer(args);
          case 'get_server_info':
            return await this.handleGetServerInfo(args);
          case 'get_server_by_port':
            return await this.handleGetServerByPort(args);
          case 'list_processes':
            return await this.handleListProcesses(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleListServers() {
    const servers = await this.serverDetector.detectServers();

    return {
      content: [
        {
          type: 'text',
          text: `Found ${servers.length} running servers:\n\n${this.formatServersList(servers)}`,
        },
      ],
    };
  }

  private async handleStopServer(args: any) {
    const { pid } = args;

    if (!pid || typeof pid !== 'number') {
      throw new Error('Valid PID is required');
    }

    const result = await this.processManager.stopProcess(pid);

    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleStartServer(args: any) {
    const { command, args: processArgs = [], cwd } = args;

    if (!command || typeof command !== 'string') {
      throw new Error('Command is required');
    }

    const result = await this.processManager.startProcess(
      command,
      processArgs,
      cwd ? { cwd } : {}
    );

    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleRestartServer(args: any) {
    const { pid } = args;

    if (!pid || typeof pid !== 'number') {
      throw new Error('Valid PID is required');
    }

    const result = await this.processManager.restartProcess(pid);

    return {
      content: [
        {
          type: 'text',
          text: result.message,
        },
      ],
      isError: !result.success,
    };
  }

  private async handleGetServerInfo(args: any) {
    const { pid } = args;

    if (!pid || typeof pid !== 'number') {
      throw new Error('Valid PID is required');
    }

    const server = await this.serverDetector.getServerByPid(pid);

    if (!server) {
      return {
        content: [
          {
            type: 'text',
            text: `Server with PID ${pid} not found`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatServerInfo(server),
        },
      ],
    };
  }

  private async handleGetServerByPort(args: any) {
    const { port } = args;

    if (!port || typeof port !== 'number') {
      throw new Error('Valid port number is required');
    }

    const server = await this.serverDetector.getServerByPort(port);

    if (!server) {
      return {
        content: [
          {
            type: 'text',
            text: `No server found listening on port ${port}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatServerInfo(server),
        },
      ],
    };
  }

  private async handleListProcesses(args: any) {
    const { filter } = args;
    let processes = await this.processManager.listProcesses();

    if (filter && typeof filter === 'string') {
      const filterLower = filter.toLowerCase();
      processes = processes.filter(proc =>
        proc.name.toLowerCase().includes(filterLower) ||
        proc.command.toLowerCase().includes(filterLower)
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: `Found ${processes.length} processes:\n\n${this.formatProcessesList(processes)}`,
        },
      ],
    };
  }

  private formatServersList(servers: ProcessInfo[]): string {
    return servers.map(server => {
      const uptime = this.getUptime(server.startTime);
      return `PID: ${server.pid}
Name: ${server.name}
Status: ${server.status}
CPU: ${server.cpu.toFixed(1)}%
Memory: ${server.memory.toFixed(1)}%
Port: ${server.port || 'N/A'}
Started: ${server.startTime.toLocaleString()}
Uptime: ${uptime}
Command: ${server.command}
---`;
    }).join('\n');
  }

  private formatServerInfo(server: ProcessInfo): string {
    const uptime = this.getUptime(server.startTime);
    return `Server Details:
PID: ${server.pid}
Name: ${server.name}
Status: ${server.status}
CPU Usage: ${server.cpu.toFixed(1)}%
Memory Usage: ${server.memory.toFixed(1)}%
Port: ${server.port || 'N/A'}
Started: ${server.startTime.toLocaleString()}
Uptime: ${uptime}
User: ${server.user}
Command: ${server.command}`;
  }

  private formatProcessesList(processes: ProcessInfo[]): string {
    return processes.map(proc => {
      const uptime = this.getUptime(proc.startTime);
      return `PID: ${proc.pid} | ${proc.name} | CPU: ${proc.cpu.toFixed(1)}% | Memory: ${proc.memory.toFixed(1)}% | ${proc.status} | ${uptime}`;
    }).join('\n');
  }

  private getUptime(startTime: Date): string {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Server Manager MCP server running on stdio');
  }
}