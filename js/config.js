// Frontend Configuration for API endpoints
const API_CONFIG = {
  // Base URLs for different environments
  BASE_URLS: {
    LOCAL: 'http://localhost:5000',
    STAGING: 'https://staging.clientfriendclub.com',
    PRODUCTION: 'https://clientfriendclub.com'
  },
  
  // Current environment (can be set via environment variable or manually)
  CURRENT_ENV: 'production', // Change this to 'local' for development
  // CURRENT_ENV: 'local', // Change this to 'local' for development
  
  // Get current base URL
  getBaseUrl: function() {
    return this.BASE_URLS[this.CURRENT_ENV.toUpperCase()] || this.BASE_URLS.PRODUCTION;
  },
  
  // Get API base URL
  getApiBaseUrl: function() {
    return `${this.getBaseUrl()}/api/v1`;
  },
  
  // API Endpoints
  ENDPOINTS: {
    AUTH: {
      SIGNUP: '/sign-up',
      SIGNIN: '/sign-in',
      GOOGLE_SIGNIN: '/google-sign-in',
      LOGOUT: '/logout',
      FORGOT_PASSWORD: '/forgot-password',
      UPDATE_PROFILE: '/update-profile',
      SHOW_PROFILE: '/show-profile',
      GET_HOST_DETAILS: '/get-host-details',
      GENERATE_TOKEN: '/generate-token',
      SEND_OTP: '/send-otp',
      VERIFIED_OTP: '/verified-otp',
      USER_LOGIN: '/user-login',
      USER_DETAILS: '/user-details',
      HOST_LIST_FOR_USER: '/host-list-for-user',
      HOST_LIST_FOR_ADMIN: '/host-list-for-admin',
      HOST_DETAILS_BY_ID_FOR_ADMIN: '/host-details-by-id-for-admin',
      DELETE_HOST_THROUGH_ADMIN: '/delete-host-through-admin'
    },
    
    IMAGES: {
      SINGLE: '/single',
      TYPES_WISE: '/single/types_wise',
      DELETE: '/delete'
    },
    
    VIDEOS: {
      SINGLE: '/single',
      DELETE: '/delete'
    },
    
    BANK_ACCOUNT: {
      CREATE: '/create',
      GET_ALL: '/get-all',
      UPDATE: '/update',
      DELETE: '/delete'
    },
    
    VIDEO_CALL: {
      CREATE: '/create',
      GET_ALL: '/get-all',
      UPDATE: '/update',
      DELETE: '/delete'
    },


    USER_AUH: {
      LOGIN: '/user-login',
      GET_HOST_ALL: '/host-list-for-user',
    }
  },

  // Google OAuth Client IDs per environment (fill these in)
  GOOGLE_CLIENT_IDS: {
    LOCAL: '947452896893-jcs0sd83ckmb239uh7epome5ebo0rhc5.apps.googleusercontent.com',
    STAGING: '947452896893-jcs0sd83ckmb239uh7epome5ebo0rhc5.apps.googleusercontent.com',
    PRODUCTION: '947452896893-jcs0sd83ckmb239uh7epome5ebo0rhc5.apps.googleusercontent.com'
  },

  // Get Google Client ID for current env
  getGoogleClientId: function() {
    return this.GOOGLE_CLIENT_IDS[this.CURRENT_ENV.toUpperCase()] || '';
  },
  
  // Helper function to get full API URL
  getApiUrl: function(endpoint) {
    return `${this.getApiBaseUrl()}${endpoint}`;
  },
  
  // Helper function to get auth endpoint URL
  getAuthUrl: function(endpoint) {
    return this.getApiUrl(endpoint);
  },
  
  // Helper function to get image endpoint URL
  getImageUrl: function(endpoint) {
    return this.getApiUrl(`/images${endpoint}`);
  },
  
  // Helper function to get video endpoint URL
  getVideoUrl: function(endpoint) {
    return this.getApiUrl(`/videos${endpoint}`);
  },
  
  // Helper function to get bank account endpoint URL
  getBankAccountUrl: function(endpoint) {
    return this.getApiUrl(`/bank-accounts${endpoint}`);
  },
  
  // Helper function to get video call endpoint URL
  getVideoCallUrl: function(endpoint) {
    return this.getApiUrl(`/video-calls${endpoint}`);
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
} else {
  // Make it available globally for browser usage
  window.API_CONFIG = API_CONFIG;
}
