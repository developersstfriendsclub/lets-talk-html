// Shared room logic for video or chat pages
// Requires: window.API_CONFIG, Socket.IO script

(function(){
  const params = new URLSearchParams(window.location.search);
  const roomName = params.get('room');
  const displayName = params.get('name') || 'Guest';
  const mode = (params.get('mode') || 'video').toLowerCase();

  const SOCKET_URL = (window.API_CONFIG && typeof API_CONFIG.getBaseUrl==='function') ? API_CONFIG.getBaseUrl() : window.location.origin;
  const socket = io(SOCKET_URL, { path: '/socket.io', upgrade: false, transports: ['polling'] });

  let pc = null;
  let localStream = null;
  let pendingOffer = null;
  const myId = (localStorage.getItem('userId') || '').toString();

  function $(id){ return document.getElementById(id); }
  function log(str){ const el = $('log'); if (el){ el.innerHTML += `<div>${new Date().toLocaleTimeString()} - ${str}</div>`; el.scrollTop = el.scrollHeight; } }

  async function init(){
    $('roomTitle') && ( $('roomTitle').textContent = `Room: ${roomName}` );
    // Derive peer initial for avatar if present in query
    const peerName = params.get('peer') || '';
    if ($('peerName')) $('peerName').textContent = peerName || 'Chat';
    if ($('avatar')) $('avatar').textContent = (peerName||'U').trim().charAt(0).toUpperCase();
    socket.emit('join-room', { roomName, userName: displayName });

    // Load history for chat page
    if ($('chatList')) {
      try {
        const res = await fetch(API_CONFIG.getAuthUrl(API_CONFIG.ENDPOINTS.AUTH.CHAT_LIST)+`?roomName=${encodeURIComponent(roomName)}&limit=50`);
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          data.data.forEach(m => {
            const who = (m.senderId && String(m.senderId) === myId) ? 'me' : 'peer';
            appendBubble(who, m.message, who==='me'?'Me':(peerName||'Peer'), m.createdAt);
          });
        }
      } catch(_) {}
    }

    if (mode === 'video') {
      await setupVideo();
    }

    // Chat realtime
    socket.on('room-message', ({ from, message, timestamp, senderId }) => {
      // Prevent self-echo just in case
      if (senderId && String(senderId) === myId) return;
      appendBubble('peer', message, from, timestamp);
    });
    socket.on('room-typing', ({ from, isTyping }) => {
      const bar = $('typingBar'); if (!bar) return;
      bar.style.display = isTyping ? 'block' : 'none';
      bar.textContent = isTyping ? `${from||'Peer'} is typing...` : '';
    });

    // Presence UI if socket user-list provided
    socket.on('user-list', (list)=>{
      const dot=$('statusDot'), txt=$('presenceText');
      if (!dot || !txt) return;
      const online = Array.isArray(list) && list.length>0; // coarse indicator
      dot.style.background = online? '#22c55e' : '#9ca3af';
      txt.textContent = online? 'Online' : 'Offline';
    });
  }

  async function setupVideo(){
    localStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 } }, audio: true });
    if ($('localVideo')) $('localVideo').srcObject = localStream;
    pc = new RTCPeerConnection({ iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ] });
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    const remoteEl = $('remoteVideo'); if (remoteEl){ remoteEl.muted = true; }
    pc.ontrack = (e) => { if (remoteEl){ remoteEl.srcObject = e.streams[0]; try { remoteEl.play(); } catch(_){} } };
    pc.onicecandidate = (e) => { if (e.candidate) socket.emit('room-ice-candidate', { roomName, candidate: e.candidate }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected' && remoteEl){ setTimeout(()=>{ try { remoteEl.muted = false; } catch(_){} }, 300); }
    };

    socket.on('room-participants', async ({ roomName: rn, participants }) => {
      if (rn !== roomName) return; if (!pc) return;
      try {
        const smallest = participants.slice().sort()[0];
        const weAreOfferer = smallest === socket.id;
        if (participants.length >= 2 && weAreOfferer && !pc.currentLocalDescription) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('room-offer', { roomName, offer });
        }
      } catch(e) { console.warn('participants negotiation error', e); }
    });
    socket.on('room-ready', async () => {
      if (!pc) return;
      if (!pc.currentLocalDescription){
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socket.emit('room-offer', { roomName, offer });
      }
    });
    socket.on('room-offer', async ({ from, offer }) => {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('room-answer', { roomName, answer });
      } catch(e) { pendingOffer = offer; showOverlay(true, `From: ${from||'Peer'}`); }
    });
    socket.on('room-answer', async ({ from, answer }) => {
      if (!pc) return;
      try { if (!pc.currentRemoteDescription) { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } } catch(e) { console.warn('apply answer failed', e); }
    });
    socket.on('room-ice-candidate', async ({ from, candidate }) => { if (!pc) return; try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) { console.warn('ICE add error', e); } });

    // Toolbar controls (if present)
    if ($('btnMute')) $('btnMute').onclick = ()=>{ localStream.getAudioTracks().forEach(t=> t.enabled = !t.enabled); $('btnMute').textContent = localStream.getAudioTracks()[0]?.enabled ? 'Mute' : 'Unmute'; };
    if ($('btnVideo')) $('btnVideo').onclick = ()=>{ localStream.getVideoTracks().forEach(t=> t.enabled = !t.enabled); $('btnVideo').textContent = localStream.getVideoTracks()[0]?.enabled ? 'Video Off' : 'Video On'; };
    if ($('btnHangup')) $('btnHangup').onclick = ()=>{ try { pc && pc.close(); } catch(_){}; socket.emit('leave-room', { roomName, userName: displayName }); window.history.back(); };
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


