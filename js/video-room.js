// // // Video Call Room Implementation
// // class VideoCallRoom {
// //   constructor() {
// //     this.params = new URLSearchParams(window.location.search);
// //     this.roomName = this.params.get('room') || 'default-room';
// //     this.displayName = this.params.get('name') || 'Guest';
// //     this.mode = (this.params.get('mode') || 'video').toLowerCase();

// //     this.socket = null;
// //     this.pc = null;
// //     this.localStream = null;
// //     this.remoteStream = null;
// //     this.callStartTime = null; // Will be set when the connection is established
// //     this.callTimerInterval = null;
// //     this.connectionRetryCount = 0;
// //     this.maxRetries = 3;
// //     this.isScreenSharing = false;
// //     this.originalVideoTrack = null;

// //     this.init();
// //   }

// //   init() {
// //     this.log('Initializing video call room...');
// //     this.setupUI();
// //     this.connectSocket();
// //     // this.startCallTimer();
// //     this.setupEventListeners();
// //   }

// //   setupUI() {
// //     // Set room title
// //     const roomTitle = document.getElementById('roomTitle');
// //     if (roomTitle) {
// //       roomTitle.textContent = `Room: ${this.roomName}`;
// //     }

// //     // Setup debug button
// //     const btnDebug = document.getElementById('btnDebug');
// //     if (btnDebug) {
// //       btnDebug.onclick = () => this.toggleDebugLog();
// //     }

// //     // Setup minimize button
// //     const btnMinimize = document.getElementById('btnMinimize');
// //     if (btnMinimize) {
// //       btnMinimize.onclick = () => this.minimizeWindow();
// //     }
// //   }

// //   connectSocket() {
// //     try {
// //       const socketUrl = window.API_CONFIG ? window.API_CONFIG.getBaseUrl() : window.location.origin;
// //       this.socket = io(socketUrl, {
// //         path: '/socket.io',
// //         upgrade: false,
// //         transports: ['polling']
// //       });
// //       // Expose socket globally for incoming call handler
// //       window.socket = this.socket;

// //       this.socket.on('connect', () => {
// //         this.log('Socket connected successfully');
// //         this.showStatus('Connected to server', 'success');
// //         this.socket.emit('join-room', { roomName: this.roomName, userName: this.displayName });
// //       });

// //       this.socket.on('connect_error', (error) => {
// //         this.log(`Socket connection error: ${error.message}`, 'error');
// //         this.showStatus(`Connection error: ${error.message}`, 'error');
// //       });

// //       this.setupSocketEventListeners();
// //     } catch (error) {
// //       this.log(`Failed to connect socket: ${error.message}`, 'error');
// //       this.showStatus(`Socket error: ${error.message}`, 'error');
// //     }
// //   }

// //   setupSocketEventListeners() {
// //     this.socket.on('room-participants', async (data) => {
// //       this.log(`Room participants: ${JSON.stringify(data)}`);
// //       if (data.participants && data.participants.length >= 2) {
// //         await this.setupVideoCall();
// //       }
// //     });

// //     this.socket.on('room-ready', async () => {
// //       this.log('Room ready for video call');
// //       await this.setupVideoCall();
// //     });

// //     this.socket.on('room-offer', async (data) => {
// //       this.log(`Received offer from: ${data.from}`);
// //       await this.handleOffer(data.offer);
// //     });

// //     this.socket.on('room-answer', async (data) => {
// //       this.log(`Received answer from: ${data.from}`);
// //       await this.handleAnswer(data.answer);
// //     });

// //     this.socket.on('room-ice-candidate', async (data) => {
// //       this.log(`Received ICE candidate from: ${data.from}`);
// //       await this.handleIceCandidate(data.candidate);
// //     });

// //     this.socket.on('user-joined', (data) => {
// //       this.log(`User joined: ${data.userName}`);
// //       this.showStatus(`${data.userName} joined the call`, 'success');
// //     });

// //     this.socket.on('user-left', (data) => {
// //       this.log(`User left: ${data.userName}`);
// //       this.showStatus(`${data.userName} left the call`, 'error');
// //     });
// //   }

// //   async setupVideoCall() {
// //     try {
// //       this.log('Setting up video call...');

// //       // Get user media
// //       await this.getUserMedia();

// //       // Create peer connection
// //       this.createPeerConnection();

// //       // Add local stream
// //       this.addLocalStream();

// //       // Create and send offer if we're the first to join
// //       if (this.shouldCreateOffer()) {
// //         await this.createAndSendOffer();
// //       }

// //       this.log('Video call setup completed');
// //     } catch (error) {
// //       this.log(`Failed to setup video call: ${error.message}`, 'error');
// //       this.showStatus(`Setup failed: ${error.message}`, 'error');
// //     }
// //   }

// //   async getUserMedia() {
// //     try {
// //       const constraints = {
// //         video: {
// //           width: { ideal: 1280, max: 1920 },
// //           height: { ideal: 720, max: 1080 },
// //           frameRate: { ideal: 30, max: 60 }
// //         },
// //         audio: {
// //           echoCancellation: true,
// //           noiseSuppression: true,
// //           autoGainControl: true,
// //           sampleRate: 48000
// //         }
// //       };

// //       this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
// //       this.log('Got local media stream');

// //       // Set local video
// //       const localVideo = document.getElementById('localVideo');
// //       if (localVideo && this.localStream) {
// //         localVideo.srcObject = this.localStream;
// //         localVideo.muted = true;
// //       }
// //     } catch (error) {
// //       throw new Error(`Failed to access media devices: ${error.message}`);
// //     }
// //   }

// //   createPeerConnection() {
// //     const config = {
// //       iceServers: [
// //         { urls: 'stun:stun.l.google.com:19302' },
// //         { urls: 'stun:stun1.l.google.com:19302' },
// //         { urls: 'stun:stun2.l.google.com:19302' },
// //         { urls: 'stun:stun3.l.google.com:19302' },
// //         { urls: 'stun:stun4.l.google.com:19302' }
// //       ],
// //       iceCandidatePoolSize: 10,
// //       bundlePolicy: 'max-bundle',
// //       rtcpMuxPolicy: 'require'
// //     };

// //     this.pc = new RTCPeerConnection(config);
// //     this.log('Peer connection created');

// //     // Setup event handlers
// //     this.pc.onicecandidate = (event) => {
// //       if (event.candidate) {
// //         this.socket.emit('room-ice-candidate', {
// //           roomName: this.roomName,
// //           candidate: event.candidate
// //         });
// //       }
// //     };

// //     this.pc.onconnectionstatechange = () => {
// //       this.log(`Connection state: ${this.pc.connectionState}`);
// //       this.updateConnectionStatus(this.pc.connectionState);

// //       if (this.pc.connectionState === 'connected') {
// //         if (!this.callStartTime) {
// //           this.callStartTime = Date.now();
// //           this.startCallTimer(); // start the visible timer on the UI
// //         }
// //       } else if (this.pc.connectionState === 'closed' || this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed') {
// //         // Stop timer when call is over or failed
// //         this.stopCallTimer();
// //       }
// //     };

// //     this.pc.oniceconnectionstatechange = () => {
// //       this.log(`ICE connection state: ${this.pc.iceConnectionState}`);
// //     };

// //     this.pc.ontrack = (event) => {
// //       this.log('Received remote track');
// //       this.remoteStream = event.streams[0];

// //       const remoteVideo = document.getElementById('remoteVideo');
// //       if (remoteVideo && this.remoteStream) {
// //         remoteVideo.srcObject = this.remoteStream;
// //         remoteVideo.muted = false;
// //       }
// //     };
// //   }

// //   addLocalStream() {
// //     if (this.localStream && this.pc) {
// //       this.localStream.getTracks().forEach(track => {
// //         this.pc.addTrack(track, this.localStream);
// //       });
// //       this.log('Added local stream to peer connection');
// //     }
// //   }

// //   shouldCreateOffer() {
// //     // Simple logic: create offer if we don't have a local description
// //     return this.pc && !this.pc.currentLocalDescription;
// //   }

// //   async createAndSendOffer() {
// //     try {
// //       const offer = await this.pc.createOffer({
// //         offerToReceiveAudio: true,
// //         offerToReceiveVideo: true
// //       });

// //       await this.pc.setLocalDescription(offer);
// //       this.socket.emit('room-offer', { roomName: this.roomName, offer });
// //       this.log('Offer sent');
// //     } catch (error) {
// //       this.log(`Failed to create offer: ${error.message}`, 'error');
// //     }
// //   }

// //   async handleOffer(offer) {
// //     try {
// //       if (this.pc) {
// //         await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
// //         const answer = await this.pc.createAnswer();
// //         await this.pc.setLocalDescription(answer);
// //         this.socket.emit('room-answer', { roomName: this.roomName, answer });
// //         this.log('Answer sent');
// //       }
// //     } catch (error) {
// //       this.log(`Failed to handle offer: ${error.message}`, 'error');
// //     }
// //   }

// //   async handleAnswer(answer) {
// //     try {
// //       if (this.pc && !this.pc.currentRemoteDescription) {
// //         await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
// //         this.log('Remote description set from answer');
// //       }
// //     } catch (error) {
// //       this.log(`Failed to handle answer: ${error.message}`, 'error');
// //     }
// //   }

// //   async handleIceCandidate(candidate) {
// //     try {
// //       if (this.pc) {
// //         await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
// //         this.log('ICE candidate added');
// //       }
// //     } catch (error) {
// //       this.log(`Failed to add ICE candidate: ${error.message}`, 'error');
// //     }
// //   }

// //   updateConnectionStatus(state) {
// //     const statusEl = document.getElementById('connectionStatus');
// //     if (!statusEl) return;

// //     const statusMap = {
// //       'connecting': { icon: 'fa-wifi', text: 'Connecting...', color: '#f59e0b' },
// //       'connected': { icon: 'fa-check-circle', text: 'Connected', color: '#22c55e' },
// //       'disconnected': { icon: 'fa-exclamation-triangle', text: 'Disconnected', color: '#f59e0b' },
// //       'failed': { icon: 'fa-times-circle', text: 'Connection Failed', color: '#ef4444' },
// //       'closed': { icon: 'fa-times-circle', text: 'Connection Closed', color: '#6b7280' }
// //     };

// //     const status = statusMap[state] || { icon: 'fa-wifi', text: 'Initializing...', color: '#6b7280' };

// //     statusEl.innerHTML = `<i class="fas ${status.icon}"></i><span>${status.text}</span>`;
// //     statusEl.style.color = status.color;

// //     // Update status dot
// //     const statusDot = document.getElementById('statusDot');
// //     if (statusDot) {
// //       statusDot.style.background = status.color;
// //     }
// //   }

// //   setupEventListeners() {
// //     // Mute button
// //     const btnMute = document.getElementById('btnMute');
// //     if (btnMute) {
// //       btnMute.onclick = () => this.toggleMute();
// //     }

// //     // Video button
// //     const btnVideo = document.getElementById('btnVideo');
// //     if (btnVideo) {
// //       btnVideo.onclick = () => this.toggleVideo();
// //     }

// //     // Hangup button
// //     const btnHangup = document.getElementById('btnHangup');
// //     if (btnHangup) {
// //       btnHangup.onclick = () => this.hangup();
// //     }

// //     // Screen share button
// //     const btnScreenShare = document.getElementById('btnScreenShare');
// //     if (btnScreenShare) {
// //       btnScreenShare.onclick = () => this.toggleScreenShare();
// //     }

// //     // PIP button
// //     const btnTogglePIP = document.getElementById('btnTogglePIP');
// //     if (btnTogglePIP) {
// //       btnTogglePIP.onclick = () => this.togglePIP();
// //     }

// //     // More button
// //     const btnMore = document.getElementById('btnMore');
// //     if (btnMore) {
// //       btnMore.onclick = () => this.showMoreOptions();
// //     }
// //   }

// //   toggleMute() {
// //     if (this.localStream) {
// //       const audioTrack = this.localStream.getAudioTracks()[0];
// //       if (audioTrack) {
// //         audioTrack.enabled = !audioTrack.enabled;
// //         const btnMute = document.getElementById('btnMute');
// //         if (btnMute) {
// //           const isMuted = !audioTrack.enabled;
// //           btnMute.innerHTML = `
// //             <i class="fas fa-${isMuted ? 'microphone-slash' : 'microphone'}"></i>
// //             <span>${isMuted ? 'Unmute' : 'Mute'}</span>
// //           `;
// //           btnMute.style.background = isMuted ? '#ef4444' : 'rgba(255,255,255,0.1)';
// //         }
// //       }
// //     }
// //   }

// //   toggleVideo() {
// //     if (this.localStream) {
// //       const videoTrack = this.localStream.getVideoTracks()[0];
// //       if (videoTrack) {
// //         videoTrack.enabled = !videoTrack.enabled;
// //         const btnVideo = document.getElementById('btnVideo');
// //         if (btnVideo) {
// //           const isVideoOff = !videoTrack.enabled;
// //           btnVideo.innerHTML = `
// //             <i class="fas fa-${isVideoOff ? 'video-slash' : 'video'}"></i>
// //             <span>${isVideoOff ? 'Video On' : 'Video Off'}</span>
// //           `;
// //           btnVideo.style.background = isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.1)';
// //         }
// //       }
// //     }
// //   }

// //   async toggleScreenShare() {
// //     try {
// //       if (!this.isScreenSharing) {
// //         // Start screen sharing
// //         const screenStream = await navigator.mediaDevices.getDisplayMedia({
// //           video: { cursor: 'always' }
// //         });

// //         const videoTrack = screenStream.getVideoTracks()[0];
// //         const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');

// //         if (sender) {
// //           this.originalVideoTrack = this.localStream.getVideoTracks()[0];
// //           sender.replaceTrack(videoTrack);
// //           this.isScreenSharing = true;

// //           const btnScreenShare = document.getElementById('btnScreenShare');
// //           if (btnScreenShare) {
// //             btnScreenShare.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
// //             btnScreenShare.style.background = '#ef4444';
// //           }

// //           // Handle screen share stop
// //           videoTrack.onended = () => {
// //             this.stopScreenShare();
// //           };
// //         }
// //       } else {
// //         this.stopScreenShare();
// //       }
// //     } catch (error) {
// //       this.log(`Screen share failed: ${error.message}`, 'error');
// //       this.showStatus('Screen sharing not supported', 'error');
// //     }
// //   }

// //   stopScreenShare() {
// //     if (this.isScreenSharing && this.originalVideoTrack) {
// //       const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
// //       if (sender) {
// //         sender.replaceTrack(this.originalVideoTrack);
// //       }

// //       this.isScreenSharing = false;
// //       this.originalVideoTrack = null;

// //       const btnScreenShare = document.getElementById('btnScreenShare');
// //       if (btnScreenShare) {
// //         btnScreenShare.innerHTML = '<i class="fas fa-desktop"></i><span>Share</span>';
// //         btnScreenShare.style.background = 'rgba(255,255,255,0.1)';
// //       }
// //     }
// //   }

// //   togglePIP() {
// //     const localVideo = document.getElementById('localVideo');
// //     if (localVideo && localVideo.requestPictureInPicture) {
// //       if (document.pictureInPictureElement) {
// //         document.exitPictureInPicture();
// //       } else {
// //         localVideo.requestPictureInPicture();
// //       }
// //     }
// //   }

// //   showMoreOptions() {
// //     // Implement more options menu
// //     this.log('More options clicked');
// //   }

// //   hangup() {
// //     this.log('Hanging up...');

// //     // Stop all tracks
// //     if (this.localStream) {
// //       this.localStream.getTracks().forEach(track => track.stop());
// //     }

// //     // Close peer connection
// //     if (this.pc) {
// //       this.pc.close();
// //     }

// //     // Leave room
// //     if (this.socket) {
// //       this.socket.emit('leave-room', { roomName: this.roomName, userName: this.displayName });
// //     }
// //     this.stopCallTimer();

// //     // Navigate back
// //     window.history.back();
// //   }

// //   // Timer helpers
// //   startCallTimer() {
// //     if (this.callTimerInterval) return; // already running
// //     this.callTimerInterval = setInterval(() => {
// //       if (!this.callStartTime) return;
// //       const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
// //       const minutes = Math.floor(elapsed / 60);
// //       const seconds = elapsed % 60;
// //       const timerEl = document.getElementById('callTimer');
// //       if (timerEl) timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
// //     }, 1000);
// //   }

// //   stopCallTimer() {
// //     if (this.callTimerInterval) {
// //       clearInterval(this.callTimerInterval);
// //       this.callTimerInterval = null;
// //     }
// //   }
// // }

// // toggleDebugLog() {
// //   const debugLog = document.getElementById('debugLog');
// //   if (debugLog) {
// //     debugLog.classList.toggle('show');
// //   }
// // }

// // minimizeWindow() {
// //   // Implement minimize functionality
// //   this.log('Minimize clicked');
// // }

// // log(message, type = 'info') {
// //   console.log(`[VideoCall] ${message}`);

// //   const logContent = document.getElementById('logContent');
// //   if (logContent) {
// //     const timestamp = new Date().toLocaleTimeString();
// //     const logEntry = document.createElement('div');
// //     logEntry.style.marginBottom = '5px';
// //     logEntry.style.color = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#fff';
// //     logEntry.textContent = `[${timestamp}] ${message}`;
// //     logContent.appendChild(logEntry);
// //     logContent.scrollTop = logContent.scrollHeight;
// //   }
// // }

// // showStatus(message, type = 'info') {
// //   const statusMessages = document.getElementById('statusMessages');
// //   if (statusMessages) {
// //     const statusDiv = document.createElement('div');
// //     statusDiv.className = type === 'error' ? 'error-message' : 'success-message';
// //     statusDiv.textContent = message;
// //     statusMessages.appendChild(statusDiv);

// //     // Auto-remove after 5 seconds
// //     setTimeout(() => {
// //       if (statusDiv.parentNode) {
// //         statusDiv.remove();
// //       }
// //     }, 5000);
// //   }
// // }
// // }

// // // Initialize video call room when page loads
// // document.addEventListener('DOMContentLoaded', () => {
// //   new VideoCallRoom();
// // });


// // frontend/js/video-room.js
// // Video Call Room Implementation (modified timer behavior)
// //
// // Changes:
// // - Do NOT start the call timer in constructor. Instead start it when PeerConnection becomes connected.
// // - This ensures the "call seconds counts like 1 2 3..." only after the call is actually established.

// class VideoCallRoom {
//   constructor() {
//     this.params = new URLSearchParams(window.location.search);
//     this.roomName = this.params.get('room') || 'default-room';
//     this.displayName = this.params.get('name') || 'Guest';
//     this.mode = (this.params.get('mode') || 'video').toLowerCase();

//     this.socket = null;
//     this.pc = null;
//     this.localStream = null;
//     this.remoteStream = null;
//     this.callStartTime = null; // Will be set when the connection is established
//     this.callTimerInterval = null;

//     this.isPolite = false; // Helps determine who should make the offer to avoid conflicts
//     this.iceCandidateQueue = [];

//     this.connectionRetryCount = 0;
//     this.maxRetries = 3;
//     this.isScreenSharing = false;
//     this.originalVideoTrack = null;

//     this.init();
//   }

//   init() {
//     this.log('Initializing video call room...');
//     this.setupUI();
//     this.connectSocket();
//     // Do NOT start call timer here. Timer will start when connection state becomes 'connected'
//     this.setupEventListeners();
//   }

//   setupUI() {
//     const roomTitle = document.getElementById('roomTitle');
//     if (roomTitle) roomTitle.textContent = `Room: ${this.roomName}`;

//     const btnDebug = document.getElementById('btnDebug');
//     if (btnDebug) btnDebug.onclick = () => this.toggleDebugLog();

//     // const btnMinimize = document.getElementById('btnMinimize');
//     // if (btnMinimize) btnMinimize.onclick = () => this.minimizeWindow();
//   }

//   connectSocket() {
//     try {
//       const socketUrl = window.API_CONFIG ? window.API_CONFIG.getBaseUrl() : window.location.origin;
//       this.socket = io(socketUrl, { path: '/socket.io', upgrade: false, transports: ['polling'] });
//       window.socket = this.socket;
//       this.socket.on('connect', () => {
//         this.log('Socket connected successfully');
//         this.showStatus('Connected to server', 'success');
//         this.socket.emit('join-room', { roomName: this.roomName, userName: this.displayName });
//       });
//       this.socket.on('connect_error', (error) => {
//         this.log(`Socket connection error: ${error.message}`, 'error');
//         this.showStatus(`Connection error: ${error.message}`, 'error');
//       });
//       this.setupSocketEventListeners();
//     } catch (error) {
//       this.log(`Failed to connect socket: ${error.message}`, 'error');
//       this.showStatus(`Socket error: ${error.message}`, 'error');
//     }
//   }

//   setupSocketEventListeners() {
//     this.socket.on('room-participants', async (data) => {
//       this.log(`Room participants: ${JSON.stringify(data)}`);
//       if (data.participants && data.participants.length >= 2) {
//         await this.setupVideoCall();
//       }
//     });

//     this.socket.on('room-ready', async () => {
//       this.log('Room ready for video call');
//       await this.setupVideoCall();
//     });

//     this.socket.on('room-offer', async (data) => {
//       this.log(`Received offer from: ${data.from}`);
//       await this.handleOffer(data.offer);
//     });

//     this.socket.on('room-answer', async (data) => {
//       this.log(`Received answer from: ${data.from}`);
//       await this.handleAnswer(data.answer);
//     });

//     this.socket.on('room-ice-candidate', async (data) => {
//       this.log(`Received ICE candidate from: ${data.from}`);
//       await this.handleIceCandidate(data.candidate);
//     });

//     this.socket.on('user-joined', (data) => {
//       this.log(`User joined: ${data.userName}`);
//       this.showStatus(`${data.userName} joined the call`, 'success');
//     });

//     this.socket.on('user-left', (data) => {
//       this.log(`User left: ${data.userName}`);
//       this.showStatus(`${data.userName} left the call`, 'error');
//     });
//   }

//   async setupVideoCall() {
//     try {
//       this.log('Setting up video call...');
//       await this.getUserMedia();
//       this.createPeerConnection();
//       this.addLocalStream();
//       if (this.shouldCreateOffer()) {
//         await this.createAndSendOffer();
//       }
//       this.log('Video call setup completed');
//     } catch (error) {
//       this.log(`Failed to setup video call: ${error.message}`, 'error');
//       this.showStatus(`Setup failed: ${error.message}`, 'error');
//     }
//   }

//   async getUserMedia() {
//     try {
//       const constraints = {
//         video: {
//           width: { ideal: 1280, max: 1920 },
//           height: { ideal: 720, max: 1080 },
//           frameRate: { ideal: 30, max: 60 }
//         },
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//           sampleRate: 48000
//         }
//       };

//       this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
//       this.log('Got local media stream');
//       const localVideo = document.getElementById('localVideo');
//       if (localVideo && this.localStream) {
//         localVideo.srcObject = this.localStream;
//         localVideo.muted = true;
//       }
//     } catch (error) {
//       throw new Error(`Failed to access media devices: ${error.message}`);
//     }
//   }

//   createPeerConnection() {
//     const config = {
//       iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' },
//         { urls: 'stun:stun1.l.google.com:19302' },
//         { urls: 'stun:stun2.l.google.com:19302' },
//         { urls: 'stun:stun3.l.google.com:19302' },
//         { urls: 'stun:stun4.l.google.com:19302' }
//       ],

//       iceCandidatePoolSize: 10,
//       bundlePolicy: 'max-bundle',
//       rtcpMuxPolicy: 'require'
//     };

//     this.pc = new RTCPeerConnection(config);
//     this.log('Peer connection created');

//     this.pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         this.socket.emit('room-ice-candidate', { roomName: this.roomName, candidate: event.candidate });
//       }
//     };

//     // When peer connection state changes, start the call timer only when 'connected'
//     // this.pc.onconnectionstatechange = () => {
//     //   this.log(`Connection state: ${this.pc.connectionState}`);
//     //   this.updateConnectionStatus(this.pc.connectionState);

//     //   // Start timer only when fully connected
//     //   if (this.pc.connectionState === 'connected') {
//     //     if (!this.callStartTime) {
//     //       this.callStartTime = Date.now();
//     //       this.startCallTimer(); // start the visible timer on the UI
//     //     }
//     //   } else if (this.pc.connectionState === 'closed' || this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed') {
//     //     // Stop timer when call is over or failed
//     //     this.stopCallTimer();
//     //   }
//     // };

//     this.pc.onconnectionstatechange = () => {
//       const state = this.pc.connectionState;
//       this.log(`Connection state: ${state}`);
//       this.updateConnectionStatus(state);

//       if (state === 'connected') {
//         // If the connection is successful and the timer hasn't started yet, start it.
//         if (!this.callStartTime) {
//           this.log('Call connected. Starting timer.');
//           this.callStartTime = Date.now();
//           this.startCallTimer();
//         }
//       } else if (['disconnected', 'closed', 'failed'].includes(state)) {
//         // If the call disconnects, fails, or is closed, stop the timer.
//         this.log('Call disconnected or failed. Stopping timer.');
//         this.stopCallTimer();
//       }
//     };

//     this.pc.oniceconnectionstatechange = () => {
//       this.log(`ICE connection state: ${this.pc.iceConnectionState}`);
//     };

//     this.pc.ontrack = (event) => {
//       this.log('Received remote track');
//       this.remoteStream = event.streams[0];
//       const remoteVideo = document.getElementById('remoteVideo');
//       if (remoteVideo && this.remoteStream) {
//         remoteVideo.srcObject = this.remoteStream;
//         remoteVideo.muted = false;
//       }
//     };
//   }

//   addLocalStream() {
//     if (this.localStream && this.pc) {
//       this.localStream.getTracks().forEach(track => {
//         this.pc.addTrack(track, this.localStream);
//       });
//       this.log('Added local stream to peer connection');
//     }
//   }

//   shouldCreateOffer() {
//     return this.pc && !this.pc.currentLocalDescription;
//   }

//   async createAndSendOffer() {
//     try {
//       const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
//       await this.pc.setLocalDescription(offer);
//       this.socket.emit('room-offer', { roomName: this.roomName, offer });
//       this.log('Offer sent');
//     } catch (error) {
//       this.log(`Failed to create offer: ${error.message}`, 'error');
//     }
//   }

//   async handleOffer(offer) {
//     try {
//       if (this.pc) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
//         const answer = await this.pc.createAnswer();
//         await this.pc.setLocalDescription(answer);
//         this.socket.emit('room-answer', { roomName: this.roomName, answer });
//         this.log('Answer sent');
//       }
//     } catch (error) {
//       this.log(`Failed to handle offer: ${error.message}`, 'error');
//     }
//   }

//   async handleAnswer(answer) {
//     try {
//       if (this.pc && !this.pc.currentRemoteDescription) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
//         this.log('Remote description set from answer');
//       }
//     } catch (error) {
//       this.log(`Failed to handle answer: ${error.message}`, 'error');
//     }
//   }

//   async handleIceCandidate(candidate) {
//     try {
//       if (this.pc) {
//         await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
//         this.log('ICE candidate added');
//       }
//     } catch (error) {
//       this.log(`Failed to add ICE candidate: ${error.message}`, 'error');
//     }
//   }

//   updateConnectionStatus(state) {
//     const statusEl = document.getElementById('connectionStatus');
//     if (!statusEl) return;
//     const statusMap = {
//       'connecting': { icon: 'fa-wifi', text: 'Connecting...', color: '#f59e0b' },
//       'connected': { icon: 'fa-check-circle', text: 'Connected', color: '#22c55e' },
//       'disconnected': { icon: 'fa-exclamation-triangle', text: 'Disconnected', color: '#f59e0b' },
//       'failed': { icon: 'fa-times-circle', text: 'Connection Failed', color: '#ef4444' },
//       'closed': { icon: 'fa-times-circle', text: 'Connection Closed', color: '#6b7280' }
//     };
//     const status = statusMap[state] || { icon: 'fa-wifi', text: 'Initializing...', color: '#6b7280' };
//     statusEl.innerHTML = `<i class="fas ${status.icon}"></i><span>${status.text}</span>`;
//     statusEl.style.color = status.color;
//     const statusDot = document.getElementById('statusDot');
//     if (statusDot) statusDot.style.background = status.color;
//   }

//   setupEventListeners() {
//     const btnMute = document.getElementById('btnMute');
//     if (btnMute) btnMute.onclick = () => this.toggleMute();
//     const btnVideo = document.getElementById('btnVideo');
//     if (btnVideo) btnVideo.onclick = () => this.toggleVideo();
//     const btnHangup = document.getElementById('btnHangup');
//     if (btnHangup) btnHangup.onclick = () => this.hangup();
//     const btnScreenShare = document.getElementById('btnScreenShare');
//     if (btnScreenShare) btnScreenShare.onclick = () => this.toggleScreenShare();
//     const btnTogglePIP = document.getElementById('btnTogglePIP');
//     if (btnTogglePIP) btnTogglePIP.onclick = () => this.togglePIP();
//     const btnMore = document.getElementById('btnMore');
//     if (btnMore) btnMore.onclick = () => this.showMoreOptions();
//   }

//   toggleMute() {
//     if (this.localStream) {
//       const audioTrack = this.localStream.getAudioTracks()[0];
//       if (audioTrack) {
//         audioTrack.enabled = !audioTrack.enabled;
//         const btnMute = document.getElementById('btnMute');
//         if (btnMute) {
//           const isMuted = !audioTrack.enabled;
//           btnMute.innerHTML = `<i class="fas fa-${isMuted ? 'microphone-slash' : 'microphone'}"></i><span>${isMuted ? 'Unmute' : 'Mute'}</span>`;
//           btnMute.style.background = isMuted ? '#ef4444' : 'rgba(255,255,255,0.1)';
//         }
//       }
//     }
//   }

//   toggleVideo() {
//     if (this.localStream) {
//       const videoTrack = this.localStream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         const btnVideo = document.getElementById('btnVideo');
//         if (btnVideo) {
//           const isVideoOff = !videoTrack.enabled;
//           btnVideo.innerHTML = `<i class="fas fa-${isVideoOff ? 'video-slash' : 'video'}"></i><span>${isVideoOff ? 'Video On' : 'Video Off'}</span>`;
//           btnVideo.style.background = isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.1)';
//         }
//       }
//     }
//   }

//   async toggleScreenShare() {
//     try {
//       if (!this.isScreenSharing) {
//         const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } });
//         const videoTrack = screenStream.getVideoTracks()[0];
//         const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
//         if (sender) {
//           this.originalVideoTrack = this.localStream.getVideoTracks()[0];
//           sender.replaceTrack(videoTrack);
//           this.isScreenSharing = true;
//           const btnScreenShare = document.getElementById('btnScreenShare');
//           if (btnScreenShare) {
//             btnScreenShare.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
//             btnScreenShare.style.background = '#ef4444';
//           }
//           videoTrack.onended = () => { this.stopScreenShare(); };
//         }
//       } else { this.stopScreenShare(); }
//     } catch (error) {
//       this.log(`Screen share failed: ${error.message}`, 'error');
//       this.showStatus('Screen sharing not supported', 'error');
//     }
//   }

//   stopScreenShare() {
//     if (this.isScreenSharing && this.originalVideoTrack) {
//       const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
//       if (sender) sender.replaceTrack(this.originalVideoTrack);
//       this.isScreenSharing = false;
//       this.originalVideoTrack = null;
//       const btnScreenShare = document.getElementById('btnScreenShare');
//       if (btnScreenShare) { btnScreenShare.innerHTML = '<i class="fas fa-desktop"></i><span>Share</span>'; btnScreenShare.style.background = 'rgba(255,255,255,0.1)'; }
//     }
//   }

//   togglePIP() {
//     const localVideo = document.getElementById('localVideo');
//     if (localVideo && localVideo.requestPictureInPicture) {
//       if (document.pictureInPictureElement) document.exitPictureInPicture();
//       else localVideo.requestPictureInPicture();
//     }
//   }

//   showMoreOptions() { this.log('More options clicked'); }

//   hangup() {
//     this.log('Hanging up...');
//     if (this.localStream) this.localStream.getTracks().forEach(track => track.stop());
//     if (this.pc) this.pc.close();
//     if (this.socket) this.socket.emit('leave-room', { roomName: this.roomName, userName: this.displayName });
//     this.stopCallTimer();
//     window.history.back();
//   }

//   // Timer helpers
//   // startCallTimer() {
//   //   if (this.callTimerInterval) return; // already running
//   //   this.callTimerInterval = setInterval(() => {
//   //     if (!this.callStartTime) return;
//   //     const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
//   //     const minutes = Math.floor(elapsed / 60);
//   //     const seconds = elapsed % 60;
//   //     const timerEl = document.getElementById('callTimer');
//   //     if (timerEl) timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
//   //   }, 1000);
//   // }

//   startCallTimer() {
//     if (this.callTimerInterval) return; // Prevent multiple intervals
//     this.callTimerInterval = setInterval(() => {
//       if (!this.callStartTime) return;
//       const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
//       const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
//       const seconds = String(elapsed % 60).padStart(2, '0');
//       const timerEl = document.getElementById('callTimer');
//       if (timerEl) timerEl.textContent = `${minutes}:${seconds}`;
//     }, 1000);
//   }

//   stopCallTimer() {
//     if (this.callTimerInterval) {
//       clearInterval(this.callTimerInterval);
//       this.callTimerInterval = null;
//     }
//   }


//   toggleDebugLog() {
//     const debugLog = document.getElementById('debugContent');
//     if (debugLog) debugLog.classList.toggle('show');
//   }

//   // minimizeWindow() { this.log('Minimize clicked'); }

//   showStatus(message, type = 'info') {
//     const statusMessages = document.getElementById('statusMessages');
//     if (statusMessages) {
//       const div = document.createElement('div');
//       div.className = type === 'error' ? 'error-message' : 'success-message';
//       div.textContent = message;
//       statusMessages.appendChild(div);
//       setTimeout(() => { if (div.parentNode) div.remove(); }, 5000);
//     }
//   }


//   log(message, type = 'info') {
//     console.log(`[VideoCall] ${message}`);
//     const logContent = document.getElementById('logContent');
//     if (logContent) {
//       const timestamp = new Date().toLocaleTimeString();
//       const entry = document.createElement('div');
//       entry.style.marginBottom = '5px';
//       entry.style.color = type === 'error' ? '#ef4444' : '#fff';
//       entry.textContent = `[${timestamp}] ${message}`;
//       logContent.appendChild(entry);
//       logContent.scrollTop = logContent.scrollHeight;
//     }
//   }

// }

// document.addEventListener('DOMContentLoaded', () => {
//   new VideoCallRoom();
// });


class VideoCallRoom {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.roomName = this.params.get('room') || 'default-room';
    this.displayName = this.params.get('name') || 'Guest';

    this.socket = null;
    this.pc = null;
    this.localStream = null;
    this.callStartTime = null;
    this.callTimerInterval = null;
    this.isPolite = false;
    this.makingOffer = false;
    this.iceCandidateQueue = [];

    this.init();
  }

  init() {
    this.log('Initializing video call room...');
    this.connectSocket();
    this.setupEventListeners();
  }

  connectSocket() {
    if (this.socket) return;
    const socketUrl = window.API_CONFIG.getBaseUrl();
    this.socket = io(socketUrl, { path: '/socket.io' });

    this.socket.on('connect', () => {
      this.log('Socket connected, joining room...');
      this.socket.emit('join-room', { roomName: this.roomName, userName: this.displayName });
      this.setupSocketEventListeners();
    });
  }

  setupSocketEventListeners() {
    this.socket.on('room-participants', async (data) => {
      const participants = data.participants || [];
      this.log(`Room participants: ${participants.length}. My ID: ${this.socket.id}`);
      if (participants.length === 2) {
        // Determine who makes the offer to prevent conflicts (the "impolite" peer goes first).
        this.isPolite = participants[0] < participants[1]
          ? this.socket.id === participants[1]
          : this.socket.id === participants[0];
        this.log(`Role decided: Polite peer = ${this.isPolite}`);
      }
      await this.startCallProcess();
    });

    this.socket.on('room-offer', async ({ offer }) => {
      if (this.makingOffer) return this.log("Ignoring offer, collision detected.");
      this.log('Received offer...');
      if (!this.pc) await this.startCallProcess();

      // await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (this.pc.signalingState !== "stable") {
        this.log(`Skipping offer, current state is ${this.pc.signalingState}`);
        return;
      }
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

      this.processIceQueue();

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket.emit('room-answer', { roomName: this.roomName, answer });
      this.log('Answer sent.');
    });

    // this.socket.on('room-answer', async ({ answer }) => {
    //   this.log('Received answer.');
    //   await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    //   this.processIceQueue();
    // });

    this.socket.on('room-answer', async ({ answer }) => {
      this.log('Received answer.');

      if (!this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        this.processIceQueue();
      } else {
        this.log("Ignoring duplicate answer, already in stable state.");
      }
    });


    this.socket.on('room-ice-candidate', async ({ candidate }) => {
      try {
        if (this.pc && this.pc.remoteDescription) {
          await this.pc.addIceCandidate(candidate);
        } else {
          this.iceCandidateQueue.push(candidate);
        }
      } catch (err) { console.error('Error adding ICE candidate:', err); }
    });

    // This event is the key to fixing the hangup issue.
    this.socket.on('user-left', () => this.hangup("The other user has left the call."));
  }

  async startCallProcess() {
    if (this.pc) return;
    this.log('Starting call process...');
    try {
      await this.getUserMedia();
      this.createPeerConnection();
      this.addLocalStream();
    } catch (err) { this.log(`Failed to start call: ${err.message}`, 'error'); }
  }

  async getUserMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('localVideo').srcObject = this.localStream;
    } catch (err) {
      throw new Error(`Could not access camera/microphone: ${err.message}`);
    }
  }

  createPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: WEBRTC_CONFIG.ICE_SERVERS });

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.socket.emit('room-ice-candidate', { roomName: this.roomName, candidate });
    };
    this.pc.ontrack = ({ streams }) => { document.getElementById('remoteVideo').srcObject = streams[0]; };

    this.pc.onnegotiationneeded = async () => {
      if (this.isPolite) return; // The polite peer waits for an offer.
      try {
        this.makingOffer = true;
        this.log('Creating offer...');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.socket.emit('room-offer', { roomName: this.roomName, offer });
      } catch (err) { console.error(err); }
      finally { this.makingOffer = false; }
    };

    // This is the key to fixing the timer.
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      this.log(`Connection state: ${state}`);
      if (state === 'connected' && !this.callStartTime) {
        this.callStartTime = Date.now();
        this.startCallTimer();
      } else if (['disconnected', 'failed', 'closed'].includes(state)) {
        this.stopCallTimer();
      }
    };
  }

  addLocalStream() {
    this.localStream.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));
  }

  processIceQueue() {
    while (this.iceCandidateQueue.length) {
      this.pc.addIceCandidate(this.iceCandidateQueue.shift());
    }
  }

  hangup(message) {
    if (message) {
      // Only show a message if one was provided (e.g., from user-left event)
      // This prevents an alert when the user clicks the hangup button themselves.
      alert(message);
    }
    this.log('Hanging up...');
    if (this.localStream) this.localStream.getTracks().forEach(track => track.stop());
    if (this.pc) this.pc.close();
    if (this.socket) {
      // We emit 'leave-room' so the server can tell the other person.
      this.socket.emit('leave-room', { roomName: this.roomName, userName: this.displayName });
      this.socket.disconnect();
    }
    this.stopCallTimer();
    window.history.back();
  }

  setupEventListeners() {
    document.getElementById('btnHangup').onclick = () => this.hangup();
    // Your other listeners for mute, video, etc. can go here.
  }

  startCallTimer() {
    if (this.callTimerInterval) return;
    this.callTimerInterval = setInterval(() => {
      if (!this.callStartTime) return;
      const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
      const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const seconds = String(elapsed % 60).padStart(2, '0');
      const timerEl = document.getElementById('callTimer');
      if (timerEl) timerEl.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  stopCallTimer() {
    clearInterval(this.callTimerInterval);
    this.callTimerInterval = null;
  }

  log(msg, type = 'info') { console.log(`[VideoRoom] ${msg}`); }
}

document.addEventListener('DOMContentLoaded', () => new VideoCallRoom());