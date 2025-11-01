#!/usr/bin/env node

// Test script for MCP server
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testMCPServer() {
  console.log('🧪 Testing Server Manager MCP Server...\n');

  const serverProcess = spawn('node', [path.join(__dirname, 'dist', 'index.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let error = '';

  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  serverProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  serverProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ MCP server started successfully');
      console.log('📝 Server output:', output);
    } else {
      console.log('❌ MCP server failed with code:', code);
      console.log('📝 Server error:', error);
    }
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Failed to start MCP server:', err.message);
  });

  // Send a test MCP request
  const testRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');

  // Close after timeout
  setTimeout(() => {
    serverProcess.kill();
    console.log('\n🔍 Test completed');
  }, 5000);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPServer();
}

export { testMCPServer };