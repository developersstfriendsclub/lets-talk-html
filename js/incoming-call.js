// Incoming Call Handler - Can be included in any page
class IncomingCallHandler {
  constructor() {
    this.socket = null;
    this.overlay = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    // Wait for socket to be available
    if (window.socket) {
      this.socket = window.socket;
      this.setupEventListeners();
    } else {
      // Wait for socket to be initialized - try multiple approaches
      const checkSocket = () => {
        if (window.socket) {
          this.socket = window.socket;
          this.setupEventListeners();
        } else if (window.io) {
          // Try to create socket if io is available
          try {
            const socketUrl = window.API_CONFIG ? window.API_CONFIG.getBaseUrl() : window.location.origin;
            this.socket = window.io(socketUrl, { 
              path: '/socket.io', 
              upgrade: false, 
              transports: ['polling'] 
            });
            window.socket = this.socket;
            this.setupEventListeners();
          } catch (e) {
            console.log('Waiting for socket...');
            setTimeout(checkSocket, 100);
          }
        } else {
          setTimeout(checkSocket, 100);
        }
      };
      checkSocket();
    }
  }

  setupEventListeners() {
    if (this.isInitialized) return;
    
    console.log('Setting up incoming call event listeners...');
    
    this.socket.on('incoming-call', (data) => {
      console.log('Incoming call received:', data);
      this.showIncomingCall(data);
    });

    this.socket.on('call-timeout', (data) => {
      console.log('Call timeout:', data);
      this.hideIncomingCall();
      // Show timeout notification
      this.showNotification('Call timed out', 'The call was not answered', 'warning');
    });

    this.socket.on('call-rejected', (data) => {
      console.log('Call rejected:', data);
      this.hideIncomingCall();
      // Show rejection notification
      this.showNotification('Call rejected', data.reason || 'Call was rejected', 'error');
    });

    this.isInitialized = true;
  }

  showIncomingCall({ from, fromUserId, suggestedRoom }) {
    console.log('Showing incoming call overlay for:', { from, fromUserId, suggestedRoom });
    
    // Create overlay if it doesn't exist
    if (!this.overlay) {
      this.createOverlay();
    }

    // Update overlay content
    const fromText = this.overlay.querySelector('#incomingFrom');
    if (fromText) {
      fromText.textContent = `From: ${from}`;
    }

    // Set the call message in the format you want
    const callMessage = this.overlay.querySelector('#callMessage');
    if (callMessage) {
      // Mask the name like "A*********d invited you to chat. Join?"
      const maskedName = this.maskName(from);
      const message = `${maskedName} invited you to chat. Join?`;
      callMessage.textContent = message;
      console.log('Set call message:', message, 'from masked name:', maskedName);
    }

    // Show overlay
    this.overlay.style.display = 'flex';

    // Setup accept button
    const acceptBtn = this.overlay.querySelector('#ovlAccept');
    if (acceptBtn) {
      acceptBtn.onclick = () => {
        this.hideIncomingCall();
        this.acceptCall(suggestedRoom);
      };
    }

    // Setup reject button
    const rejectBtn = this.overlay.querySelector('#ovlReject');
    if (rejectBtn) {
      rejectBtn.onclick = () => {
        this.hideIncomingCall();
        this.rejectCall(from, fromUserId);
      };
    }

    // Auto-hide after 30 seconds if not answered
    setTimeout(() => {
      if (this.overlay && this.overlay.style.display === 'flex') {
        this.hideIncomingCall();
        this.showNotification('Call missed', 'Incoming call was not answered', 'info');
      }
    }, 30000);
  }

  hideIncomingCall() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  createOverlay() {
    // Remove existing overlay if any
    const existing = document.getElementById('incomingOverlay');
    if (existing) {
      existing.remove();
    }

    // Create new overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'incomingOverlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      backdrop-filter: blur(4px);
    `;

    this.overlay.innerHTML = `
      <div style="
        background: #fff;
        padding: 24px;
        border-radius: 16px;
        min-width: 300px;
        max-width: 90%;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
      ">
        <div style="
          font-size: 48px;
          color: #22c55e;
          margin-bottom: 16px;
          animation: pulse 2s infinite;
        ">
          <i class="fas fa-phone"></i>
        </div>
        <div style="
          font-weight: 700;
          color: #1f2937;
          font-size: 20px;
          margin-bottom: 8px;
        ">Incoming Call</div>
        <div id="incomingFrom" style="
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 8px;
        "></div>
        <div id="callMessage" style="
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 24px;
          font-style: italic;
        "></div>
        <div style="
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        ">
          <button id="ovlAccept" style="
            background: #22c55e;
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            min-width: 100px;
            transition: all 0.2s;
          " onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'">
            <i class="fas fa-phone" style="margin-right: 8px;"></i>Accept
          </button>
          <button id="ovlReject" style="
            background: #ef4444;
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            min-width: 100px;
            transition: all 0.2s;
          " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
            <i class="fas fa-phone-slash" style="margin-right: 8px;"></i>Reject
          </button>
        </div>
      </div>
    `;

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(this.overlay);
  }

  acceptCall(roomName) {
    console.log('Accepting call to room:', roomName);
    // Navigate to video room - handle different page contexts
    const currentPath = window.location.pathname;
    let videoRoomPath = 'room-video.html';
    
    // If we're in a subdirectory, adjust the path
    if (currentPath.includes('/user/')) {
      videoRoomPath = '../room-video.html';
    } else if (currentPath.includes('/js/')) {
      videoRoomPath = '../room-video.html';
    }
    
    window.location.href = `${videoRoomPath}?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent('Me')}&mode=video`;
  }

  rejectCall(from, fromUserId) {
    console.log('Rejecting call from:', from);
    try {
      if (this.socket) {
        this.socket.emit('reject-call', { 
          from: from, 
          to: fromUserId || 'me' 
        });
      }
    } catch(e) {
      console.error('Failed to reject call:', e);
    }
  }

  maskName(name) {
    console.log('Masking name:', name);
    
    if (!name || name.length <= 2) {
      console.log('Name too short, returning as is:', name);
      return name;
    }
    
    // Keep first and last character, mask the rest
    const firstChar = name.charAt(0);
    const lastChar = name.charAt(name.length - 1);
    const maskedMiddle = '*'.repeat(name.length - 2);
    const maskedName = `${firstChar}${maskedMiddle}${lastChar}`;
    
    console.log('Masked name result:', maskedName);
    return maskedName;
  }

  showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 3001;
      max-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 14px; opacity: 0.9;">${message}</div>
    `;

    // Add animation CSS
    if (!document.querySelector('#notificationStyles')) {
      const style = document.createElement('style');
      style.id = 'notificationStyles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }
}

// Initialize incoming call handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.incomingCallHandler = new IncomingCallHandler();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IncomingCallHandler;
}
