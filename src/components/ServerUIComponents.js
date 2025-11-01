/**
 * UI Components Module for ServerList
 * Handles rendering and HTML generation for server cards, modals, and templates
 */

class ServerUIComponents {
  /**
   * Render the main server list container
   * @returns {string} HTML string for the server list container
   */
  renderServerListContainer() {
    return `
      <div class="server-list-container">
        <div class="server-list-header">
          <h2>Active Development Servers</h2>
          <div class="server-actions">
            <button id="refresh-btn" class="btn btn-primary">
              <span class="refresh-icon">↻</span> Refresh
            </button>
            <button id="stop-all-btn" class="btn btn-danger" style="display: none;">
              <span class="stop-icon">×</span> Stop All
            </button>
          </div>
        </div>

        <div id="loading-indicator" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Detecting servers...</p>
        </div>

        <div id="error-message" class="error-message" style="display: none;"></div>

        <div id="empty-state" class="empty-state">
          <div class="empty-icon">⚠</div>
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
   * Create HTML for a single server card
   * @param {Object} server - Server object
   * @param {Function} sanitizeCommand - Function to sanitize command
   * @param {Function} formatTime - Function to format time
   * @param {Function} getServerIcon - Function to get server icon
   * @param {Function} getStatusColor - Function to get status color
   * @param {Function} truncateCommand - Function to truncate command
   * @returns {string} HTML string for server card
   */
  createServerCard(server, sanitizeCommand, formatTime, getServerIcon, getStatusColor, truncateCommand) {
    const serverIcon = getServerIcon(server.type);
    const statusColor = getStatusColor(server);

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
                ${server.url} →
              </a>
            </span>
          </div>` : ''}
          <div class="detail-row">
            <span class="detail-label">Category:</span>
            <span class="detail-value">${server.category || 'Other Development Servers'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Command:</span>
            <span class="detail-value command" title="${sanitizeCommand(server.command)}">${truncateCommand(sanitizeCommand(server.command))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Started:</span>
            <span class="detail-value">${formatTime(server.startTime)}</span>
          </div>
        </div>

        <div class="server-actions">
          <button class="btn btn-restart" data-pid="${server.pid}" data-name="${server.name}">
            <span class="btn-icon">↻</span>
            Restart
          </button>
          <button class="btn btn-stop" data-pid="${server.pid}" data-name="${server.name}">
            <span class="btn-icon">■</span>
            Stop
          </button>
          <button class="btn btn-error-logs" data-pid="${server.pid}" data-name="${server.name}">
            <span class="btn-icon">⚠</span>
            Error Logs
          </button>
          <button class="btn btn-details" data-pid="${server.pid}">
            <span class="btn-icon">ⓘ</span>
            Details
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Create server details modal HTML
   * @param {Object} details - Process details
   * @param {Function} sanitizeCommand - Function to sanitize command
   * @returns {string} HTML string for modal
   */
  createServerDetailsModal(details, sanitizeCommand) {
    return `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Process Details</h3>
          <button class="modal-close">×</button>
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
              <code>${sanitizeCommand(details.commandLine) || 'N/A'}</code>
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
  }

  /**
   * Create error logs modal HTML
   * @param {string} serverName - Server name
   * @param {Array} logs - Array of log entries
   * @param {number} totalLogs - Total number of logs
   * @param {number} pid - Process ID
   * @returns {string} HTML string for modal
   */
  createErrorLogsModal(serverName, logs, totalLogs, pid) {
    const logsHtml = logs.length > 0 ? logs.map(log => `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
          <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
        </div>
        <div class="log-message">${log.message}</div>
      </div>
    `).join('') : '<div class="no-logs">No error logs found for this server.</div>';

    return `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Error Logs - ${serverName} (PID: ${pid})</h3>
          <div class="modal-actions">
            <button id="copy-logs-btn" class="btn btn-primary">Copy Logs</button>
            <button id="clear-logs-btn" class="btn btn-danger">Clear Logs</button>
            <button class="modal-close">×</button>
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
  }

  /**
   * Create notification HTML
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, success, error, warning)
   * @returns {string} HTML string for notification
   */
  createNotification(title, message, type = 'info') {
    return `
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">&times;</button>
      </div>
    `;
  }

  /**
   * Update empty state visibility
   * @param {boolean} isEmpty - Whether the server list is empty
   */
  updateEmptyState(isEmpty) {
    const emptyState = document.getElementById('empty-state');
    const serversContainer = document.getElementById('servers-container');

    if (emptyState && serversContainer) {
      emptyState.style.display = isEmpty ? 'block' : 'none';
      serversContainer.style.display = isEmpty ? 'none' : 'grid';
    }
  }

  /**
   * Update statistics display
   * @param {Object} stats - Statistics object
   */
  updateStats(stats) {
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
   * Show loading state
   */
  showLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
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
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) errorMessage.style.display = 'none';
  }

  /**
   * Show modal
   * @param {HTMLElement} modal - Modal element
   */
  showModal(modal) {
    if (modal) {
      modal.style.display = 'block';
    }
  }

  /**
   * Hide modal
   * @param {HTMLElement} modal - Modal element
   */
  hideModal(modal) {
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Setup modal event listeners
   * @param {HTMLElement} modal - Modal element
   * @param {Function} onClose - Close callback function
   */
  setupModalEvents(modal, onClose) {
    if (!modal) return;

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideModal(modal);
        if (onClose) onClose();
      });
    }

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal(modal);
        if (onClose) onClose();
      }
    });
  }

  /**
   * Show notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   */
  showNotification(title, message, type = 'info') {
    let notification = document.getElementById('notification');

    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      document.body.appendChild(notification);
    }

    notification.className = `notification notification-${type}`;
    notification.innerHTML = this.createNotification(title, message, type);

    // Show notification
    notification.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);

    // Attach close event
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.style.display = 'none';
      });
    }
  }
}

module.exports = ServerUIComponents;