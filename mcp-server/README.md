# Server Manager MCP Server

A Model Context Protocol (MCP) server for managing development servers and processes. This server allows LLM tools to interact with and control running server processes.

## Features

- **Server Discovery**: Automatically detects running development servers
- **Process Management**: Start, stop, and restart server processes
- **Port Detection**: Identify which servers are listening on specific ports
- **System Monitoring**: Monitor CPU, memory, and process status
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Build the server:
```bash
npm run build
```

3. Install the MCP server in your LLM tool configuration.

## MCP Tools

### list_servers
Lists all running development servers with their details.

### stop_server
Stops a running server by PID.
- `pid` (required): Process ID of the server to stop

### start_server
Starts a new server process.
- `command` (required): Command to execute
- `args` (optional): Arguments for the command
- `cwd` (optional): Working directory for the process

### restart_server
Restarts a server by PID.
- `pid` (required): Process ID of the server to restart

### get_server_info
Gets detailed information about a specific server.
- `pid` (required): Process ID of the server

### get_server_by_port
Finds a server listening on a specific port.
- `port` (required): Port number to search for

### list_processes
Lists all running processes.
- `filter` (optional): Filter processes by name or command

## Configuration

Add this server to your LLM tool's MCP configuration:

```json
{
  "mcpServers": {
    "server-manager": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Usage Examples

### List all running servers
```javascript
// MCP Tool Call
{
  "name": "list_servers",
  "arguments": {}
}
```

### Stop a server
```javascript
// MCP Tool Call
{
  "name": "stop_server",
  "arguments": {
    "pid": 12345
  }
}
```

### Start a new Node.js server
```javascript
// MCP Tool Call
{
  "name": "start_server",
  "arguments": {
    "command": "node",
    "args": ["server.js"],
    "cwd": "/path/to/project"
  }
}
```

### Find server on port 3000
```javascript
// MCP Tool Call
{
  "name": "get_server_by_port",
  "arguments": {
    "port": 3000
  }
}
```

## Development

1. Run in development mode:
```bash
npm run dev
```

2. Build for production:
```bash
npm run build
```

## Requirements

- Node.js 16+
- Administrative privileges may be required for some operations on Windows

## License

MIT