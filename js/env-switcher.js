// Environment Switcher Utility
const ENV_SWITCHER = {
  // Available environments
  ENVIRONMENTS: {
    LOCAL: 'local',
    STAGING: 'staging',
    PRODUCTION: 'production'
  },

  // Current environment
  currentEnv: 'production', // Default, will be overridden by localStorage or init
  // currentEnv: 'local', // Default, will be overridden by localStorage or init

  // Initialize the switcher
  init: function() {
    // Try to get environment from localStorage
    const savedEnv = localStorage.getItem('API_ENVIRONMENT');
    if (savedEnv && this.ENVIRONMENTS[savedEnv.toUpperCase()]) {
      this.currentEnv = savedEnv;
    }

    // Update the config
    this.updateConfig();

    // Only create environment switcher UI in development mode AND if explicitly enabled
    // This prevents the popup from showing to regular users
    if (this.currentEnv === 'local' && localStorage.getItem('SHOW_ENV_SWITCHER') === 'true') {
      this.createSwitcherUI();
    }
  },

  // Update the API configuration
  updateConfig: function() {
    if (window.API_CONFIG) {
      window.API_CONFIG.CURRENT_ENV = this.currentEnv;
      console.log(`🌍 API Environment switched to: ${this.currentEnv.toUpperCase()}`);
      console.log(`🔗 Base URL: ${window.API_CONFIG.getBaseUrl()}`);
      console.log(`🔗 API Base URL: ${window.API_CONFIG.getApiBaseUrl()}`);
    }
  },

  // Switch environment
  switchTo: function(env) {
    if (this.ENVIRONMENTS[env.toUpperCase()]) {
      this.currentEnv = env;
      localStorage.setItem('API_ENVIRONMENT', env);
      this.updateConfig();

      // Show notification only in development mode
      if (window.Swal && this.currentEnv === 'local') {
        Swal.fire({
          title: 'Environment Switched!',
          text: `Now using ${env.toUpperCase()} environment`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }

      // Reload page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  },

  // Create environment switcher UI (only for developers)
  createSwitcherUI: function() {
    // Create switcher container
    const switcher = document.createElement('div');
    switcher.id = 'env-switcher';
    switcher.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    // Create title
    const title = document.createElement('div');
    title.textContent = '🌍 API Environment (Dev Only)';
    title.style.cssText = 'margin-bottom: 8px; font-weight: bold;';

    // Create buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 5px;';

    Object.values(this.ENVIRONMENTS).forEach(env => {
      const btn = document.createElement('button');
      btn.textContent = env.toUpperCase();
      btn.style.cssText = `
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        background: ${env === this.currentEnv ? '#4CAF50' : '#666'};
        color: white;
      `;

      btn.onclick = () => this.switchTo(env);
      buttons.appendChild(btn);
    });

    // Assemble switcher
    switcher.appendChild(title);
    switcher.appendChild(buttons);

    // Add to page
    document.body.appendChild(switcher);
  },

  // Developer function to show/hide the environment switcher
  toggleSwitcher: function(show = true) {
    if (show) {
      localStorage.setItem('SHOW_ENV_SWITCHER', 'true');
      if (this.currentEnv === 'local') {
        this.createSwitcherUI();
      }
    } else {
      localStorage.setItem('SHOW_ENV_SWITCHER', 'false');
      const existingSwitcher = document.getElementById('env-switcher');
      if (existingSwitcher) {
        existingSwitcher.remove();
      }
    }
  }
};

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ENV_SWITCHER.init());
} else {
  ENV_SWITCHER.init();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENV_SWITCHER;
} else {
  window.ENV_SWITCHER = ENV_SWITCHER;
}

// Developer console commands (only available in development)
if (typeof window !== 'undefined' && window.console) {
  // Add helpful console commands for developers
  window.ENV_SWITCHER_HELP = function() {
    console.log(`
🌍 Environment Switcher Developer Commands:
• ENV_SWITCHER.toggleSwitcher(true)  - Show environment switcher UI
• ENV_SWITCHER.toggleSwitcher(false) - Hide environment switcher UI
• ENV_SWITCHER.switchTo('local')     - Switch to local environment
• ENV_SWITCHER.switchTo('staging')   - Switch to staging environment
• ENV_SWITCHER.switchTo('production') - Switch to production environment
• localStorage.setItem('SHOW_ENV_SWITCHER', 'true') - Enable switcher permanently
• localStorage.setItem('SHOW_ENV_SWITCHER', 'false') - Disable switcher permanently
    `);
  };
  
  console.log('🌍 Environment Switcher loaded. Type ENV_SWITCHER_HELP() for developer commands.');
}
