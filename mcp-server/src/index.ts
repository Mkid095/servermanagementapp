import { ServerManagerMCPServer } from './mcp-server.js';

async function main() {
  const server = new ServerManagerMCPServer();
  await server.run();
}

main().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});