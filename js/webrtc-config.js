// WebRTC Configuration
// This file contains WebRTC settings that can be easily updated

const WEBRTC_CONFIG = {
  // ICE Servers configuration
  ICE_SERVERS: [
    // STUN servers (free, for discovery)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Add your TURN servers here for better connectivity
    // TURN servers are required for users behind strict firewalls/NATs
    // You can use services like:
    // - Twilio (https://www.twilio.com/stun-turn)
    // - Agora (https://www.agora.io/)
    // - Your own TURN server
    
    // Example TURN server configuration:
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
  
  // WebRTC PeerConnection configuration
  PEER_CONNECTION_CONFIG: {
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all',
    iceConnectionTimeout: 10000, // 10 seconds
    iceRestart: true
  },
  
  // Video constraints for different devices
  VIDEO_CONSTRAINTS: {
    MOBILE: {
      width: { ideal: 480, max: 640 },
      height: { ideal: 270, max: 360 },
      frameRate: { ideal: 15, max: 24 }
    },
    DESKTOP: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 360, max: 720 },
      frameRate: { ideal: 24, max: 30 }
    }
  },
  
  // Audio constraints
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 48000, max: 48000 },
    channelCount: { ideal: 1, max: 2 }
  },
  
  // Connection timeout and retry settings
  CONNECTION_SETTINGS: {
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    connectionTimeout: 30000, // 30 seconds
    iceTimeout: 10000 // 10 seconds
  },
  
  // Bandwidth settings (in bps)
  BANDWIDTH_LIMITS: {
    MOBILE: {
      video: 500000, // 500 kbps
      audio: 64000   // 64 kbps
    },
    DESKTOP: {
      video: 1000000, // 1 Mbps
      audio: 128000   // 128 kbps
    }
  }
};

// Helper function to get device-specific video constraints
function getVideoConstraints() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isMobile ? WEBRTC_CONFIG.VIDEO_CONSTRAINTS.MOBILE : WEBRTC_CONFIG.VIDEO_CONSTRAINTS.DESKTOP;
}

// Helper function to get device-specific bandwidth limits
function getBandwidthLimits() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isMobile ? WEBRTC_CONFIG.BANDWIDTH_LIMITS.MOBILE : WEBRTC_CONFIG.BANDWIDTH_LIMITS.DESKTOP;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WEBRTC_CONFIG, getVideoConstraints, getBandwidthLimits };
} else {
  // Make it available globally for browser usage
  window.WEBRTC_CONFIG = WEBRTC_CONFIG;
  window.getVideoConstraints = getVideoConstraints;
  window.getBandwidthLimits = getBandwidthLimits;
}
