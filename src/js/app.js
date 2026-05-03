/**
 * SWIM_SCORE_PRO v3.0.4-STABLE - Main Application JavaScript
 * Implements: SecurityManager, DataStorage, EventManager, WebServer, LivePanelUI
 */

// ============================================
// DESIGN TOKENS & CONFIGURATION
// ============================================

const CONFIG = {
  version: '3.0.4-STABLE',
  apiBaseUrl: '/api/v1',
  pollingInterval: 2000, // 2s for live feed
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  maxLoginAttempts: 3,
  otpLength: 6,
  debounceDelay: 300,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
  // Debounce function for search/filter inputs
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format time as HH:MM:SS.MS
  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  },

  // Parse time string to milliseconds
  parseTime(timeStr) {
    const regex = /^(\d{2}):(\d{2}):(\d{2})\.(\d{2})$/;
    const match = timeStr.match(regex);
    if (!match) return null;

    const [, hours, minutes, seconds, ms] = match;
    return (
      parseInt(hours, 10) * 3600000 +
      parseInt(minutes, 10) * 60000 +
      parseInt(seconds, 10) * 1000 +
      parseInt(ms, 10) * 10
    );
  },

  // Validate email format
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Get current UTC timestamp
  getUTCTimestamp() {
    return new Date().toISOString().replace('T', ' ').substr(0, 19);
  },

  // Export data as CSV
  exportCSV(data, filename) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  },
};

// ============================================
// DATA STORAGE MODULE
// ============================================

const DataStorage = {
  storage: localStorage,

  get(key) {
    try {
      const item = this.storage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error('DataStorage.get error:', err);
      return null;
    }
  },

  set(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('DataStorage.set error:', err);
      return false;
    }
  },

  remove(key) {
    try {
      this.storage.removeItem(key);
      return true;
    } catch (err) {
      console.error('DataStorage.remove error:', err);
      return false;
    }
  },

  clear() {
    try {
      this.storage.clear();
      return true;
    } catch (err) {
      console.error('DataStorage.clear error:', err);
      return false;
    }
  },
};

// ============================================
// SECURITY MANAGER MODULE
// ============================================

const SecurityManager = {
  currentUser: null,
  loginAttempts: 0,
  lockoutUntil: null,
  sessionTimer: null,
  sessionStartTime: null,

  init() {
    this.checkExistingSession();
    this.setupSessionTimeoutWarning();
  },

  checkExistingSession() {
    const session = DataStorage.get('ssp_session');
    if (session && session.expiresAt > Date.now()) {
      this.currentUser = session.user;
      this.startSessionTimer();
      return true;
    }
    this.logout();
    return false;
  },

  async login(email, password, otp) {
    // Check lockout
    if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
      return {
        success: false,
        error: 'Account locked',
        lockoutRemaining: this.lockoutUntil - Date.now()
      };
    }

    // Validate credentials (mock - would be API call in production)
    if (!this.validateCredentials(email, password, otp)) {
      this.loginAttempts++;

      if (this.loginAttempts >= CONFIG.maxLoginAttempts) {
        this.lockoutUntil = Date.now() + CONFIG.lockoutDuration;
        return {
          success: false,
          error: 'Account locked',
          lockoutRemaining: CONFIG.lockoutDuration
        };
      }

      return {
        success: false,
        error: 'Invalid credentials',
        attemptsRemaining: CONFIG.maxLoginAttempts - this.loginAttempts
      };
    }

    // Success
    this.loginAttempts = 0;
    this.currentUser = {
      id: Utils.generateId(),
      email,
      role: this.determineRole(email),
      name: email.split('@')[0]
    };

    this.sessionStartTime = Date.now();
    const session = {
      user: this.currentUser,
      expiresAt: Date.now() + CONFIG.sessionTimeout,
      token: Utils.generateId()
    };

    DataStorage.set('ssp_session', session);
    this.startSessionTimer();

    return {
      success: true,
      user: this.currentUser
    };
  },

  validateCredentials(email, password, otp) {
    // Mock validation - in production this would be an API call
    const validEmails = ['admin.sys@swimscore.pro', 'timekeeper@swimscore.pro', 'viewer@swimscore.pro'];
    const validPassword = 'password123';
    const validOTP = '123456';

    return validEmails.includes(email) &&
           password === validPassword &&
           otp === validOTP;
  },

  determineRole(email) {
    if (email.includes('admin')) return 'ADMIN';
    if (email.includes('timekeeper')) return 'TIMEKEEPER';
    return 'VIEWER';
  },

  logout() {
    this.currentUser = null;
    this.stopSessionTimer();
    DataStorage.remove('ssp_session');
    window.location.href = '/pages/login.html';
  },

  startSessionTimer() {
    this.stopSessionTimer();
    this.sessionTimer = setInterval(() => {
      const session = DataStorage.get('ssp_session');
      if (!session) {
        this.logout();
        return;
      }

      const remaining = session.expiresAt - Date.now();
      if (remaining <= 0) {
        this.logout();
        return;
      }

      // Warn at 5 minutes
      if (remaining <= 5 * 60 * 1000 && remaining > 4 * 60 * 1000) {
        this.showSessionWarning(remaining);
      }

      // Update session timer display
      this.updateSessionTimerDisplay(remaining);
    }, 1000);
  },

  stopSessionTimer() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  },

  showSessionWarning(remaining) {
    const modal = document.getElementById('session-warning-modal');
    if (modal) {
      modal.classList.remove('hidden');
      const countdownEl = modal.querySelector('.countdown');
      if (countdownEl) {
        countdownEl.textContent = Utils.formatTime(remaining);
      }
    }
  },

  extendSession() {
    const session = DataStorage.get('ssp_session');
    if (session) {
      session.expiresAt = Date.now() + CONFIG.sessionTimeout;
      DataStorage.set('ssp_session', session);
      const modal = document.getElementById('session-warning-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
      Toast.show('Session extended', 'success');
    }
  },

  updateSessionTimerDisplay(remainingMs) {
    const el = document.getElementById('session-timer');
    if (el) {
      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      el.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  },

  hasPermission(permission) {
    if (!this.currentUser) return false;

    const rolePermissions = {
      ADMIN: ['all'],
      TIMEKEEPER: ['edit_times', 'manage_heats', 'view_logs'],
      VIEWER: ['view_only']
    };

    const permissions = rolePermissions[this.currentUser.role] || [];
    return permissions.includes('all') || permissions.includes(permission);
  },

  getLockoutRemaining() {
    if (!this.lockoutUntil) return 0;
    return Math.max(0, this.lockoutUntil - Date.now());
  },
};

// ============================================
// EVENT MANAGER MODULE
// ============================================

const EventManager = {
  listeners: {},

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Event handler error for ${event}:`, err);
      }
    });
  },

  // Specific event handlers
  onTimeSubmitted(data) {
    this.emit('time:submitted', data);
    // Update live feed
    LivePanelUI.updateResults(data);
  },

  onHeatStarted(data) {
    this.emit('heat:started', data);
  },

  onHeatCompleted(data) {
    this.emit('heat:completed', data);
  },

  onUserChanged(data) {
    this.emit('user:changed', data);
  },

  onSettingsChanged(data) {
    this.emit('settings:changed', data);
  },
};

// ============================================
// LIVE PANEL UI MODULE
// ============================================

const LivePanelUI = {
  pollingInterval: null,
  isAutoRefreshEnabled: true,
  lastUpdateTime: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 3,

  init() {
    this.setupAutoRefresh();
    this.setupFilters();
    this.setupExport();
    this.loadInitialData();
  },

  setupAutoRefresh() {
    const toggle = document.getElementById('auto-refresh-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
        toggle.setAttribute('aria-checked', this.isAutoRefreshEnabled);

        if (this.isAutoRefreshEnabled) {
          this.startPolling();
          Toast.show('Auto-refresh enabled', 'success');
        } else {
          this.stopPolling();
          Toast.show('Auto-refresh disabled', 'warn');
        }

        this.updateLastUpdatedDisplay();
      });
    }
  },

  startPolling() {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.fetchLiveResults();
    }, CONFIG.pollingInterval);
  },

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  },

  async fetchLiveResults() {
    try {
      // Mock API call - would be fetch(`${CONFIG.apiBaseUrl}/live/results`) in production
      const data = await this.mockFetchResults();
      this.renderResults(data);
      this.reconnectAttempts = 0;
      this.hideConnectionBanner();
    } catch (err) {
      console.error('Fetch results error:', err);
      this.handleConnectionError();
    }
  },

  mockFetchResults() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          { rank: 1, lane: 4, name: 'CHALMERS Kyle', team: 'AUS', time: '47.08', rt: 0.68, delta: '--' },
          { rank: 2, lane: 5, name: 'DRESSEL Caeleb', team: 'USA', time: '47.23', rt: 0.61, delta: '+0.15' },
          { rank: 3, lane: 3, name: 'POPOVICI David', team: 'ROU', time: '47.58', rt: 0.65, delta: '+0.50' },
          { rank: 4, lane: 6, name: 'PAN Zhanle', team: 'CHN', time: '47.74', rt: 0.62, delta: '+0.66' },
          { rank: 5, lane: 2, name: 'MIRESSI Alessandro', team: 'ITA', time: '47.88', rt: 0.70, delta: '+0.80' },
          { rank: 6, lane: 7, name: 'ALEXY Jack', team: 'USA', time: '48.12', rt: 0.64, delta: '+1.04' },
        ]);
      }, 100);
    });
  },

  renderResults(data) {
    const tbody = document.getElementById('live-results-body');
    if (!tbody) return;

    const existingRows = Array.from(tbody.querySelectorAll('tr'));

    data.forEach((result, index) => {
      let row = existingRows[index];
      const isNew = !row;

      if (isNew) {
        row = document.createElement('tr');
        tbody.appendChild(row);
      }

      const medalEmoji = result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : result.rank === 3 ? '🥉' : '';
      const deltaClass = result.delta === '--' ? '' : result.delta.startsWith('+') ? 'text-error' : 'text-success';

      row.innerHTML = `
        <td class="mono" aria-label="Rank ${result.rank}${result.rank <= 3 ? ', Medal' : ''}">${medalEmoji} ${result.rank}</td>
        <td class="mono">${result.lane}</td>
        <td>${result.name}</td>
        <td>${result.team}</td>
        <td class="mono">${result.time}</td>
        <td class="mono">${result.rt.toFixed(2)}</td>
        <td class="mono ${deltaClass}">${result.delta}</td>
      `;

      if (isNew) {
        row.classList.add('row-highlight');
        this.announceNewResult(result);
      }
    });

    this.lastUpdateTime = new Date();
    this.updateLastUpdatedDisplay();
  },

  updateResults(newData) {
    // Called when a new time is submitted
    this.fetchLiveResults();
  },

  updateLastUpdatedDisplay() {
    const el = document.getElementById('last-updated');
    if (el && this.lastUpdateTime) {
      el.textContent = this.lastUpdateTime.toISOString().replace('T', ' ').substr(0, 19) + ' UTC';
    }

    const statusEl = document.getElementById('auto-refresh-status');
    if (statusEl) {
      statusEl.textContent = `AUTO-REFRESH: ${this.isAutoRefreshEnabled ? 'ENABLED' : 'DISABLED'} (${CONFIG.pollingInterval / 1000}s interval)`;
    }
  },

  announceNewResult(result) {
    const liveRegion = document.getElementById('live-announcer');
    if (liveRegion) {
      liveRegion.textContent = `New result: Lane ${result.lane}, ${result.time} seconds`;
    }
  },

  handleConnectionError() {
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.showConnectionBanner();
      this.stopPolling();
      return;
    }

    // Exponential backoff
    const delay = Math.pow(2, this.reconnectAttempts - 1) * 1000;
    setTimeout(() => this.fetchLiveResults(), delay);
  },

  showConnectionBanner() {
    const banner = document.getElementById('connection-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
  },

  hideConnectionBanner() {
    const banner = document.getElementById('connection-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  },

  setupFilters() {
    const filterInputs = document.querySelectorAll('.filter-select, .filter-search');

    const debouncedFilter = Utils.debounce(() => {
      this.applyFilters();
    }, CONFIG.debounceDelay);

    filterInputs.forEach(input => {
      input.addEventListener('input', debouncedFilter);
      input.addEventListener('change', debouncedFilter);
    });

    // Clear filters button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        filterInputs.forEach(input => {
          if (input.type === 'search') {
            input.value = '';
          } else {
            input.selectedIndex = 0;
          }
        });
        this.applyFilters();
        Toast.show('Filters cleared', 'success');
      });
    }
  },

  applyFilters() {
    // Get filter values
    const eventFilter = document.getElementById('filter-event')?.value;
    const heatFilter = document.getElementById('filter-heat')?.value;
    const genderFilter = document.getElementById('filter-gender')?.value;
    const searchQuery = document.getElementById('filter-search')?.value;

    // Apply filters to results (would filter API query in production)
    console.log('Applying filters:', { eventFilter, heatFilter, genderFilter, searchQuery });

    // Re-fetch with filters
    this.fetchLiveResults();
  },

  setupExport() {
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = this.getCurrentResults();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substr(0, 19);
        const filename = `live_results_${timestamp}.csv`;
        Utils.exportCSV(data, filename);
        Toast.show('CSV exported successfully', 'success');
      });
    }
  },

  getCurrentResults() {
    // Get current table data for export
    const rows = document.querySelectorAll('#live-results-body tr');
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td');
      return {
        rank: cells[0]?.textContent.trim().replace(/[🥇🥈🥉]/g, '').trim(),
        lane: cells[1]?.textContent.trim(),
        name: cells[2]?.textContent.trim(),
        team: cells[3]?.textContent.trim(),
        time: cells[4]?.textContent.trim(),
        rt: cells[5]?.textContent.trim(),
        delta: cells[6]?.textContent.trim()
      };
    });
  },

  loadInitialData() {
    this.fetchLiveResults();
  },
};

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    this.container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  warn(message) {
    this.show(message, 'warn');
  },

  info(message) {
    this.show(message, 'info');
  },
};

// ============================================
// LOGIN PAGE CONTROLLER
// ============================================

const LoginController = {
  otpInputs: [],
  resendTimer: null,
  resendCooldown: 30,

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupOTPInputs();
    this.checkLockout();
  },

  cacheElements() {
    this.emailInput = document.getElementById('login-email');
    this.passwordInput = document.getElementById('login-password');
    this.passwordToggle = document.getElementById('password-toggle');
    this.otpContainer = document.getElementById('otp-container');
    this.submitBtn = document.getElementById('login-submit');
    this.errorRegion = document.getElementById('login-error-region');
    this.lockoutMessage = document.getElementById('lockout-message');
  },

  setupEventListeners() {
    // Form submission
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Password toggle
    if (this.passwordToggle) {
      this.passwordToggle.addEventListener('click', () => this.togglePasswordVisibility());
    }

    // Input validation
    if (this.emailInput) {
      this.emailInput.addEventListener('input', () => this.validateForm());
    }
    if (this.passwordInput) {
      this.passwordInput.addEventListener('input', () => this.validateForm());
    }

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.handleSubmit(e);
      }
    });
  },

  setupOTPInputs() {
    this.otpInputs = [];
    if (!this.otpContainer) return;

    for (let i = 0; i < CONFIG.otpLength; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
      input.maxLength = 1;
      input.className = 'otp-input';
      input.setAttribute('aria-label', `Digit ${i + 1} of one-time password`);
      input.dataset.index = i;

      input.addEventListener('input', (e) => this.handleOTPInput(e, i));
      input.addEventListener('keydown', (e) => this.handleOTPKeydown(e, i));
      input.addEventListener('paste', (e) => this.handleOTPPaste(e));

      this.otpContainer.appendChild(input);
      this.otpInputs.push(input);
    }
  },

  handleOTPInput(e, index) {
    const value = e.target.value;

    // Only allow digits
    if (!/^\d$/.test(value)) {
      e.target.value = '';
      return;
    }

    // Auto-advance
    if (value && index < this.otpInputs.length - 1) {
      this.otpInputs[index + 1].focus();
    }

    this.validateForm();
  },

  handleOTPKeydown(e, index) {
    // Backspace handling
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      e.preventDefault();
      this.otpInputs[index - 1].focus();
      this.otpInputs[index - 1].value = '';
      this.otpInputs[index - 1].dispatchEvent(new Event('input'));
    }
  },

  handleOTPPaste(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, CONFIG.otpLength);

    if (/^\d+$/.test(paste)) {
      for (let i = 0; i < paste.length && i < this.otpInputs.length; i++) {
        this.otpInputs[i].value = paste[i];
      }
      const lastIndex = Math.min(paste.length, this.otpInputs.length) - 1;
      this.otpInputs[lastIndex]?.focus();
      this.validateForm();
    }
  },

  togglePasswordVisibility() {
    const type = this.passwordInput.type === 'password' ? 'text' : 'password';
    this.passwordInput.type = type;
    this.passwordToggle.setAttribute('aria-label',
      type === 'password' ? 'Show password' : 'Hide password'
    );
  },

  validateForm() {
    const emailValid = Utils.isValidEmail(this.emailInput?.value);
    const passwordValid = this.passwordInput?.value.length >= 1;
    const otpValid = this.otpInputs.every(input => input.value !== '');

    const isValid = emailValid && passwordValid && otpValid;

    if (this.submitBtn) {
      this.submitBtn.disabled = !isValid;
    }

    // Email validation feedback
    if (this.emailInput && this.emailInput.value && !emailValid) {
      this.emailInput.classList.add('input-error');
    } else if (this.emailInput) {
      this.emailInput.classList.remove('input-error');
    }

    return isValid;
  },

  async handleSubmit(e) {
    if (e) e.preventDefault();

    if (!this.validateForm()) return;

    const email = this.emailInput.value;
    const password = this.passwordInput.value;
    const otp = this.otpInputs.map(input => input.value).join('');

    // Show loading state
    this.submitBtn.disabled = true;
    this.submitBtn.innerHTML = '<span class="spinner"></span> VERIFYING...';

    // Attempt login
    const result = await SecurityManager.login(email, password, otp);

    if (result.success) {
      Toast.success(`Welcome back, ${result.user.name}`);
      window.location.href = '/pages/dashboard.html';
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'VERIFY & LOGIN →';

      if (result.error === 'Account locked') {
        this.showLockout(result.lockoutRemaining);
      } else {
        this.showError(result.error);
        if (result.attemptsRemaining !== undefined) {
          this.showError(`Attempts remaining: ${result.attemptsRemaining}`);
        }
      }
    }
  },

  showError(message) {
    if (this.errorRegion) {
      this.errorRegion.textContent = message;
      this.errorRegion.classList.remove('hidden');
    }
  },

  showLockout(remainingMs) {
    if (this.lockoutMessage) {
      this.lockoutMessage.classList.remove('hidden');
      this.startLockoutCountdown(remainingMs);
    }

    // Disable form
    if (this.emailInput) this.emailInput.disabled = true;
    if (this.passwordInput) this.passwordInput.disabled = true;
    this.otpInputs.forEach(input => input.disabled = true);
    if (this.submitBtn) this.submitBtn.disabled = true;
  },

  startLockoutCountdown(remainingMs) {
    const updateCountdown = () => {
      const remaining = SecurityManager.getLockoutRemaining();

      if (remaining <= 0) {
        // Lockout expired
        if (this.lockoutMessage) {
          this.lockoutMessage.classList.add('hidden');
        }
        if (this.emailInput) this.emailInput.disabled = false;
        if (this.passwordInput) this.passwordInput.disabled = false;
        this.otpInputs.forEach(input => input.disabled = false);
        SecurityManager.lockoutUntil = null;
        SecurityManager.loginAttempts = 0;
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const countdownEl = this.lockoutMessage.querySelector('.countdown');
      if (countdownEl) {
        countdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      setTimeout(updateCountdown, 1000);
    };

    updateCountdown();
  },

  checkLockout() {
    const remaining = SecurityManager.getLockoutRemaining();
    if (remaining > 0) {
      this.showLockout(remaining);
    }
  },

  startResendTimer() {
    let remaining = this.resendCooldown;

    const updateTimer = () => {
      const link = document.getElementById('resend-code-link');
      if (!link) return;

      if (remaining <= 0) {
        link.classList.remove('disabled');
        link.textContent = 'Resend Code';
        link.addEventListener('click', () => this.resendCode());
        return;
      }

      link.classList.add('disabled');
      link.textContent = `Resend Code (${remaining}s)`;
      remaining--;
      setTimeout(updateTimer, 1000);
    };

    updateTimer();
  },

  resendCode() {
    Toast.info('New code sent to your device');
    this.startResendTimer();
  },
};

// ============================================
// DASHBOARD CONTROLLER
// ============================================

const DashboardController = {
  init() {
    this.setupNavigation();
    this.setupCards();
    this.setupDiagnostics();
    this.checkRolePermissions();
  },

  setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        if (target) {
          window.location.href = target;
        }
      });

      // Keyboard navigation
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = e.currentTarget.nextElementSibling;
          next?.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = e.currentTarget.previousElementSibling;
          prev?.focus();
        }
      });
    });
  },

  setupCards() {
    const cards = document.querySelectorAll('.card[data-action]');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const action = card.getAttribute('data-action');
        this.handleCardAction(action);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  },

  handleCardAction(action) {
    switch (action) {
      case 'timekeeper':
        window.location.href = '/pages/time-entry.html';
        break;
      case 'leaderboard':
        window.location.href = '/pages/live-feed.html';
        break;
      case 'users':
        window.location.href = '/pages/manage-access.html';
        break;
      case 'audit':
        window.location.href = '/pages/audit-logs.html';
        break;
      default:
        console.warn('Unknown card action:', action);
    }
  },

  setupDiagnostics() {
    const btn = document.getElementById('run-diagnostics-btn');
    if (btn) {
      btn.addEventListener('click', () => this.runDiagnostics());
    }
  },

  async runDiagnostics() {
    const btn = document.getElementById('run-diagnostics-btn');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> RUNNING...';

    // Simulate diagnostics
    await new Promise(resolve => setTimeout(resolve, 2000));

    btn.disabled = false;
    btn.textContent = 'RUN DIAGNOSTICS';

    Toast.success('Diagnostics complete - All systems operational');
  },

  checkRolePermissions() {
    const role = SecurityManager.currentUser?.role;

    // Hide admin-only cards for non-admin users
    if (role !== 'ADMIN') {
      const adminCards = document.querySelectorAll('[data-requires-role="ADMIN"]');
      adminCards.forEach(card => card.classList.add('hidden'));
    }
  },
};

// ============================================
// TIME ENTRY CONTROLLER
// ============================================

const TimeEntryController = {
  currentTime: '00:00:00.00',
  isVerified: false,

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.loadHeatContext();
  },

  cacheElements() {
    this.timeDisplay = document.getElementById('time-display');
    this.verifyCheckbox = document.getElementById('verify-checkbox');
    this.submitBtn = document.getElementById('submit-time-btn');
    this.validationPanel = document.getElementById('validation-panel');
    this.formatCheck = document.getElementById('format-check');
    this.rangeCheck = document.getElementById('range-check');
    this.duplicateAlert = document.getElementById('duplicate-alert');
  },

  setupEventListeners() {
    // Time display click for manual edit
    if (this.timeDisplay) {
      this.timeDisplay.addEventListener('click', () => this.openTimeEditor());
    }

    // Verification checkbox
    if (this.verifyCheckbox) {
      this.verifyCheckbox.addEventListener('change', (e) => {
        this.isVerified = e.target.checked;
        this.validateSubmission();
      });
    }

    // Submit button
    if (this.submitBtn) {
      this.submitBtn.addEventListener('click', () => this.submitTime());
    }

    // Validation panel toggle
    const toggleBtn = document.getElementById('validation-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (this.validationPanel) {
          this.validationPanel.classList.toggle('hidden');
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        this.openTimeEditor();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (this.canSubmit()) {
          this.submitTime();
        }
      } else if (e.key === 'Escape') {
        if (this.validationPanel) {
          this.validationPanel.classList.add('hidden');
        }
      }
    });
  },

  loadHeatContext() {
    // Load current heat context from session or API
    const heatContext = DataStorage.get('current_heat');
    if (heatContext) {
      document.getElementById('event-id-value')?.textContent = heatContext.eventId;
      document.getElementById('lane-value')?.textContent = heatContext.lane;
      document.getElementById('swimmer-name-value')?.textContent = heatContext.swimmerName;
    }
  },

  openTimeEditor() {
    // Create or show time editor modal
    let modal = document.getElementById('time-editor-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'time-editor-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal" role="dialog" aria-labelledby="time-editor-title">
          <h2 id="time-editor-title" class="modal-header">Manual Time Entry</h2>
          <div class="form-group">
            <label class="input-label" for="manual-time-input">Time (HH:MM:SS.MS)</label>
            <input type="text" id="manual-time-input" class="input" placeholder="00:00:00.00" pattern="\\d{2}:\\d{2}:\\d{2}\\.\\d{2}">
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="TimeEntryController.closeTimeEditor()">Cancel</button>
            <button class="btn btn-primary" onclick="TimeEntryController.saveTime()">Save Time</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');
    const input = modal.querySelector('#manual-time-input');
    input.value = this.currentTime;
    input.focus();

    // Auto-format on input
    input.addEventListener('input', (e) => this.autoFormatTime(e));
  },

  autoFormatTime(e) {
    let value = e.target.value.replace(/\D/g, '');
    let formatted = '';

    if (value.length >= 5) {
      formatted = value.slice(0, 2) + ':' + value.slice(2, 4) + ':' + value.slice(4, 6) + '.' + value.slice(6, 8);
    } else if (value.length >= 3) {
      formatted = value.slice(0, 2) + ':' + value.slice(2, 4) + ':' + value.slice(4);
    } else if (value.length >= 1) {
      formatted = value.slice(0, 2);
    }

    e.target.value = formatted;
  },

  closeTimeEditor() {
    const modal = document.getElementById('time-editor-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  saveTime() {
    const modal = document.getElementById('time-editor-modal');
    const input = modal?.querySelector('#manual-time-input');
    if (!input) return;

    const timeValue = input.value;
    if (this.validateTimeFormat(timeValue)) {
      this.currentTime = timeValue;
      if (this.timeDisplay) {
        this.timeDisplay.textContent = timeValue;
      }
      this.closeTimeEditor();
      this.updateValidationChecks();
      this.validateSubmission();
      Toast.success('Time updated');
    } else {
      Toast.error('Invalid time format. Use HH:MM:SS.MS');
    }
  },

  validateTimeFormat(timeStr) {
    const regex = /^\d{2}:\d{2}:\d{2}\.\d{2}$/;
    return regex.test(timeStr);
  },

  updateValidationChecks() {
    const isValidFormat = this.validateTimeFormat(this.currentTime);

    if (this.formatCheck) {
      this.formatCheck.innerHTML = isValidFormat
        ? '<span class="check-icon">✓</span> Format Check'
        : '<span class="warn-icon">✗</span> Format Check';
    }

    // Range check (mock - would compare to heat average)
    const isInRange = true; // Mock
    if (this.rangeCheck) {
      this.rangeCheck.innerHTML = isInRange
        ? '<span class="check-icon">✓</span> Range Check'
        : '<span class="warn-icon">⚠</span> Range Check (Out of expected range)';
    }

    // Duplicate check (mock)
    const isDuplicate = false; // Mock
    if (this.duplicateAlert) {
      this.duplicateAlert.classList.toggle('hidden', !isDuplicate);
      if (isDuplicate) {
        this.duplicateAlert.innerHTML = '<span class="warn-icon">⚠</span> Duplicate Alert: Time matches Lane 2 submission';
      }
    }
  },

  canSubmit() {
    const isTimeSet = this.currentTime !== '00:00:00.00';
    return isTimeSet && this.isVerified;
  },

  validateSubmission() {
    if (this.submitBtn) {
      this.submitBtn.disabled = !this.canSubmit();
    }
  },

  async submitTime() {
    if (!this.canSubmit()) return;

    this.submitBtn.disabled = true;
    this.submitBtn.innerHTML = '<span class="spinner"></span> SUBMITTING...';

    // Get context
    const lane = document.getElementById('lane-value')?.textContent;
    const eventId = document.getElementById('event-id-value')?.textContent;
    const swimmerName = document.getElementById('swimmer-name-value')?.textContent;

    // Submit to API (mock)
    const submissionData = {
      eventId,
      lane,
      swimmerName,
      time: this.currentTime,
      verified: this.isVerified,
      timestamp: Utils.getUTCTimestamp()
    };

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Emit event
      EventManager.onTimeSubmitted(submissionData);

      // Update recent submissions
      this.addRecentSubmission(submissionData);

      Toast.success(`Time submitted for Lane ${lane}`);

      // Reset form
      this.currentTime = '00:00:00.00';
      this.isVerified = false;
      if (this.timeDisplay) this.timeDisplay.textContent = '00:00:00.00';
      if (this.verifyCheckbox) this.verifyCheckbox.checked = false;
      this.validateSubmission();

    } catch (err) {
      console.error('Submit error:', err);
      Toast.error('Submission failed. Please retry.');
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'SUBMIT TIME';
    }
  },

  addRecentSubmission(data) {
    const tbody = document.getElementById('recent-submissions-body');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = 'submission-row';
    row.innerHTML = `
      <td class="mono">${data.lane.padStart(2, '0')}</td>
      <td>${data.swimmerName}</td>
      <td class="mono">${data.time}</td>
      <td><span class="qual-badge">✓</span></td>
    `;

    // Insert at top
    tbody.insertBefore(row, tbody.firstChild);
  },
};

// ============================================
// AUDIT LOGS CONTROLLER
// ============================================

const AuditLogsController = {
  currentPage: 1,
  totalPages: 64,
  pageSize: 20,

  init() {
    this.setupFilters();
    this.setupPagination();
    this.setupExport();
    this.loadLogs();
  },

  setupFilters() {
    const filterInputs = document.querySelectorAll('.filter-panel input, .filter-panel select');

    const debouncedFilter = Utils.debounce(() => {
      this.currentPage = 1;
      this.loadLogs();
    }, CONFIG.debounceDelay);

    filterInputs.forEach(input => {
      input.addEventListener('change', debouncedFilter);
    });

    // Reset filters button
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        filterInputs.forEach(input => {
          if (input.type === 'search' || input.type === 'text') {
            input.value = '';
          } else {
            input.selectedIndex = 0;
          }
        });
        this.currentPage = 1;
        this.loadLogs();
        Toast.success('Filters reset');
      });
    }
  },

  setupPagination() {
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadLogs();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadLogs();
        }
      });
    }
  },

  setupExport() {
    const exportBtn = document.getElementById('export-audit-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const logs = this.getCurrentLogs();
        const dateRange = this.getDateRange();
        const filename = `audit_log_${dateRange}.csv`;
        Utils.exportCSV(logs, filename);
        Toast.success('Audit log exported');
      });
    }
  },

  getDateRange() {
    const startDate = document.getElementById('filter-start-date')?.value || 'start';
    const endDate = document.getElementById('filter-end-date')?.value || 'end';
    return `${startDate}_${endDate}`;
  },

  getCurrentLogs() {
    // Mock data for export
    return [
      {
        timestamp: '2023-10-25 14:32:01',
        ipAddress: '192.168.1.105',
        user: 'admin_root',
        action: 'ROLE MODIFIED: User escalated to admin',
        module: 'IAM SERVICE',
        severity: 'HIGH',
        status: 'SUCCESS'
      }
    ];
  },

  async loadLogs() {
    const tbody = document.getElementById('audit-logs-body');
    if (!tbody) return;

    // Show loading state
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><span class="spinner"></span> Loading logs...</td></tr>';

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mock data
      const logs = [
        {
          timestamp: '2023-10-25 14:32:01',
          ipAddress: '192.168.1.105',
          user: 'admin_root',
          action: 'ROLE MODIFIED: User \'referee_4\' escalated to admin',
          module: 'IAM SERVICE',
          severity: 'HIGH',
          status: 'SUCCESS'
        },
        {
          timestamp: '2023-10-25 14:15:22',
          ipAddress: '10.0.0.42',
          user: 'system cron',
          action: 'TIMING CALIBRATION OVERRIDE (Delta: +0.002s)',
          module: 'LANE SYNC DAEMON',
          severity: 'WARN',
          status: 'SUCCESS'
        },
        {
          timestamp: '2023-10-25 13:42:15',
          ipAddress: '203.0.113.88',
          user: 'UNKNOWN',
          action: 'AUTH FAILED ATTEMPT (Reason: INVALID CREDENTIALS)',
          module: 'GATEWAY API',
          severity: 'WARN',
          status: 'DENIED'
        }
      ];

      this.renderLogs(logs);
      this.updatePagination();

    } catch (err) {
      console.error('Load logs error:', err);
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Failed to load logs. <button class="btn btn-sm" onclick="AuditLogsController.loadLogs()">RETRY</button></td></tr>';
    }
  },

  renderLogs(logs) {
    const tbody = document.getElementById('audit-logs-body');
    if (!tbody) return;

    tbody.innerHTML = logs.map(log => `
      <tr class="expandable-row" data-log-id="${Utils.generateId()}">
        <td class="mono">${log.timestamp}</td>
        <td class="mono">${log.ipAddress}</td>
        <td>${log.user}</td>
        <td>${log.action}</td>
        <td>${log.module}</td>
        <td><span class="badge badge-severity-${log.severity.toLowerCase()}">${log.severity}</span></td>
        <td>
          ${log.status === 'SUCCESS'
            ? '<span class="badge badge-success">✓ SUCCESS</span>'
            : '<span class="badge badge-error">✗ DENIED</span>'}
        </td>
      </tr>
      <tr class="expanded-details hidden">
        <td colspan="7" class="p-md">
          <pre class="mono text-metadata">${JSON.stringify(log, null, 2)}</pre>
        </td>
      </tr>
    `).join('');

    // Setup row expansion
    const rows = tbody.querySelectorAll('.expandable-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const detailsRow = row.nextElementSibling;
        if (detailsRow) {
          detailsRow.classList.toggle('hidden');
        }
      });
    });
  },

  updatePagination() {
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
      infoEl.textContent = `Showing ${this.currentPage} of ${this.totalPages} entries`;
    }

    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');

    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
  },
};

// ============================================
// MANAGE ACCESS CONTROLLER
// ============================================

const ManageAccessController = {
  selectedRole: null,

  init() {
    this.loadUsers();
    this.setupAddUserModal();
    this.setupSearch();
  },

  loadUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    // Mock users
    const users = [
      { id: 1, name: 'John Doe', email: 'john.doe@system.local', role: 'ADMIN', status: 'ACTIVE' },
      { id: 2, name: 'Sarah Miller', email: 's.miller@system.local', role: 'TIMEKEEPER', status: 'ACTIVE' },
      { id: 3, name: 'Tom Richards', email: 't.richards@system.local', role: 'VIEWER', status: 'DISABLED' }
    ];

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>
          <div class="user-identity">
            <div class="avatar">${user.name.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <div>${user.name}</div>
              <div class="user-email">${user.email}</div>
            </div>
          </div>
        </td>
        <td>
          <select class="role-select" onchange="ManageAccessController.changeRole(${user.id}, this.value)">
            <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
            <option value="TIMEKEEPER" ${user.role === 'TIMEKEEPER' ? 'selected' : ''}>TIMEKEEPER</option>
            <option value="VIEWER" ${user.role === 'VIEWER' ? 'selected' : ''}>VIEWER</option>
          </select>
        </td>
        <td>
          <div class="toggle" role="switch" aria-checked="${user.status === 'ACTIVE'}" tabindex="0"
               onclick="ManageAccessController.toggleStatus(${user.id})">
            <div class="toggle-thumb"></div>
          </div>
        </td>
        <td>
          <button class="actions-menu" aria-label="Actions for ${user.name}">⋮</button>
        </td>
      </tr>
    `).join('');
  },

  setupAddUserModal() {
    const addBtn = document.getElementById('add-user-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const modal = document.getElementById('add-user-modal');
        if (modal) {
          modal.classList.remove('hidden');
        }
      });
    }

    const cancelBtn = document.getElementById('cancel-add-user');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const modal = document.getElementById('add-user-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      });
    }
  },

  setupSearch() {
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      const debouncedSearch = Utils.debounce((e) => {
        const query = e.target.value.toLowerCase();
        this.filterUsers(query);
      }, CONFIG.debounceDelay);

      searchInput.addEventListener('input', debouncedSearch);
    }
  },

  filterUsers(query) {
    const rows = document.querySelectorAll('#users-table-body tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle('hidden', !text.includes(query));
    });
  },

  changeRole(userId, newRole) {
    // Show confirmation modal
    const user = this.getUserById(userId);
    if (!user) return;

    const confirmed = confirm(`Change role for ${user.name} to ${newRole}?`);
    if (confirmed) {
      Toast.success(`Role updated to ${newRole}`);
      EventManager.onUserChanged({ userId, newRole });
    } else {
      // Revert
      this.loadUsers();
    }
  },

  toggleStatus(userId) {
    // Mock toggle
    Toast.success('Status updated');
  },

  getUserById(id) {
    // Mock lookup
    return { id, name: 'User', email: 'user@example.com' };
  },
};

// ============================================
// SETTINGS CONTROLLER
// ============================================

const SettingsController = {
  hasUnsavedChanges: false,
  autoSaveTimer: null,

  init() {
    this.setupTabs();
    this.setupFormTracking();
    this.setupAutoSave();
  },

  setupTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab');
        this.switchTab(target);
      });

      // Keyboard navigation
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = e.currentTarget.nextElementSibling;
          next?.focus();
          next?.click();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = e.currentTarget.previousElementSibling;
          prev?.focus();
          prev?.click();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tab.click();
        }
      });
    });
  },

  switchTab(tabId) {
    if (this.hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
    }

    // Update tab states
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
      const isSelected = tab.getAttribute('data-tab') === tabId;
      tab.setAttribute('aria-selected', isSelected);
    });

    // Update content visibility
    const contents = document.querySelectorAll('.settings-content');
    contents.forEach(content => {
      content.classList.toggle('hidden', content.id !== `tab-${tabId}`);
    });

    this.hasUnsavedChanges = false;
  },

  setupFormTracking() {
    const inputs = document.querySelectorAll('.settings-section input, .settings-section select, .settings-section .toggle');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.hasUnsavedChanges = true;
      });
    });
  },

  setupAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.saveDraft();
      }
    }, 30000); // 30 seconds
  },

  saveDraft() {
    // Save form state to localStorage
    const formData = this.collectFormData();
    DataStorage.set('settings_draft', formData);
    this.hasUnsavedChanges = false;
    Toast.info('Draft saved');
  },

  collectFormData() {
    const formData = {};
    const inputs = document.querySelectorAll('.settings-section input, .settings-section select');
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        formData[input.id] = input.checked;
      } else {
        formData[input.id] = input.value;
      }
    });
    return formData;
  },

  saveSettings() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (!saveBtn) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> SAVING...';

    // Mock API call
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.textContent = 'SAVE CHANGES';
      this.hasUnsavedChanges = false;
      Toast.success('Settings saved successfully');
      EventManager.onSettingsChanged(this.collectFormData());
    }, 1000);
  },
};

// ============================================
// THEME TOGGLE
// ============================================

const ThemeToggle = {
  init() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      // Load saved theme
      const savedTheme = DataStorage.get('theme') || 'light';
      this.setTheme(savedTheme);

      toggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        DataStorage.set('theme', newTheme);
      });
    }
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize toast system
  Toast.init();

  // Initialize theme
  ThemeToggle.init();

  // Initialize security manager
  SecurityManager.init();

  // Page-specific initialization
  const pageId = document.body.getAttribute('data-page');

  switch (pageId) {
    case 'login':
      LoginController.init();
      break;
    case 'dashboard':
      DashboardController.init();
      break;
    case 'time-entry':
      TimeEntryController.init();
      break;
    case 'live-feed':
      LivePanelUI.init();
      break;
    case 'audit-logs':
      AuditLogsController.init();
      break;
    case 'manage-access':
      ManageAccessController.init();
      break;
    case 'settings':
      SettingsController.init();
      break;
    default:
      console.log('No page-specific controller for:', pageId);
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
      const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
      modals.forEach(modal => modal.classList.add('hidden'));
    }
  });
});

// Export for global access
window.SSP = {
  CONFIG,
  Utils,
  DataStorage,
  SecurityManager,
  EventManager,
  LivePanelUI,
  Toast,
  LoginController,
  DashboardController,
  TimeEntryController,
  AuditLogsController,
  ManageAccessController,
  SettingsController,
  ThemeToggle
};
