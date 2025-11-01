#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

class MCPInstaller {
  constructor() {
    this.platform = os.platform();
    this.configPaths = this.getConfigPaths();
  }

  getConfigPaths() {
    const homeDir = os.homedir();
    const paths = [];

    // Common MCP configuration locations
    switch (this.platform) {
      case 'win32':
        paths.push(
          path.join(homeDir, 'AppData', 'Roaming', 'claude', 'claude_desktop_config.json'),
          path.join(homeDir, '.config', 'claude', 'config.json')
        );
        break;
      case 'darwin':
        paths.push(
          path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
          path.join(homeDir, '.config', 'claude', 'config.json')
        );
        break;
      default: // Linux and others
        paths.push(
          path.join(homeDir, '.config', 'claude', 'config.json'),
          path.join(homeDir, '.config', 'mcp', 'config.json')
        );
        break;
    }

    return paths;
  }

  async install() {
    console.log('🚀 Installing Server Manager MCP Server...\n');

    // Build the server first
    console.log('📦 Building MCP server...');
    try {
      const { execSync } = require('child_process');
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
      console.error('❌ Failed to build MCP server:', error.message);
      process.exit(1);
    }

    // Find existing config or create new
    const configPath = await this.findOrCreateConfig();

    if (!configPath) {
      console.error('❌ Could not find or create MCP configuration');
      process.exit(1);
    }

    // Update configuration
    await this.updateConfig(configPath);

    console.log('✅ Server Manager MCP Server installed successfully!');
    console.log('\n📋 Configuration updated at:', configPath);
    console.log('\n🔧 Available tools:');
    console.log('  • list_servers - List running development servers');
    console.log('  • stop_server - Stop a server by PID');
    console.log('  • start_server - Start a new server process');
    console.log('  • restart_server - Restart a server by PID');
    console.log('  • get_server_info - Get server details');
    console.log('  • get_server_by_port - Find server by port');
    console.log('  • list_processes - List all processes');
    console.log('\n🔄 Please restart your LLM tool to load the new MCP server.');
  }

  async findOrCreateConfig() {
    for (const configPath of this.configPaths) {
      if (fs.existsSync(configPath)) {
        console.log('📁 Found existing configuration:', configPath);
        return configPath;
      }
    }

    // Create new configuration
    const configPath = this.configPaths[0];
    const configDir = path.dirname(configPath);

    console.log('📁 Creating new configuration:', configPath);

    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const initialConfig = {
        mcpServers: {}
      };

      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
      return configPath;
    } catch (error) {
      console.error('❌ Failed to create configuration:', error.message);
      return null;
    }
  }

  async updateConfig(configPath) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      // Ensure mcpServers object exists
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      // Add server-manager configuration
      config.mcpServers['server-manager'] = {
        command: 'node',
        args: [path.join(__dirname, 'dist', 'index.js')],
        env: {
          NODE_ENV: 'production'
        }
      };

      // Write updated configuration
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('❌ Failed to update configuration:', error.message);
      throw error;
    }
  }

  async uninstall() {
    console.log('🗑️  Uninstalling Server Manager MCP Server...\n');

    const configPath = await this.findExistingConfig();

    if (!configPath) {
      console.log('ℹ️  No MCP configuration found');
      return;
    }

    await this.removeFromConfig(configPath);
    console.log('✅ Server Manager MCP Server uninstalled successfully!');
    console.log('\n🔄 Please restart your LLM tool to apply changes.');
  }

  async findExistingConfig() {
    for (const configPath of this.configPaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    return null;
  }

  async removeFromConfig(configPath) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      if (config.mcpServers && config.mcpServers['server-manager']) {
        delete config.mcpServers['server-manager'];
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('📝 Configuration updated at:', configPath);
      } else {
        console.log('ℹ️  Server Manager MCP Server not found in configuration');
      }
    } catch (error) {
      console.error('❌ Failed to update configuration:', error.message);
      throw error;
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const installer = new MCPInstaller();

if (args.includes('--uninstall')) {
  installer.uninstall().catch(error => {
    console.error('❌ Uninstallation failed:', error.message);
    process.exit(1);
  });
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Server Manager MCP Server Installer

Usage:
  node install-mcp.js [options]

Options:
  --help, -h     Show this help message
  --uninstall    Uninstall the MCP server

Examples:
  node install-mcp.js              # Install MCP server
  node install-mcp.js --uninstall  # Uninstall MCP server
  `);
} else {
  installer.install().catch(error => {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
  });
}