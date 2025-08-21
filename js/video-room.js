// Video Call Room Implementation
class VideoCallRoom {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.roomName = this.params.get('room') || 'default-room';
    this.displayName = this.params.get('name') || 'Guest';
    this.mode = (this.params.get('mode') || 'video').toLowerCase();
    
    this.socket = null;
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callStartTime = Date.now();
    this.connectionRetryCount = 0;
    this.maxRetries = 3;
    this.isScreenSharing = false;
    this.originalVideoTrack = null;
    
    this.init();
  }

  init() {
    this.log('Initializing video call room...');
    this.setupUI();
    this.connectSocket();
    this.startCallTimer();
    this.setupEventListeners();
  }

  setupUI() {
    // Set room title
    const roomTitle = document.getElementById('roomTitle');
    if (roomTitle) {
      roomTitle.textContent = `Room: ${this.roomName}`;
    }

    // Setup debug button
    const btnDebug = document.getElementById('btnDebug');
    if (btnDebug) {
      btnDebug.onclick = () => this.toggleDebugLog();
    }

    // Setup minimize button
    const btnMinimize = document.getElementById('btnMinimize');
    if (btnMinimize) {
      btnMinimize.onclick = () => this.minimizeWindow();
    }
  }

  connectSocket() {
    try {
      const socketUrl = window.API_CONFIG ? window.API_CONFIG.getBaseUrl() : window.location.origin;
      this.socket = io(socketUrl, { 
        path: '/socket.io', 
        upgrade: false, 
        transports: ['polling'] 
      });

      // Expose socket globally for incoming call handler
      window.socket = this.socket;

      this.socket.on('connect', () => {
        this.log('Socket connected successfully');
        this.showStatus('Connected to server', 'success');
        this.socket.emit('join-room', { roomName: this.roomName, userName: this.displayName });
      });

      this.socket.on('connect_error', (error) => {
        this.log(`Socket connection error: ${error.message}`, 'error');
        this.showStatus(`Connection error: ${error.message}`, 'error');
      });

      this.setupSocketEventListeners();
    } catch (error) {
      this.log(`Failed to connect socket: ${error.message}`, 'error');
      this.showStatus(`Socket error: ${error.message}`, 'error');
    }
  }

  setupSocketEventListeners() {
    this.socket.on('room-participants', async (data) => {
      this.log(`Room participants: ${JSON.stringify(data)}`);
      if (data.participants && data.participants.length >= 2) {
        await this.setupVideoCall();
      }
    });

    this.socket.on('room-ready', async () => {
      this.log('Room ready for video call');
      await this.setupVideoCall();
    });

    this.socket.on('room-offer', async (data) => {
      this.log(`Received offer from: ${data.from}`);
      await this.handleOffer(data.offer);
    });

    this.socket.on('room-answer', async (data) => {
      this.log(`Received answer from: ${data.from}`);
      await this.handleAnswer(data.answer);
    });

    this.socket.on('room-ice-candidate', async (data) => {
      this.log(`Received ICE candidate from: ${data.from}`);
      await this.handleIceCandidate(data.candidate);
    });

    this.socket.on('user-joined', (data) => {
      this.log(`User joined: ${data.userName}`);
      this.showStatus(`${data.userName} joined the call`, 'success');
    });

    this.socket.on('user-left', (data) => {
      this.log(`User left: ${data.userName}`);
      this.showStatus(`${data.userName} left the call`, 'error');
    });
  }

  async setupVideoCall() {
    try {
      this.log('Setting up video call...');
      
      // Get user media
      await this.getUserMedia();
      
      // Create peer connection
      this.createPeerConnection();
      
      // Add local stream
      this.addLocalStream();
      
      // Create and send offer if we're the first to join
      if (this.shouldCreateOffer()) {
        await this.createAndSendOffer();
      }
      
      this.log('Video call setup completed');
    } catch (error) {
      this.log(`Failed to setup video call: ${error.message}`, 'error');
      this.showStatus(`Setup failed: ${error.message}`, 'error');
    }
  }

  async getUserMedia() {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.log('Got local media stream');
      
      // Set local video
      const localVideo = document.getElementById('localVideo');
      if (localVideo && this.localStream) {
        localVideo.srcObject = this.localStream;
        localVideo.muted = true;
      }
    } catch (error) {
      throw new Error(`Failed to access media devices: ${error.message}`);
    }
  }

  createPeerConnection() {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    this.pc = new RTCPeerConnection(config);
    this.log('Peer connection created');

    // Setup event handlers
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('room-ice-candidate', { 
          roomName: this.roomName, 
          candidate: event.candidate 
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.log(`Connection state: ${this.pc.connectionState}`);
      this.updateConnectionStatus(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      this.log(`ICE connection state: ${this.pc.iceConnectionState}`);
    };

    this.pc.ontrack = (event) => {
      this.log('Received remote track');
      this.remoteStream = event.streams[0];
      
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo && this.remoteStream) {
        remoteVideo.srcObject = this.remoteStream;
        remoteVideo.muted = false;
      }
    };
  }

  addLocalStream() {
    if (this.localStream && this.pc) {
      this.localStream.getTracks().forEach(track => {
        this.pc.addTrack(track, this.localStream);
      });
      this.log('Added local stream to peer connection');
    }
  }

  shouldCreateOffer() {
    // Simple logic: create offer if we don't have a local description
    return this.pc && !this.pc.currentLocalDescription;
  }

  async createAndSendOffer() {
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await this.pc.setLocalDescription(offer);
      this.socket.emit('room-offer', { roomName: this.roomName, offer });
      this.log('Offer sent');
    } catch (error) {
      this.log(`Failed to create offer: ${error.message}`, 'error');
    }
  }

  async handleOffer(offer) {
    try {
      if (this.pc) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.socket.emit('room-answer', { roomName: this.roomName, answer });
        this.log('Answer sent');
      }
    } catch (error) {
      this.log(`Failed to handle offer: ${error.message}`, 'error');
    }
  }

  async handleAnswer(answer) {
    try {
      if (this.pc && !this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        this.log('Remote description set from answer');
      }
    } catch (error) {
      this.log(`Failed to handle answer: ${error.message}`, 'error');
    }
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.pc) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        this.log('ICE candidate added');
      }
    } catch (error) {
      this.log(`Failed to add ICE candidate: ${error.message}`, 'error');
    }
  }

  updateConnectionStatus(state) {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    const statusMap = {
      'connecting': { icon: 'fa-wifi', text: 'Connecting...', color: '#f59e0b' },
      'connected': { icon: 'fa-check-circle', text: 'Connected', color: '#22c55e' },
      'disconnected': { icon: 'fa-exclamation-triangle', text: 'Disconnected', color: '#f59e0b' },
      'failed': { icon: 'fa-times-circle', text: 'Connection Failed', color: '#ef4444' },
      'closed': { icon: 'fa-times-circle', text: 'Connection Closed', color: '#6b7280' }
    };

    const status = statusMap[state] || { icon: 'fa-wifi', text: 'Initializing...', color: '#6b7280' };
    
    statusEl.innerHTML = `<i class="fas ${status.icon}"></i><span>${status.text}</span>`;
    statusEl.style.color = status.color;

    // Update status dot
    const statusDot = document.getElementById('statusDot');
    if (statusDot) {
      statusDot.style.background = status.color;
    }
  }

  setupEventListeners() {
    // Mute button
    const btnMute = document.getElementById('btnMute');
    if (btnMute) {
      btnMute.onclick = () => this.toggleMute();
    }

    // Video button
    const btnVideo = document.getElementById('btnVideo');
    if (btnVideo) {
      btnVideo.onclick = () => this.toggleVideo();
    }

    // Hangup button
    const btnHangup = document.getElementById('btnHangup');
    if (btnHangup) {
      btnHangup.onclick = () => this.hangup();
    }

    // Screen share button
    const btnScreenShare = document.getElementById('btnScreenShare');
    if (btnScreenShare) {
      btnScreenShare.onclick = () => this.toggleScreenShare();
    }

    // PIP button
    const btnTogglePIP = document.getElementById('btnTogglePIP');
    if (btnTogglePIP) {
      btnTogglePIP.onclick = () => this.togglePIP();
    }

    // More button
    const btnMore = document.getElementById('btnMore');
    if (btnMore) {
      btnMore.onclick = () => this.showMoreOptions();
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const btnMute = document.getElementById('btnMute');
        if (btnMute) {
          const isMuted = !audioTrack.enabled;
          btnMute.innerHTML = `
            <i class="fas fa-${isMuted ? 'microphone-slash' : 'microphone'}"></i>
            <span>${isMuted ? 'Unmute' : 'Mute'}</span>
          `;
          btnMute.style.background = isMuted ? '#ef4444' : 'rgba(255,255,255,0.1)';
        }
      }
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const btnVideo = document.getElementById('btnVideo');
        if (btnVideo) {
          const isVideoOff = !videoTrack.enabled;
          btnVideo.innerHTML = `
            <i class="fas fa-${isVideoOff ? 'video-slash' : 'video'}"></i>
            <span>${isVideoOff ? 'Video On' : 'Video Off'}</span>
          `;
          btnVideo.style.background = isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.1)';
        }
      }
    }
  }

  async toggleScreenShare() {
    try {
      if (!this.isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' }
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender) {
          this.originalVideoTrack = this.localStream.getVideoTracks()[0];
          sender.replaceTrack(videoTrack);
          this.isScreenSharing = true;
          
          const btnScreenShare = document.getElementById('btnScreenShare');
          if (btnScreenShare) {
            btnScreenShare.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
            btnScreenShare.style.background = '#ef4444';
          }

          // Handle screen share stop
          videoTrack.onended = () => {
            this.stopScreenShare();
          };
        }
      } else {
        this.stopScreenShare();
      }
    } catch (error) {
      this.log(`Screen share failed: ${error.message}`, 'error');
      this.showStatus('Screen sharing not supported', 'error');
    }
  }

  stopScreenShare() {
    if (this.isScreenSharing && this.originalVideoTrack) {
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(this.originalVideoTrack);
      }
      
      this.isScreenSharing = false;
      this.originalVideoTrack = null;
      
      const btnScreenShare = document.getElementById('btnScreenShare');
      if (btnScreenShare) {
        btnScreenShare.innerHTML = '<i class="fas fa-desktop"></i><span>Share</span>';
        btnScreenShare.style.background = 'rgba(255,255,255,0.1)';
      }
    }
  }

  togglePIP() {
    const localVideo = document.getElementById('localVideo');
    if (localVideo && localVideo.requestPictureInPicture) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else {
        localVideo.requestPictureInPicture();
      }
    }
  }

  showMoreOptions() {
    // Implement more options menu
    this.log('More options clicked');
  }

  hangup() {
    this.log('Hanging up...');
    
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (this.pc) {
      this.pc.close();
    }
    
    // Leave room
    if (this.socket) {
      this.socket.emit('leave-room', { roomName: this.roomName, userName: this.displayName });
    }
    
    // Navigate back
    window.history.back();
  }

  startCallTimer() {
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const timerEl = document.getElementById('callTimer');
      if (timerEl) {
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  toggleDebugLog() {
    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
      debugLog.classList.toggle('show');
    }
  }

  minimizeWindow() {
    // Implement minimize functionality
    this.log('Minimize clicked');
  }

  log(message, type = 'info') {
    console.log(`[VideoCall] ${message}`);
    
    const logContent = document.getElementById('logContent');
    if (logContent) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement('div');
      logEntry.style.marginBottom = '5px';
      logEntry.style.color = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#fff';
      logEntry.textContent = `[${timestamp}] ${message}`;
      logContent.appendChild(logEntry);
      logContent.scrollTop = logContent.scrollHeight;
    }
  }

  showStatus(message, type = 'info') {
    const statusMessages = document.getElementById('statusMessages');
    if (statusMessages) {
      const statusDiv = document.createElement('div');
      statusDiv.className = type === 'error' ? 'error-message' : 'success-message';
      statusDiv.textContent = message;
      statusMessages.appendChild(statusDiv);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.remove();
        }
      }, 5000);
    }
  }
}

// Initialize video call room when page loads
document.addEventListener('DOMContentLoaded', () => {
  new VideoCallRoom();
});
