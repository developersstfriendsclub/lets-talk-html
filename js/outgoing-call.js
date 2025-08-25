// js/outgoing-call.js

class OutgoingCall {
    constructor() {
        this.socket = null;
        this.overlay = null;
        this.callInfo = null; // Stores info about the current call
        this.ringPlayer = this.createRingPlayer();
        this.listenersAttached = false;
        this.localTimeout = null;
        this.init();
    }

    init() {
        // This function waits for the main page (e.g., host-users-list.html) to create the socket connection.
        const checkSocket = () => {
            if (window.socket) {
                this.socket = window.socket;
                this.attachSocketListeners();
            } else {
                setTimeout(checkSocket, 200); // Check again if not ready
            }
        };
        checkSocket();
    }

    attachSocketListeners() {
        if (!this.socket || this.listenersAttached) return;
        this.listenersAttached = true;

        // When the server confirms the other user's phone is "ringing"
        this.socket.on('ringing', () => {
            if (this.callInfo) this.startRing();
        });

        // When the other user accepts the call
        this.socket.on('call-accepted', (data) => {
            if (!this.callInfo) return;
            this.stopRing();
            this.destroyOverlay();
            const room = data?.roomName || this.callInfo.roomName;
            // Navigate to the video room to start the call
            window.location.href = `${this.guessVideoRoomPath()}?room=${encodeURIComponent(room)}&name=${encodeURIComponent(this.getLocalUserName())}&mode=video`;
            this.cleanup();
        });

        // When the other user rejects the call
        this.socket.on('call-rejected', (data) => {
            if (!this.callInfo) return;
            this.stopRing();
            this.destroyOverlay();
            this.showNotification('Call Rejected', data?.reason || 'The user is busy.', 'error');
            this.cleanup();
        });

        // When the call is not answered in time
        this.socket.on('call-timeout', (data) => {
            if (!this.callInfo) return;
            this.stopRing();
            this.destroyOverlay();
            this.showNotification('Call Timed Out', data?.reason || 'No answer.', 'warning');
            this.cleanup();
        });

        // When the call is ended for any other reason
        this.socket.on('call-ended', () => {
            if (!this.callInfo) return;
            this.stopRing();
            this.destroyOverlay();
            this.cleanup();
        });
    }

    // This is the main function called by your HTML page
    startOutgoingCall(callee, roomName) {
        if (!this.socket) { return this.showNotification('Error', 'Not connected.', 'error'); }
        if (this.callInfo) { return this.showNotification('Busy', 'Already in a call.', 'warning'); }

        const calleeId = String(callee.user_profile_id || callee.id);
        const from = this.getLocalUserName();
        this.callInfo = { to: calleeId, from, roomName, callee: callee }; // Store callee info

        // Tell the server to initiate the call
        this.socket.emit('call-user', { from, to: calleeId, roomName });
        this.showOverlay(); // Show the "Calling..." popup

        // Start a 30-second timer to automatically hang up if there's no answer
        this.localTimeout = setTimeout(() => {
            if (this.callInfo) this.hangup('No Answer');
        }, 30000);
    }

    hangup(reason = 'Call Canceled') {
        if (!this.callInfo) return;
        this.socket.emit('end-call', { from: this.callInfo.from, to: this.callInfo.to });
        this.stopRing();
        this.destroyOverlay();
        this.cleanup();
    }

    cleanup() {
        if (this.localTimeout) clearTimeout(this.localTimeout);
        this.localTimeout = null;
        this.callInfo = null;
    }

    createOverlay() {
        if (document.getElementById('outgoingOverlay')) return;
        this.overlay = document.createElement('div');
        this.overlay.id = 'outgoingOverlay';
        this.overlay.style.cssText = `
            position: fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:4000;
            background: rgba(0,0,0,0.75); backdrop-filter: blur(5px);`;
        this.overlay.innerHTML = `
            <div style="background:#fff; color:#333; padding:24px; border-radius:16px; width:90%; max-width: 320px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <img id="outgoingAvatar" src="../imgs/logo.jpg" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 3px solid #eee;">
                <div style="font-weight:bold; font-size: 18px; margin-bottom:6px;" id="outgoingTo"></div>
                <div style="font-size: 14px; color: #666; margin-bottom: 20px;" id="outgoingStatus">Ringing...</div>
                <button id="outHangup" style="background:#ef4444; color:#fff; border:none; padding: 12px 24px; border-radius:50px; cursor:pointer; font-size: 16px;">
                    <i class="fas fa-phone-slash" style="margin-right:8px;"></i>Hang up
                </button>
            </div>`;
        document.body.appendChild(this.overlay);
    }

    showOverlay() {
        if (!this.overlay) this.createOverlay();

        const callee = this.callInfo.callee;
        const nameEl = document.getElementById('outgoingTo');
        const avatarEl = document.getElementById('outgoingAvatar');

        if (callee) {
            if (nameEl) nameEl.textContent = callee.name || callee.user_profile_id;
            if (avatarEl) {
                const profileImg = callee.Images?.find(img => img.image_type === 'profile_photo')?.url;
                avatarEl.src = profileImg || '../imgs/logo.jpg';
            }
        }

        document.getElementById('outHangup').onclick = () => this.hangup();
        this.overlay.style.display = 'flex';
    }

    destroyOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    createRingPlayer() {
        const audio = new Audio('../sounds/ringtone.mp3');
        audio.loop = true;
        return {
            start: () => audio.play().catch(e => console.warn("Ringtone blocked.", e)),
            stop: () => { audio.pause(); audio.currentTime = 0; }
        };
    }

    startRing() { this.ringPlayer.start(); }
    stopRing() { this.ringPlayer.stop(); }

    getLocalUserName() { return window.MY_USERNAME || 'UnknownUser'; }
    guessVideoRoomPath() {
        const path = window.location.pathname;
        return (path.includes('/user/') || path.includes('/host/')) ? '../room-video.html' : 'room-video.html';
    }
    showNotification(title, msg, type = 'info') {
        const el = document.createElement('div');
        el.style.cssText = `position:fixed; top:20px; right:20px; padding:12px 18px; border-radius:8px; color:white; z-index:5000; font-family: sans-serif;`;
        el.style.background = type === 'error' ? '#d32f2f' : type === 'warning' ? '#f57c00' : '#388e3c';
        el.innerHTML = `<div style="font-weight:bold; font-size:15px;">${title}</div><div style="font-size:13px;">${msg}</div>`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

// Create a single global instance of the class
if (!window.outgoingCall) {
    window.outgoingCall = new OutgoingCall();
}