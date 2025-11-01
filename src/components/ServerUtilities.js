/**
 * Utility Functions Module for ServerList
 * Provides helper functions for formatting, sanitization, and data processing
 */

class ServerUtilities {
  /**
   * Get icon for server type
   * @param {string} type - Server type
   * @returns {string} Icon emoji
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
   * @param {Object} server - Server object
   * @returns {string} CSS class for status color
   */
  getStatusColor(server) {
    // For now, all servers are "running" - could be extended for different states
    return 'status-running';
  }

  /**
   * Truncate command line for display
   * @param {string} command - Command line
   * @param {number} maxLength - Maximum length (default: 50)
   * @returns {string} Truncated command
   */
  truncateCommand(command, maxLength = 50) {
    if (!command) return 'Unknown';
    if (command.length <= maxLength) return command;
    return command.substring(0, maxLength - 3) + '...';
  }

  /**
   * Sanitize command line to remove sensitive information
   * @param {string} command - Original command line
   * @returns {string} Sanitized command line
   */
  sanitizeCommand(command) {
    if (!command) return 'Unknown';

    let sanitized = command;

    // Remove sensitive information like passwords, tokens, keys
    const sensitivePatterns = [
      /password=[^\s]+/gi,
      /token=[^\s]+/gi,
      /key=[^\s]+/gi,
      /secret=[^\s]+/gi,
      /auth=[^\s]+/gi,
      /credential=[^\s]+/gi
    ];

    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, match => {
        const key = match.split('=')[0];
        return `${key}=***REDACTED***`;
      });
    });

    return sanitized;
  }

  /**
   * Format time for display
   * @param {string|Date} startTime - Start time
   * @returns {string} Formatted time string
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
   * Calculate statistics from server list
   * @param {Array} servers - Array of server objects
   * @returns {Object} Statistics object
   */
  calculateStats(servers) {
    return {
      total: servers.length,
      react: servers.filter(s => s.type === 'react').length,
      node: servers.filter(s => s.type === 'node').length,
      python: servers.filter(s => s.type === 'python').length
    };
  }

  /**
   * Format logs for copying to clipboard
   * @param {Array} logs - Array of log entries
   * @param {string} serverName - Server name
   * @returns {string} Formatted log text
   */
  formatLogsForCopy(logs, serverName) {
    const header = `Error Logs for ${serverName}\nGenerated: ${new Date().toLocaleString()}\nTotal Logs: ${logs.length}\n${'='.repeat(50)}\n\n`;

    const logText = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const level = log.level.toUpperCase();
      const message = log.message;
      return `[${timestamp}] [${level}] ${message}`;
    }).join('\n');

    return header + logText;
  }

  /**
   * Copy text to clipboard using modern API
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fallback method for copying text to clipboard
   * @param {string} text - Text to copy
   * @returns {boolean} Success status
   */
  fallbackCopyToClipboard(text) {
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

      return successful;
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy server logs to clipboard
   * @param {Array} logs - Array of log entries
   * @param {string} serverName - Server name
   * @param {Function} showNotification - Function to show notifications
   * @returns {Promise<void>}
   */
  async copyServerLogs(logs, serverName, showNotification) {
    try {
      const textToCopy = this.formatLogsForCopy(logs, serverName);

      // Try modern clipboard API first
      const success = await this.copyToClipboard(textToCopy);

      if (success) {
        showNotification('Success', `Copied ${logs.length} log entries to clipboard`, 'success');
      } else {
        // Fallback for older browsers
        const fallbackSuccess = this.fallbackCopyToClipboard(textToCopy);
        if (fallbackSuccess) {
          showNotification('Success', `Copied ${logs.length} log entries to clipboard`, 'success');
        } else {
          showNotification('Error', 'Failed to copy logs to clipboard', 'error');
        }
      }
    } catch (error) {
      showNotification('Error', `Error copying logs: ${error.message}`, 'error');
    }
  }

  /**
   * Get element by selector with error handling
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null} Found element or null
   */
  getElement(selector) {
    try {
      return document.querySelector(selector);
    } catch (error) {
      console.error(`Error getting element with selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * Get elements by selector with error handling
   * @param {string} selector - CSS selector
   * @returns {NodeList} Found elements
   */
  getElements(selector) {
    try {
      return document.querySelectorAll(selector);
    } catch (error) {
      console.error(`Error getting elements with selector "${selector}":`, error);
      return [];
    }
  }

  /**
   * Safe parseInt with error handling
   * @param {string|number} value - Value to parse
   * @returns {number|null} Parsed integer or null
   */
  safeParseInt(value) {
    try {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    } catch (error) {
      console.error(`Error parsing integer from value "${value}":`, error);
      return null;
    }
  }

  /**
   * Get data attribute from element
   * @param {HTMLElement} element - DOM element
   * @param {string} attribute - Data attribute name
   * @returns {string|null} Attribute value or null
   */
  getDataAttribute(element, attribute) {
    if (!element) return null;
    return element.dataset[attribute] || null;
  }

  /**
   * Find parent element by selector
   * @param {HTMLElement} element - Starting element
   * @param {string} selector - Parent selector
   * @returns {HTMLElement|null} Found parent element or null
   */
  findParent(element, selector) {
    if (!element) return null;

    let parent = element.parentElement;
    while (parent) {
      if (parent.matches(selector)) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  /**
   * Disable button with loading state
   * @param {HTMLElement} button - Button element
   * @param {string} loadingText - Loading text
   * @returns {string} Original HTML content
   */
  setButtonLoading(button, loadingText = 'Loading...') {
    if (!button) return '';

    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="btn-icon">⏳</span> ${loadingText}`;

    return originalText;
  }

  /**
   * Restore button to original state
   * @param {HTMLElement} button - Button element
   * @param {string} originalText - Original HTML content
   */
  restoreButton(button, originalText) {
    if (!button) return;

    button.disabled = false;
    button.innerHTML = originalText;
  }

  /**
   * Confirm action with user
   * @param {string} message - Confirmation message
   * @returns {boolean} User's choice
   */
  confirmAction(message) {
    return confirm(message);
  }

  /**
   * Debounce function to limit execution frequency
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Throttle function to limit execution frequency
   * @param {Function} func - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, delay) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }
}

module.exports = ServerUtilities;