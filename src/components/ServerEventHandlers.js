/**
 * Event Handlers Module for ServerList
 * Handles all user interactions and button click events
 */

class ServerEventHandlers {
  constructor(serverList) {
    this.serverList = serverList;
  }

  /**
   * Attach main event listeners
   */
  attachMainEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const stopAllBtn = document.getElementById('stop-all-btn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.serverList.refreshServers());
    }

    if (stopAllBtn) {
      stopAllBtn.addEventListener('click', () => this.serverList.stopAllServers());
    }
  }

  /**
   * Attach event listeners to server cards
   */
  attachServerEventListeners() {
    // Restart server buttons
    const restartButtons = this.serverList.utils.getElements('.btn-restart');
    restartButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get the button element (could be the target or a parent)
        const button = e.target.closest('.btn-restart') || btn;

        const pid = this.serverList.utils.safeParseInt(
          this.serverList.utils.getDataAttribute(button, 'pid')
        );
        const name = this.serverList.utils.getDataAttribute(button, 'name');

        console.log('Restart button clicked:', { pid, name, button: button.outerHTML });

        if (pid && name) {
          this.serverList.restartServer(pid, name);
        } else {
          console.error('Missing PID or name for restart:', { pid, name });
          this.serverList.ui.showNotification('Error', 'Could not restart server - missing information', 'error');
        }
      });
    });

    // Stop server buttons
    const stopButtons = this.serverList.utils.getElements('.btn-stop');
    stopButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get the button element (could be the target or a parent)
        const button = e.target.closest('.btn-stop') || btn;

        const pid = this.serverList.utils.safeParseInt(
          this.serverList.utils.getDataAttribute(button, 'pid')
        );
        const name = this.serverList.utils.getDataAttribute(button, 'name');

        console.log('Stop button clicked:', { pid, name, button: button.outerHTML });

        if (pid && name) {
          this.serverList.stopServer(pid, name);
        } else {
          console.error('Missing PID or name for stop:', { pid, name });
          this.serverList.ui.showNotification('Error', 'Could not stop server - missing information', 'error');
        }
      });
    });

    // Error logs buttons
    const errorLogsButtons = this.serverList.utils.getElements('.btn-error-logs');
    errorLogsButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get the button element (could be the target or a parent)
        const button = e.target.closest('.btn-error-logs') || btn;

        const pid = this.serverList.utils.safeParseInt(
          this.serverList.utils.getDataAttribute(button, 'pid')
        );
        const name = this.serverList.utils.getDataAttribute(button, 'name');

        console.log('Error logs button clicked:', { pid, name, button: button.outerHTML });

        if (pid && name) {
          this.serverList.showErrorLogs(pid, name);
        } else {
          console.error('Missing PID or name for error logs:', { pid, name });
          this.serverList.ui.showNotification('Error', 'Could not show error logs - missing information', 'error');
        }
      });
    });

    // Details buttons
    const detailsButtons = this.serverList.utils.getElements('.btn-details');
    detailsButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pid = this.serverList.utils.safeParseInt(
          this.serverList.utils.getDataAttribute(
            this.serverList.utils.findParent(e.target, '.btn-details'),
            'pid'
          )
        );

        if (pid) {
          this.serverList.showServerDetails(pid);
        }
      });
    });
  }

  /**
   * Setup modal close events
   * @param {HTMLElement} modal - Modal element
   * @param {Function} onClose - Close callback
   */
  setupModalCloseEvents(modal, onClose) {
    if (!modal) return;

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.serverList.ui.hideModal(modal);
        if (onClose) onClose();
      });
    }

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.serverList.ui.hideModal(modal);
        if (onClose) onClose();
      }
    });
  }

  /**
   * Setup error logs modal events
   * @param {HTMLElement} modal - Modal element
   * @param {string} serverName - Server name
   */
  setupErrorLogsModalEvents(modal, serverName) {
    if (!modal) return;

    const copyLogsBtn = modal.querySelector('#copy-logs-btn');
    const clearLogsBtn = modal.querySelector('#clear-logs-btn');
    const pid = this.serverList.utils.safeParseInt(modal.dataset.pid);

    // Copy logs button
    if (copyLogsBtn) {
      // Check if there are logs to copy
      const hasLogs = modal.querySelector('.log-entry');
      if (!hasLogs) {
        copyLogsBtn.disabled = true;
        copyLogsBtn.title = 'No logs to copy';
      } else {
        copyLogsBtn.addEventListener('click', () => {
          // Get logs from modal
          const logEntries = [];
          const logElements = modal.querySelectorAll('.log-entry');
          logElements.forEach(logEl => {
            const timestamp = logEl.querySelector('.log-timestamp')?.textContent || '';
            const level = logEl.querySelector('.log-level')?.textContent || 'info';
            const message = logEl.querySelector('.log-message')?.textContent || '';
            logEntries.push({ timestamp, level: level.toLowerCase(), message });
          });

          this.serverList.utils.copyServerLogs(logEntries, serverName, this.serverList.ui.showNotification);
        });
      }
    }

    // Clear logs button
    if (clearLogsBtn) {
      const hasLogs = modal.querySelector('.log-entry');
      if (!hasLogs) {
        clearLogsBtn.disabled = true;
        clearLogsBtn.title = 'No logs to clear';
      } else {
        clearLogsBtn.addEventListener('click', () => {
          this.serverList.clearServerErrorLogs(serverName, modal);
        });
      }
    }

    // Setup close events
    this.setupModalCloseEvents(modal);
  }

  /**
   * Handle server restart action
   * @param {number} pid - Process ID
   * @param {string} serverName - Server name
   */
  async handleRestartServer(pid, serverName) {
    console.log(`Restarting server: ${serverName} (PID: ${pid})`);

    if (!this.serverList.utils.confirmAction(`Are you sure you want to restart "${serverName}" (PID: ${pid})?`)) {
      console.log('Restart action cancelled by user');
      return;
    }

    const restartBtn = this.serverList.utils.getElement(`.btn-restart[data-pid="${pid}"]`);
    if (!restartBtn) {
      console.error('Restart button not found for PID:', pid);
      return;
    }

    // Prevent double-clicking
    if (restartBtn.disabled) {
      console.log('Restart button already disabled, ignoring click');
      return;
    }

    const originalText = this.serverList.utils.setButtonLoading(restartBtn, 'Restarting...');

    try {
      // Check if electronAPI is available
      if (typeof window.electronAPI === 'undefined') {
        throw new Error('Electron API not available. Please restart the application.');
      }

      console.log('Calling restartServer API...');
      const result = await window.electronAPI.restartServer(pid);
      console.log('Restart server result:', result);

      if (result.success) {
        this.serverList.ui.showNotification('Success', `"${serverName}" restarted successfully. New PID: ${result.newPid}`, 'success');

        // Refresh the server list to show the new PID
        setTimeout(() => {
          this.serverList.refreshServers();
        }, 2000);
      } else {
        console.error(`Failed to restart server "${serverName}":`, result.error);
        this.serverList.ui.showNotification('Error', `Failed to restart "${serverName}": ${result.error}`, 'error');
        this.serverList.utils.restoreButton(restartBtn, originalText);
      }
    } catch (error) {
      console.error('Error restarting server:', error);
      this.serverList.ui.showNotification('Error', `Error restarting server: ${error.message}`, 'error');
      this.serverList.utils.restoreButton(restartBtn, originalText);
    }
  }

  /**
   * Handle server stop action
   * @param {number} pid - Process ID
   * @param {string} serverName - Server name
   */
  async handleStopServer(pid, serverName) {
    console.log(`Stopping server: ${serverName} (PID: ${pid})`);

    if (!this.serverList.utils.confirmAction(`Are you sure you want to stop "${serverName}" (PID: ${pid})?`)) {
      console.log('Stop action cancelled by user');
      return;
    }

    const stopBtn = this.serverList.utils.getElement(`.btn-stop[data-pid="${pid}"]`);
    if (!stopBtn) {
      console.error('Stop button not found for PID:', pid);
      return;
    }

    // Prevent double-clicking
    if (stopBtn.disabled) {
      console.log('Stop button already disabled, ignoring click');
      return;
    }

    const originalText = this.serverList.utils.setButtonLoading(stopBtn, 'Stopping...');

    try {
      // Check if electronAPI is available
      if (typeof window.electronAPI === 'undefined') {
        throw new Error('Electron API not available. Please restart the application.');
      }

      console.log('Calling stopServer API...');
      const result = await window.electronAPI.stopServer(pid);
      console.log('Stop server result:', result);

      if (result.success) {
        // Remove server from UI
        this.serverList.servers = this.serverList.servers.filter(s => s.pid !== pid);
        this.serverList.updateServers(this.serverList.servers);

        // Show success notification
        this.serverList.ui.showNotification('Success', `"${serverName}" stopped successfully.`, 'success');
      } else {
        // Show error and log it
        console.error(`Failed to stop server "${serverName}":`, result.error);
        this.serverList.ui.showNotification('Error', `Failed to stop "${serverName}": ${result.error}`, 'error');
        this.serverList.utils.restoreButton(stopBtn, originalText);
      }
    } catch (error) {
      console.error('Error stopping server:', error);
      this.serverList.ui.showNotification('Error', `Error stopping server: ${error.message}`, 'error');
      this.serverList.utils.restoreButton(stopBtn, originalText);
    }
  }

  /**
   * Handle stop all servers action
   * @param {Array} servers - Array of server objects
   */
  async handleStopAllServers(servers) {
    if (servers.length === 0) return;

    if (!this.serverList.utils.confirmAction(`Are you sure you want to stop all ${servers.length} servers?`)) {
      return;
    }

    const stopAllBtn = this.serverList.utils.getElement('#stop-all-btn');
    const originalText = this.serverList.utils.setButtonLoading(stopAllBtn, 'Stopping All...');

    try {
      // Stop servers one by one
      const results = await Promise.allSettled(
        servers.map(server => window.electronAPI.stopServer(server.pid))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      // Refresh the list
      await this.serverList.refreshServers();

      if (failed === 0) {
        this.serverList.ui.showNotification('Success', `All ${successful} servers stopped successfully.`, 'success');
      } else {
        this.serverList.ui.showNotification('Partial Success',
          `Stopped ${successful} servers, ${failed} failed to stop.`, 'warning');
      }
    } catch (error) {
      this.serverList.ui.showNotification('Error', `Error stopping servers: ${error.message}`, 'error');
    } finally {
      this.serverList.utils.restoreButton(stopAllBtn, originalText);
    }
  }

  /**
   * Handle server details action
   * @param {number} pid - Process ID
   */
  async handleServerDetails(pid) {
    try {
      const details = await window.electronAPI.getProcessDetails(pid);

      if (details) {
        this.serverList.showServerDetailsModal(details);
      } else {
        this.serverList.ui.showNotification('Error', 'Could not fetch process details.', 'error');
      }
    } catch (error) {
      this.serverList.ui.showNotification('Error', `Error getting process details: ${error.message}`, 'error');
    }
  }

  /**
   * Handle show error logs action
   * @param {number} pid - Process ID
   * @param {string} serverName - Server name
   */
  async handleErrorLogs(pid, serverName) {
    try {
      const result = await window.electronAPI.getServerErrorLogs(pid);

      if (result.success) {
        this.serverList.showErrorLogsModal(serverName, result.logs, result.totalLogs, pid);
      } else {
        this.serverList.ui.showNotification('Error', `Failed to get error logs for "${serverName}": ${result.error}`, 'error');
      }
    } catch (error) {
      this.serverList.ui.showNotification('Error', `Error getting error logs: ${error.message}`, 'error');
    }
  }

  /**
   * Handle clear server error logs action
   * @param {string} serverName - Server name
   * @param {HTMLElement} modal - Modal element
   */
  async handleClearServerErrorLogs(serverName, modal) {
    try {
      const pid = this.serverList.utils.safeParseInt(modal.dataset.pid);
      if (!pid) {
        this.serverList.ui.showNotification('Error', 'Could not determine server PID', 'error');
        return;
      }

      const result = await window.electronAPI.clearServerErrorLogs(pid);

      if (result.success) {
        this.serverList.ui.showNotification('Success', result.message, 'success');
        this.serverList.ui.hideModal(modal);
      } else {
        this.serverList.ui.showNotification('Error', result.error, 'error');
      }
    } catch (error) {
      this.serverList.ui.showNotification('Error', `Error clearing logs: ${error.message}`, 'error');
    }
  }
}

module.exports = ServerEventHandlers;