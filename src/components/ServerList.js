/**
 * Server List Component
 * Main coordinator for server management UI
 * Refactored to use modular components
 */

const ServerUIComponents = require('./ServerUIComponents');
const ServerUtilities = require('./ServerUtilities');
const ServerEventHandlers = require('./ServerEventHandlers');

class ServerList {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.servers = [];
    this.isLoading = false;
    this.error = null;

    // Initialize modules
    this.ui = new ServerUIComponents();
    this.utils = new ServerUtilities();
    this.eventHandlers = new ServerEventHandlers(this);

    this.init();
  }

  init() {
    this.container.innerHTML = this.ui.renderServerListContainer();
    this.eventHandlers.attachMainEventListeners();
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

    container.innerHTML = this.servers.map(server =>
      this.ui.createServerCard(
        server,
        this.utils.sanitizeCommand.bind(this.utils),
        this.utils.formatTime.bind(this.utils),
        this.utils.getServerIcon.bind(this.utils),
        this.utils.getStatusColor.bind(this.utils),
        this.utils.truncateCommand.bind(this.utils)
      )
    ).join('');

    // Attach event listeners to server cards
    this.eventHandlers.attachServerEventListeners();
  }

  /**
   * Update statistics
   */
  updateStats() {
    const stats = this.utils.calculateStats(this.servers);
    this.ui.updateStats(stats);
  }

  /**
   * Update empty state visibility
   */
  updateEmptyState() {
    this.ui.updateEmptyState(this.servers.length === 0);
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.isLoading = true;
    this.ui.showLoading();
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.isLoading = false;
    this.ui.hideLoading();
  }

  /**
   * Show error message
   */
  showError(message) {
    this.error = message;
    this.ui.showError(message);
  }

  /**
   * Hide error message
   */
  hideError() {
    this.error = null;
    this.ui.hideError();
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
    await this.eventHandlers.handleStopServer(pid, serverName);
  }

  /**
   * Stop all servers
   */
  async stopAllServers() {
    await this.eventHandlers.handleStopAllServers(this.servers);
  }

  /**
   * Show server details
   */
  async showServerDetails(pid) {
    await this.eventHandlers.handleServerDetails(pid);
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

    modal.innerHTML = this.ui.createServerDetailsModal(
      details,
      this.utils.sanitizeCommand.bind(this.utils)
    );

    // Show modal
    this.ui.showModal(modal);

    // Setup close events
    this.eventHandlers.setupModalCloseEvents(modal);
  }

  /**
   * Restart a specific server
   */
  async restartServer(pid, serverName) {
    await this.eventHandlers.handleRestartServer(pid, serverName);
  }

  /**
   * Show error logs for a specific server
   */
  async showErrorLogs(pid, serverName) {
    await this.eventHandlers.handleErrorLogs(pid, serverName);
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

    modal.innerHTML = this.ui.createErrorLogsModal(serverName, logs, totalLogs, pid);

    // Show modal
    this.ui.showModal(modal);

    // Setup modal events
    this.eventHandlers.setupErrorLogsModalEvents(modal, serverName);
  }

  /**
   * Clear server error logs
   */
  async clearServerErrorLogs(serverName, modal) {
    await this.eventHandlers.handleClearServerErrorLogs(serverName, modal);
  }

  /**
   * Show notification (delegated to UI module)
   */
  showNotification(title, message, type = 'info') {
    this.ui.showNotification(title, message, type);
  }
}

module.exports = ServerList;