/**
 * Server List Component
 * Manages the display and interaction with running servers
 */
class ServerList {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.servers = [];
    this.isLoading = false;
    this.error = null;
    
    this.init();
  }

  init() {
    this.container.innerHTML = this.render();
    this.attachEventListeners();
  }

  /**
   * Render the server list component
   */
  render() {
    return `
      <div class="server-list-container">
        <div class="server-list-header">
          <h2>Active Development Servers</h2>
          <div class="server-actions">
            <button id="refresh-btn" class="btn btn-primary">
              <span class="refresh-icon">🔄</span> Refresh
            </button>
            <button id="stop-all-btn" class="btn btn-danger" style="display: none;">
              <span class="stop-icon">⏹️</span> Stop All
            </button>
          </div>
        </div>
        
        <div id="loading-indicator" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Detecting servers...</p>
        </div>
        
        <div id="error-message" class="error-message" style="display: none;"></div>
        
        <div id="empty-state" class="empty-state">
          <div class="empty-icon">🖥️</div>
          <h3>No Development Servers Found</h3>
          <p>No development servers are currently running on your system.</p>
          <p class="empty-tip">Start a development server (React, Node.js, Python) and click refresh to see it here.</p>
        </div>
        
        <div id="servers-container" class="servers-grid"></div>
        
        <div class="server-stats">
          <div class="stat-item">
            <span class="stat-label">Total Servers:</span>
            <span id="total-servers" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">React:</span>
            <span id="react-servers" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Node.js:</span>
            <span id="node-servers" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Python:</span>
            <span id="python-servers" class="stat-value">0</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const stopAllBtn = document.getElementById('stop-all-btn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshServers());
    }

    if (stopAllBtn) {
      stopAllBtn.addEventListener('click', () => this.stopAllServers());
    }
  }

  /**
   * Update the server list with new data
   */
  updateServers(servers) {
    this.servers = servers;
    this.renderServers();
    this.updateStats();
    this.updateEmptyState();
  }

  /**
   * Render individual server cards
   */
  renderServers() {
    const container = document.getElementById('servers-container');
    
    if (!container) return;

    if (this.servers.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.servers.map(server => this.createServerCard(server)).join('');
    
    // Attach event listeners to server cards
    this.attachServerEventListeners();
  }

  /**
   * Create HTML for a single server card
   */
  createServerCard(server) {
    const serverIcon = this.getServerIcon(server.type);
    const statusColor = this.getStatusColor(server);
    
    return `
      <div class="server-card" data-pid="${server.pid}">
        <div class="server-header">
          <div class="server-icon">${serverIcon}</div>
          <div class="server-info">
            <h3 class="server-name">${server.name}</h3>
            <div class="server-meta">
              <span class="server-type ${server.type}">${server.type.toUpperCase()}</span>
              <span class="server-pid">PID: ${server.pid}</span>
            </div>
          </div>
          <div class="server-status">
            <div class="status-indicator ${statusColor}"></div>
            <span class="status-text">Running</span>
          </div>
        </div>
        
        <div class="server-details">
          <div class="detail-row">
            <span class="detail-label">Port:</span>
            <span class="detail-value">${server.port}</span>
          </div>
          ${server.url ? `
          <div class="detail-row">
            <span class="detail-label">URL:</span>
            <span class="detail-value">
              <a href="${server.url}" target="_blank" class="server-url" title="Open in browser">
                ${server.url} 🔗
              </a>
            </span>
          </div>` : ''}
          <div class="detail-row">
            <span class="detail-label">Category:</span>
            <span class="detail-value">${server.category || 'Other Development Servers'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Command:</span>
            <span class="detail-value command" title="${server.command}">${this.truncateCommand(server.command)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Started:</span>
            <span class="detail-value">${this.formatTime(server.startTime)}</span>
          </div>
        </div>
        
        <div class="server-actions">
          <button class="btn btn-restart" data-pid="${server.pid}" data-name="${server.name}">
            <span class="btn-icon">🔄</span>
            Restart
          </button>
          <button class="btn btn-stop" data-pid="${server.pid}" data-name="${server.name}">
            <span class="btn-icon">⏹️</span>
            Stop
          </button>
          <button class="btn btn-error-logs" data-pid="${server.pid}" data-name="${server.name}">
            <span class="btn-icon">📋</span>
            Error Logs
          </button>
          <button class="btn btn-details" data-pid="${server.pid}">
            <span class="btn-icon">ℹ️</span>
            Details
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get icon for server type
   */
  getServerIcon(type) {
    const icons = {
      'react': '⚛️',
      'node': '🟢',
      'python': '🐍',
      'static': '🌐',
      'default': '🖥️'
    };
    return icons[type] || icons.default;
  }

  /**
   * Get status color based on server state
   */
  getStatusColor(server) {
    // For now, all servers are "running" - could be extended for different states
    return 'status-running';
  }

  /**
   * Truncate command line for display
   */
  truncateCommand(command) {
    if (!command) return 'Unknown';
    if (command.length <= 50) return command;
    return command.substring(0, 47) + '...';
  }

  /**
   * Format time for display
   */
  formatTime(startTime) {
    if (!startTime) return 'Unknown';
    
    const date = new Date(startTime);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Update statistics
   */
  updateStats() {
    const stats = {
      total: this.servers.length,
      react: this.servers.filter(s => s.type === 'react').length,
      node: this.servers.filter(s => s.type === 'node').length,
      python: this.servers.filter(s => s.type === 'python').length
    };

    document.getElementById('total-servers').textContent = stats.total;
    document.getElementById('react-servers').textContent = stats.react;
    document.getElementById('node-servers').textContent = stats.node;
    document.getElementById('python-servers').textContent = stats.python;
    
    // Show/hide stop all button
    const stopAllBtn = document.getElementById('stop-all-btn');
    if (stopAllBtn) {
      stopAllBtn.style.display = stats.total > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Update empty state visibility
   */
  updateEmptyState() {
    const emptyState = document.getElementById('empty-state');
    const serversContainer = document.getElementById('servers-container');
    
    if (emptyState && serversContainer) {
      emptyState.style.display = this.servers.length === 0 ? 'block' : 'none';
      serversContainer.style.display = this.servers.length === 0 ? 'none' : 'grid';
    }
  }

  /**
   * Attach event listeners to server cards
   */
  attachServerEventListeners() {
    // Restart server buttons
    document.querySelectorAll('.btn-restart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pid = parseInt(e.target.closest('.btn-restart').dataset.pid);
        const name = e.target.closest('.btn-restart').dataset.name;
        this.restartServer(pid, name);
      });
    });

    // Stop server buttons
    document.querySelectorAll('.btn-stop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pid = parseInt(e.target.closest('.btn-stop').dataset.pid);
        const name = e.target.closest('.btn-stop').dataset.name;
        this.stopServer(pid, name);
      });
    });

    // Error logs buttons
    document.querySelectorAll('.btn-error-logs').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pid = parseInt(e.target.closest('.btn-error-logs').dataset.pid);
        const name = e.target.closest('.btn-error-logs').dataset.name;
        this.showErrorLogs(pid, name);
      });
    });

    // Details buttons
    document.querySelectorAll('.btn-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pid = parseInt(e.target.closest('.btn-details').dataset.pid);
        this.showServerDetails(pid);
      });
    });
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.isLoading = true;
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.isLoading = false;
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }

  /**
   * Show error message
   */
  showError(message) {
    this.error = message;
    const errorMessage = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
    }
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }

  /**
   * Hide error message
   */
  hideError() {
    this.error = null;
    const errorMessage = document.getElementById('error-message');
    
    if (errorMessage) errorMessage.style.display = 'none';
  }

  /**
   * Refresh server list
   */
  async refreshServers() {
    if (this.isLoading) return;
    
    this.showLoading();
    this.hideError();
    
    try {
      // This will be handled by the main process via IPC
      const servers = await window.electronAPI.getServers();
      this.updateServers(servers);
    } catch (error) {
      this.showError('Failed to refresh servers. Please try again.');
      console.error('Error refreshing servers:', error);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Stop a specific server
   */
  async stopServer(pid, serverName) {
    if (!confirm(`Are you sure you want to stop "${serverName}" (PID: ${pid})?`)) {
      return;
    }

    const stopBtn = document.querySelector(`.btn-stop[data-pid="${pid}"]`);
    const originalText = stopBtn.innerHTML;
    
    try {
      // Disable button and show loading state
      stopBtn.disabled = true;
      stopBtn.innerHTML = '<span class="btn-icon">⏳</span> Stopping...';
      
      const result = await window.electronAPI.stopServer(pid);
      
      if (result.success) {
        // Remove server from UI
        this.servers = this.servers.filter(s => s.pid !== pid);
        this.updateServers(this.servers);
        
        // Show success notification
        this.showNotification('Success', `"${serverName}" stopped successfully.`, 'success');
      } else {
        // Show error
        this.showNotification('Error', `Failed to stop "${serverName}": ${result.error}`, 'error');
        
        // Re-enable button
        stopBtn.disabled = false;
        stopBtn.innerHTML = originalText;
      }
    } catch (error) {
      this.showNotification('Error', `Error stopping server: ${error.message}`, 'error');
      
      // Re-enable button
      stopBtn.disabled = false;
      stopBtn.innerHTML = originalText;
    }
  }

  /**
   * Stop all servers
   */
  async stopAllServers() {
    if (this.servers.length === 0) return;
    
    if (!confirm(`Are you sure you want to stop all ${this.servers.length} servers?`)) {
      return;
    }

    const stopAllBtn = document.getElementById('stop-all-btn');
    const originalText = stopAllBtn.innerHTML;
    
    try {
      stopAllBtn.disabled = true;
      stopAllBtn.innerHTML = '<span class="btn-icon">⏳</span> Stopping All...';
      
      // Stop servers one by one
      const results = await Promise.allSettled(
        this.servers.map(server => window.electronAPI.stopServer(server.pid))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      // Refresh the list
      await this.refreshServers();
      
      if (failed === 0) {
        this.showNotification('Success', `All ${successful} servers stopped successfully.`, 'success');
      } else {
        this.showNotification('Partial Success', 
          `Stopped ${successful} servers, ${failed} failed to stop.`, 'warning');
      }
    } catch (error) {
      this.showNotification('Error', `Error stopping servers: ${error.message}`, 'error');
    } finally {
      stopAllBtn.disabled = false;
      stopAllBtn.innerHTML = originalText;
    }
  }

  /**
   * Show server details
   */
  async showServerDetails(pid) {
    try {
      const details = await window.electronAPI.getProcessDetails(pid);
      
      if (details) {
        this.showServerDetailsModal(details);
      } else {
        this.showNotification('Error', 'Could not fetch process details.', 'error');
      }
    } catch (error) {
      this.showNotification('Error', `Error getting process details: ${error.message}`, 'error');
    }
  }

  /**
   * Show server details modal
   */
  showServerDetailsModal(details) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('server-details-modal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'server-details-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Process Details</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h4>Basic Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <strong>PID:</strong> ${details.pid}
              </div>
              <div class="detail-item">
                <strong>Name:</strong> ${details.name}
              </div>
              <div class="detail-item">
                <strong>Parent PID:</strong> ${details.parentPid || 'N/A'}
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Command Line</h4>
            <div class="command-line">
              <code>${details.commandLine || 'N/A'}</code>
            </div>
          </div>
          
          ${details.children && details.children.length > 0 ? `
          <div class="detail-section">
            <h4>Child Processes</h4>
            <div class="child-processes">
              ${details.children.map(child => `
                <div class="child-process">
                  <strong>PID:</strong> ${child.pid}, <strong>Name:</strong> ${child.name}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
    
    // Attach close event
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  /**
   * Restart a specific server
   */
  async restartServer(pid, serverName) {
    if (!confirm(`Are you sure you want to restart "${serverName}" (PID: ${pid})?`)) {
      return;
    }

    const restartBtn = document.querySelector(`.btn-restart[data-pid="${pid}"]`);
    const originalText = restartBtn.innerHTML;
    
    try {
      // Disable button and show loading state
      restartBtn.disabled = true;
      restartBtn.innerHTML = '<span class="btn-icon">⏳</span> Restarting...';
      
      const result = await window.electronAPI.restartServer(pid);
      
      if (result.success) {
        // Show success notification
        this.showNotification('Success', `\"${serverName}\" restarted successfully. New PID: ${result.newPid}`, 'success');
        
        // Refresh the server list to show the new PID
        setTimeout(() => {
          this.refreshServers();
        }, 2000);
      } else {
        // Show error
        this.showNotification('Error', `Failed to restart \"${serverName}\": ${result.error}`, 'error');
        
        // Re-enable button
        restartBtn.disabled = false;
        restartBtn.innerHTML = originalText;
      }
    } catch (error) {
      this.showNotification('Error', `Error restarting server: ${error.message}`, 'error');
      
      // Re-enable button
      restartBtn.disabled = false;
      restartBtn.innerHTML = originalText;
    }
  }

  /**
   * Show error logs for a specific server
   */
  async showErrorLogs(pid, serverName) {
    try {
      const result = await window.electronAPI.getServerErrorLogs(pid);
      
      if (result.success) {
        this.showErrorLogsModal(serverName, result.logs, result.totalLogs, pid);
      } else {
        this.showNotification('Error', `Failed to get error logs for \"${serverName}\": ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification('Error', `Error getting error logs: ${error.message}`, 'error');
    }
  }

  /**
   * Show error logs modal
   */
  showErrorLogsModal(serverName, logs, totalLogs, pid) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('error-logs-modal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'error-logs-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    // Store PID for clearing logs
    modal.dataset.pid = pid;
    
    const logsHtml = logs.length > 0 ? logs.map(log => `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
          <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
        </div>
        <div class="log-message">${log.message}</div>
      </div>
    `).join('') : '<div class="no-logs">No error logs found for this server.</div>';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Error Logs - ${serverName} (PID: ${pid})</h3>
          <div class="modal-actions">
            <button id="copy-logs-btn" class="btn btn-primary">Copy Logs</button>
            <button id="clear-logs-btn" class="btn btn-danger">Clear Logs</button>
            <button class="modal-close">&times;</button>
          </div>
        </div>
        <div class="modal-body">
          <div class="logs-summary">
            <span>Total logs: ${totalLogs}</span>
            <span>Showing: ${logs.length} most recent</span>
          </div>
          <div class="logs-container">
            ${logsHtml}
          </div>
        </div>
      </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
    
    // Attach close event
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Copy logs button
    const copyLogsBtn = modal.querySelector('#copy-logs-btn');
    if (copyLogsBtn && logs.length > 0) {
      copyLogsBtn.addEventListener('click', () => {
        this.copyServerLogs(logs, serverName);
      });
    } else if (copyLogsBtn) {
      // Disable copy button if no logs
      copyLogsBtn.disabled = true;
      copyLogsBtn.title = 'No logs to copy';
    }

    // Clear logs button
    const clearLogsBtn = modal.querySelector('#clear-logs-btn');
    if (clearLogsBtn && logs.length > 0) {
      clearLogsBtn.addEventListener('click', () => {
        this.clearServerErrorLogs(serverName, modal);
      });
    } else if (clearLogsBtn) {
      // Disable clear button if no logs
      clearLogsBtn.disabled = true;
      clearLogsBtn.title = 'No logs to clear';
    }
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  /**
   * Copy server logs to clipboard
   */
  copyServerLogs(logs, serverName) {
    try {
      // Format logs for copying
      const header = `Error Logs for ${serverName}\nGenerated: ${new Date().toLocaleString()}\nTotal Logs: ${logs.length}\n${'='.repeat(50)}\n\n`;
      
      const logText = logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const level = log.level.toUpperCase();
        const message = log.message;
        return `[${timestamp}] [${level}] ${message}`;
      }).join('\n');

      const textToCopy = header + logText;

      // Copy to clipboard
      if (navigator.clipboard && window.isSecureContext) {
        // Modern browsers with secure context
        navigator.clipboard.writeText(textToCopy).then(() => {
          this.showNotification('Success', `Copied ${logs.length} log entries to clipboard`, 'success');
        }).catch(err => {
          this.fallbackCopyText(textToCopy, logs.length);
        });
      } else {
        // Fallback for older browsers
        this.fallbackCopyText(textToCopy, logs.length);
      }
    } catch (error) {
      this.showNotification('Error', `Error copying logs: ${error.message}`, 'error');
    }
  }

  /**
   * Fallback method for copying text to clipboard
   */
  fallbackCopyText(text, logCount) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        this.showNotification('Success', `Copied ${logCount} log entries to clipboard`, 'success');
      } else {
        this.showNotification('Error', 'Failed to copy logs to clipboard', 'error');
      }
    } catch (error) {
      this.showNotification('Error', `Error copying logs: ${error.message}`, 'error');
    }
  }

  /**
   * Clear server error logs
   */
  async clearServerErrorLogs(serverName, modal) {
    try {
      // Extract PID from server name or find a better way to get it
      // For now, we'll need to store the PID in a data attribute
      const pid = modal.dataset.pid;
      if (!pid) {
        this.showNotification('Error', 'Could not determine server PID', 'error');
        return;
      }
      
      const result = await window.electronAPI.clearServerErrorLogs(parseInt(pid));
      
      if (result.success) {
        this.showNotification('Success', result.message, 'success');
        modal.style.display = 'none';
      } else {
        this.showNotification('Error', result.error, 'error');
      }
    } catch (error) {
      this.showNotification('Error', `Error clearing logs: ${error.message}`, 'error');
    }
  }

  /**
   * Show notification
   */
  showNotification(title, message, type = 'info') {
    // Create notification if it doesn't exist
    let notification = document.getElementById('notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      document.body.appendChild(notification);
    }
    
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">&times;</button>
      </div>
    `;
    
    // Show notification
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
    
    // Attach close event
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      notification.style.display = 'none';
    });
  }
}

module.exports = ServerList;