// Shared room logic for video or chat pages
// Requires: window.API_CONFIG, Socket.IO script

(function(){
  const params = new URLSearchParams(window.location.search);
  const roomName = params.get('room');
  const displayName = params.get('name') || 'Guest';
  const mode = (params.get('mode') || 'video').toLowerCase();

  const SOCKET_URL = (window.API_CONFIG && typeof API_CONFIG.getBaseUrl==='function') ? API_CONFIG.getBaseUrl() : window.location.origin;
  // Force polling transport for production to avoid WebSocket issues
  const socket = io(SOCKET_URL, { path: '/socket.io', upgrade: false, transports: ['polling'] });

  let pc = null;
  let localStream = null;
  let pendingOffer = null;
  const myId = (localStorage.getItem('userId') || '').toString();

  function $(id){ return document.getElementById(id); }
  function log(str){ const el = $('log'); if (el){ el.innerHTML += `<div>${new Date().toLocaleTimeString()} - ${str}</div>`; el.scrollTop = el.scrollHeight; } }

  async function init(){
    console.log('Initializing room with params:', { roomName, displayName, mode });
    
    // Debug: Check if video elements exist
    const localEl = $('localVideo');
    const remoteEl = $('remoteVideo');
    console.log('Video elements found:', { 
      localVideo: !!localEl, 
      remoteVideo: !!remoteEl,
      localVideoDisplay: localEl?.style?.display,
      remoteVideoDisplay: remoteEl?.style?.display
    });
    
    // Update UI elements based on mode
    if (mode === 'video') {
      if ($('roomTitle')) $('roomTitle').textContent = `Room: ${roomName}`;
      if ($('connectionStatus')) {
        $('connectionStatus').innerHTML = '<i class="fas fa-wifi"></i><span>Connecting...</span>';
      }
    } else {
      if ($('peerName')) $('peerName').textContent = params.get('peer') || 'Chat';
      if ($('avatar')) $('avatar').innerHTML = '<i class="fas fa-user"></i>';
    }
    
    socket.emit('join-room', { roomName, userName: displayName });

    // Load history for chat page
    if ($('chatList')) {
      try {
        const res = await fetch(API_CONFIG.getAuthUrl(API_CONFIG.ENDPOINTS.AUTH.CHAT_LIST)+`?roomName=${encodeURIComponent(roomName)}&limit=50`);
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          data.data.forEach(m => {
            const who = (m.senderId && String(m.senderId) === myId) ? 'me' : 'peer';
            appendBubble(who, m.message, who==='me'?'Me':(params.get('peer')||'Peer'), m.createdAt);
          });
        }
      } catch(_) {}
    }

    if (mode === 'video') {
      console.log('Video mode detected, setting up video...');
      await setupVideo();
    } else {
      console.log('Chat mode detected, skipping video setup');
    }

    // Chat realtime
    socket.on('room-message', ({ from, message, timestamp, senderId }) => {
      // Prevent self-echo just in case
      if (senderId && String(senderId) === myId) return;
      appendBubble('peer', message, from, timestamp);
    });
    socket.on('room-typing', ({ from, isTyping }) => {
      const bar = $('typingBar'); 
      if (!bar) return;
      bar.style.display = isTyping ? 'flex' : 'none';
      const textEl = bar.querySelector('.typing-text');
      if (textEl) {
        textEl.textContent = isTyping ? `${from||'Peer'} is typing...` : '';
      }
    });

    // Presence UI if socket user-list provided
    socket.on('user-list', (list)=>{
      const dot = $('statusDot');
      const txt = $('presenceText');
      if (!dot || !txt) return;
      const online = Array.isArray(list) && list.length > 0; // coarse indicator
      dot.style.background = online ? '#22c55e' : '#9ca3af';
      txt.textContent = online ? 'Online' : 'Offline';
    });
  }

  async function setupVideo(){
    try {
      console.log('Setting up video...');
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 360 } }, 
        audio: true 
      });
      
      console.log('Got local stream:', localStream);
      
      // Set local video
      const localEl = $('localVideo');
      if (localEl) {
        console.log('Setting local video element');
        localEl.srcObject = localStream;
        localEl.muted = true; // Mute local video to prevent echo
        localEl.style.display = 'block'; // Ensure it's visible
        try {
          await localEl.play();
          console.log('Local video playing');
        } catch(e) {
          console.log('Local video autoplay failed, will play on user interaction:', e);
        }
      } else {
        console.error('Local video element not found!');
      }

      // Setup WebRTC
      pc = new RTCPeerConnection({ 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ] 
      });
      
      console.log('WebRTC peer connection created');
      
      // Add local tracks to peer connection
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
      
      // Setup remote video
      const remoteEl = $('remoteVideo');
      if (remoteEl) {
        console.log('Setting up remote video element');
        remoteEl.muted = true; // Start muted to avoid autoplay issues
        remoteEl.style.display = 'block'; // Ensure it's visible
        remoteEl.style.background = '#000'; // Set background
      } else {
        console.error('Remote video element not found!');
      }
      
      // Handle incoming remote stream
      pc.ontrack = (e) => {
        console.log('Received remote track:', e);
        if (remoteEl && e.streams && e.streams[0]) {
          console.log('Setting remote video stream');
          remoteEl.srcObject = e.streams[0];
          remoteEl.style.background = 'transparent'; // Remove background when stream is set
          
          // Retry play to handle autoplay restrictions
          const tryPlay = () => {
            remoteEl.play().then(() => {
              console.log('Remote video playing successfully');
            }).catch(err => {
              console.warn('Remote video autoplay failed, retrying...', err);
              setTimeout(tryPlay, 500); // Retry after 500ms
            });
          };
          tryPlay();
        }
      };
      
      pc.onicecandidate = (e) => { 
        if (e.candidate) {
          console.log('Sending ICE candidate');
          socket.emit('room-ice-candidate', { roomName, candidate: e.candidate }); 
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', pc.connectionState);
        
        // Update connection status display
        const statusEl = $('connectionStatus');
        if (statusEl) {
          switch(pc.connectionState) {
            case 'connecting':
              statusEl.innerHTML = '<i class="fas fa-wifi"></i><span>Connecting...</span>';
              break;
            case 'connected':
              statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>Connected</span>';
              statusEl.style.color = '#22c55e';
              break;
            case 'disconnected':
              statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Disconnected</span>';
              statusEl.style.color = '#f59e0b';
              break;
            case 'failed':
              statusEl.innerHTML = '<i class="fas fa-times-circle"></i><span>Connection Failed</span>';
              statusEl.style.color = '#ef4444';
              break;
            default:
              statusEl.innerHTML = '<i class="fas fa-wifi"></i><span>Initializing...</span>';
          }
        }
        
        if (pc.connectionState === 'connected' && remoteEl) {
          setTimeout(() => { 
            try { 
              remoteEl.muted = false; // Unmute remote video when connected
              console.log('Remote video unmuted');
            } catch(_) {} 
          }, 300);
        }
      };

      // Handle room participants and negotiation
      socket.on('room-participants', async ({ roomName: rn, participants }) => {
        if (rn !== roomName) return; 
        if (!pc) return;
        console.log('Room participants:', participants);
        try {
          const smallest = participants.slice().sort()[0];
          const weAreOfferer = smallest === socket.id;
          console.log('We are offerer:', weAreOfferer);
          if (participants.length >= 2 && weAreOfferer && !pc.currentLocalDescription) {
            console.log('Creating offer...');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('room-offer', { roomName, offer });
            console.log('Offer sent');
          }
        } catch(e) { console.warn('participants negotiation error', e); }
      });
      
      socket.on('room-ready', async () => {
        if (!pc) return;
        console.log('Room ready, checking if we need to create offer');
        if (!pc.currentLocalDescription){
          console.log('Creating initial offer...');
          const offer = await pc.createOffer({ 
            offerToReceiveAudio: true, 
            offerToReceiveVideo: true 
          });
          await pc.setLocalDescription(offer);
          socket.emit('room-offer', { roomName, offer });
          console.log('Initial offer sent');
        }
      });
      
      socket.on('room-offer', async ({ from, offer }) => {
        if (!pc) return;
        console.log('Received offer from:', from);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('Remote description set, creating answer...');
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('room-answer', { roomName, answer });
          console.log('Answer sent');
        } catch(e) { 
          console.error('Error handling offer:', e);
          pendingOffer = offer; 
          showOverlay(true, `From: ${from||'Peer'}`); 
        }
      });
      
      socket.on('room-answer', async ({ from, answer }) => {
        if (!pc) return;
        console.log('Received answer from:', from);
        try { 
          if (!pc.currentRemoteDescription) { 
            await pc.setRemoteDescription(new RTCSessionDescription(answer)); 
            console.log('Remote description set from answer');
          } 
        } catch(e) { console.warn('apply answer failed', e); }
      });
      
      socket.on('room-ice-candidate', async ({ from, candidate }) => { 
        if (!pc) return; 
        console.log('Received ICE candidate from:', from);
        try { 
          await pc.addIceCandidate(new RTCIceCandidate(candidate)); 
          console.log('ICE candidate added');
        } catch(e) { console.warn('ICE add error', e); } 
      });

      // Toolbar controls (if present)
      if ($('btnMute')) $('btnMute').onclick = ()=>{
        localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled); 
        $('btnMute').textContent = localStream.getAudioTracks()[0]?.enabled ? 'Mute' : 'Unmute'; 
      };
      
      if ($('btnVideo')) $('btnVideo').onclick = ()=>{
        localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled); 
        $('btnVideo').textContent = localStream.getVideoTracks()[0]?.enabled ? 'Video Off' : 'Video On'; 
      };
      
      if ($('btnHangup')) $('btnHangup').onclick = ()=>{
        try { 
          pc && pc.close(); 
          localStream.getTracks().forEach(t => t.stop()); // Stop all tracks
        } catch(_) {}
        socket.emit('leave-room', { roomName, userName: displayName }); 
        window.history.back(); 
      };
      
    } catch(e) {
      console.error('Failed to setup video:', e);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  }

  function showOverlay(show, text){ const ovl=$('incomingOverlay'); if (!ovl) return; if (show){ ovl.classList.add('show'); $('incomingFrom').textContent = text||''; } else { ovl.classList.remove('show'); } }

  // Chat helpers
  function appendBubble(who, text, from, ts){
    const list = $('chatList'); if (!list) return;
    const wrap = document.createElement('div'); wrap.className = 'bubble '+(who==='me'?'me':'peer');
    const timeStr = new Date(ts || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    wrap.innerHTML = `<div class="meta">${from||''}</div><div class="msg">${(text||'').replace(/</g,'&lt;')}</div><div class="time">${timeStr}</div>`;
    list.appendChild(wrap); list.scrollTop = list.scrollHeight;
  }
  function sendMessage(){
    const input = $('msg'); const text = (input.value||'').trim(); if (!text) return;
    appendBubble('me', text, 'Me');
    socket.emit('room-message', { roomName, from: displayName, message: text, senderId: myId });
    input.value = '';
  }
  function typing(on){ socket.emit('room-typing', { roomName, from: displayName, isTyping: on }); }

  // Bind chat UI events if present
  if ($('sendBtn')) $('sendBtn').onclick = sendMessage;
  if ($('msg')) {
    $('msg').addEventListener('input', ()=> typing(true));
    $('msg').addEventListener('blur', ()=> typing(false));
    $('msg').addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); sendMessage(); } });
  }

  window.addEventListener('beforeunload', ()=> socket.emit('leave-room', { roomName, userName: displayName }));
  init();
})();

