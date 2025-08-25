// js/incoming-call.js

class IncomingCallHandler {
  constructor() {
    this.socket = null;
    this.overlay = null;
    this.isInitialized = false;
    this.callerTune = new Audio('../sounds/ringtone.mp3');
    this.callerTune.loop = true;
    this.currentIncomingData = null;
    this.init();
  }

  init() {
    const checkSocket = () => {
      if (window.socket) {
        this.socket = window.socket;
        this.setupEventListeners();
      } else {
        setTimeout(checkSocket, 200);
      }
    };
    checkSocket();
  }

  setupEventListeners() {
    if (this.isInitialized || !this.socket) return;
    this.isInitialized = true;

    this.socket.on('incoming-call', (data) => {
      this.currentIncomingData = data;
      this.showIncomingCall(data);
    });

    this.socket.on('call-timeout', () => this.hideAndStop());
    this.socket.on('call-ended', () => this.hideAndStop());
  }

  showIncomingCall({ from, fromUserId, suggestedRoom }) {
    this.createOverlay();

    const fromText = this.overlay.querySelector('#incomingFrom');
    if (fromText) fromText.textContent = `Incoming call from ${from}`;

    this.overlay.style.display = 'flex';
    this.startRing();

    const acceptBtn = this.overlay.querySelector('#ovlAccept');
    if (acceptBtn) {
      acceptBtn.onclick = () => {
        this.hideAndStop();
        this.socket.emit('accept-call', {
          from: this.getLocalUserName(),
          to: from,
          roomName: suggestedRoom
        });
        const roomPath = this.guessVideoRoomPath();
        window.location.href = `${roomPath}?room=${encodeURIComponent(suggestedRoom)}&name=${encodeURIComponent(this.getLocalUserName())}&mode=video`;
      };
    }

    const rejectBtn = this.overlay.querySelector('#ovlReject');
    if (rejectBtn) {
      rejectBtn.onclick = () => {
        this.hideAndStop();
        this.socket.emit('reject-call', {
          from: this.getLocalUserName(),
          to: from
        });
      };
    }
  }

  hideAndStop() {
    this.stopRing();
    this.destroyOverlay();
    this.currentIncomingData = null;
  }

  destroyOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  createOverlay() {
    if (document.getElementById('incomingOverlay')) return;
    this.overlay = document.createElement('div');
    this.overlay.id = 'incomingOverlay';
    this.overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: none;
      align-items: center; justify-content: center; z-index: 4000; backdrop-filter: blur(4px);`;
    this.overlay.innerHTML = `
      <div style="background:#fff; padding:24px; border-radius:16px; min-width:300px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <div style="font-size:48px; color:#b03b6a; margin-bottom:16px; animation:pulse 1.5s infinite;">
          <i class="fas fa-phone-alt"></i>
        </div>
        <div id="incomingFrom" style="font-weight:700; color:#1f2937; font-size:20px; margin-bottom:24px;"></div>
        <div style="display:flex; gap:16px; justify-content:center;">
          <button id="ovlAccept" style="background:#22c55e; color:#fff; border:none; padding:12px; border-radius:50%; width: 60px; height: 60px; font-size:24px; cursor:pointer;">
            <i class="fas fa-phone"></i>
          </button>
          <button id="ovlReject" style="background:#ef4444; color:#fff; border:none; padding:12px; border-radius:50%; width: 60px; height: 60px; font-size:24px; cursor:pointer;">
            <i class="fas fa-phone-slash"></i>
          </button>
        </div>
      </div>`;
    const style = document.createElement('style');
    style.textContent = `@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`;
    document.head.appendChild(style);
    document.body.appendChild(this.overlay);
  }

  startRing() { this.callerTune.play().catch(e => console.warn("Ringtone blocked.", e)); }
  stopRing() { this.callerTune.pause(); this.callerTune.currentTime = 0; }

  guessVideoRoomPath() {
    const path = window.location.pathname;
    return (path.includes('/user/') || path.includes('/host/')) ? '../room-video.html' : 'room-video.html';
  }

  getLocalUserName() { return window.MY_USERNAME || 'User'; }
}

if (!window.incomingCallHandler) {
  window.incomingCallHandler = new IncomingCallHandler();
}