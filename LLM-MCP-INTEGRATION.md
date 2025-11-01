# LLM Tool MCP Integration Guide

This guide explains how to integrate the Server Manager MCP server with LLM tools to enable server management capabilities.

## Overview

The Server Manager MCP server provides the following capabilities:
- **Server Discovery**: Automatically detects running development servers
- **Process Management**: Start, stop, restart server processes
- **Port Monitoring**: Find servers listening on specific ports
- **System Information**: Get process details, CPU/memory usage
- **Cross-Platform Support**: Works on Windows, macOS, and Linux

## Installation

### 1. Install Dependencies
```bash
cd mcp-server
npm install
npm run build
```

### 2. Install MCP Server
Run the installation script:
```bash
node install-mcp.js
```

This will:
- Build the MCP server
- Find or create your LLM tool's MCP configuration
- Add the server-manager MCP server to your configuration
- Restart your LLM tool to load the new server

### 3. Manual Installation (Alternative)
If the automatic installation doesn't work, manually add this to your LLM tool's MCP configuration:

```json
{
  "mcpServers": {
    "server-manager": {
      "command": "node",
      "args": ["path/to/servermanagementapp/mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Available Tools

### 1. list_servers
**Purpose**: List all running development servers
**Parameters**: None
**Example**:
```json
{
  "name": "list_servers",
  "arguments": {}
}
```

### 2. stop_server
**Purpose**: Stop a running server by PID
**Parameters**:
- `pid` (number, required): Process ID of the server to stop
**Example**:
```json
{
  "name": "stop_server",
  "arguments": {
    "pid": 12345
  }
}
```

### 3. start_server
**Purpose**: Start a new server process
**Parameters**:
- `command` (string, required): Command to execute
- `args` (array, optional): Arguments for the command
- `cwd` (string, optional): Working directory for the process
**Example**:
```json
{
  "name": "start_server",
  "arguments": {
    "command": "node",
    "args": ["server.js"],
    "cwd": "/path/to/project"
  }
}
```

### 4. restart_server
**Purpose**: Restart a server by PID
**Parameters**:
- `pid` (number, required): Process ID of the server to restart
**Example**:
```json
{
  "name": "restart_server",
  "arguments": {
    "pid": 12345
  }
}
```

### 5. get_server_info
**Purpose**: Get detailed information about a specific server
**Parameters**:
- `pid` (number, required): Process ID of the server
**Example**:
```json
{
  "name": "get_server_info",
  "arguments": {
    "pid": 12345
  }
}
```

### 6. get_server_by_port
**Purpose**: Find server listening on a specific port
**Parameters**:
- `port` (number, required): Port number to search for
**Example**:
```json
{
  "name": "get_server_by_port",
  "arguments": {
    "port": 3000
  }
}
```

### 7. list_processes
**Purpose**: List all running processes
**Parameters**:
- `filter` (string, optional): Filter processes by name or command
**Example**:
```json
{
  "name": "list_processes",
  "arguments": {
    "filter": "node"
  }
}
```

## Usage Examples

### Example 1: Development Workflow
```
User: "List all running development servers"
LLM: Uses list_servers tool to show active servers

User: "Stop the server on port 3000"
LLM: Uses get_server_by_port to find the server, then stop_server to stop it

User: "Start a new Node.js server"
LLM: Uses start_server with appropriate command and arguments
```

### Example 2: Server Management
```
User: "Restart the Express server"
LLM:
1. Uses list_servers to find Express servers
2. Uses get_server_info to verify the correct server
3. Uses restart_server to restart it
```

### Example 3: Process Monitoring
```
User: "Show me all Node.js processes and their resource usage"
LLM: Uses list_processes with filter "node" to show Node.js processes
```

## Configuration File Locations

### Windows
- `%APPDATA%\Roaming\claude\claude_desktop_config.json`
- `%USERPROFILE%\.config\claude\config.json`

### macOS
- `~/Library/Application Support/Claude/claude_desktop_config.json`
- `~/.config/claude/config.json`

### Linux
- `~/.config/claude/config.json`
- `~/.config/mcp/config.json`

## Troubleshooting

### 1. MCP Server Not Starting
- Check if Node.js is installed (version 16+ required)
- Verify the MCP server path is correct
- Check file permissions

### 2. Permission Denied Errors
- Run as administrator (Windows) or with sudo (macOS/Linux)
- Check user permissions for process management

### 3. Server Not Detected
- Ensure the server is actually running
- Check if the server process has the expected name patterns
- Verify network connection for port detection

### 4. Build Errors
- Ensure all dependencies are installed: `npm install`
- Check TypeScript version compatibility
- Verify Node.js version

## Security Considerations

- The MCP server requires elevated privileges to manage processes
- Only install from trusted sources
- Review the code before installation
- Monitor process management activities

## Testing

Test the MCP server installation:
```bash
cd mcp-server
npm run build
node test-mcp.js
```

## Uninstallation

To remove the MCP server:
```bash
node install-mcp.js --uninstall
```

Or manually remove the server-manager entry from your MCP configuration.

## Support

For issues and feature requests, please check the project repository or create an issue.