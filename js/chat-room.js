// Chat Room Implementation
class ChatRoom {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.roomName = this.params.get('room') || 'default-room';
    this.displayName = this.params.get('name') || 'Guest';
    this.peerName = this.params.get('peer') || 'User';
    this.mode = (this.params.get('mode') || 'chat').toLowerCase();
    
    this.socket = null;
    this.messages = [];
    this.isTyping = false;
    this.typingTimeout = null;
    this.currentUserId = null;
    this.peerUserId = null;
    
    this.init();
  }

  init() {
    this.log('Initializing chat room...');
    this.setupUI();
    this.connectSocket();
    this.setupEventListeners();
    this.initializeRoom();
  }

  setupUI() {
    // Set peer name
    const peerNameEl = document.getElementById('peerName');
    if (peerNameEl) {
      peerNameEl.textContent = this.peerName;
    }

    // Setup video call button
    const btnVideoCall = document.getElementById('btnVideoCall');
    if (btnVideoCall) {
      btnVideoCall.onclick = () => this.startVideoCall();
    }

    // Setup more button
    const btnMore = document.getElementById('btnMore');
    if (btnMore) {
      btnMore.onclick = () => this.showMoreOptions();
    }
  }

  async initializeRoom() {
    try {
      // Get current user ID and peer user ID from localStorage or URL params
      this.currentUserId = this.getUserId();
      this.peerUserId = this.getPeerUserId();
      
      if (this.currentUserId && this.peerUserId) {
        // Create or get existing room
        await this.createRoom();
        // Load chat history after room is ready
        await this.loadChatHistory();
      } else {
        this.log('User IDs not available, skipping room initialization', 'warning');
      }
    } catch (error) {
      this.log(`Failed to initialize room: ${error.message}`, 'error');
    }
  }

  async createRoom() {
    try {
      if (!window.API_CONFIG) {
        throw new Error('API configuration not available');
      }

      const response = await fetch(window.API_CONFIG.getAuthUrl('/room/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          sender_id: this.currentUserId,
          receiver_id: this.peerUserId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create room: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Update room name with the normalized name from backend
        this.roomName = data.data.name;
        this.log(`Room created/retrieved: ${this.roomName}`);
        
        // Join the room via socket
        if (this.socket) {
          this.socket.emit('join-room', { 
            roomName: this.roomName, 
            userName: this.displayName 
          });
        }
      }
    } catch (error) {
      this.log(`Failed to create room: ${error.message}`, 'error');
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

      this.socket.on('connect', () => {
        this.log('Socket connected successfully');
        this.updateStatus('Online', 'success');
        // Room joining will be handled after room creation
      });

      this.socket.on('connect_error', (error) => {
        this.log(`Socket connection error: ${error.message}`, 'error');
        this.updateStatus('Offline', 'error');
      });

      this.setupSocketEventListeners();
    } catch (error) {
      this.log(`Failed to connect socket: ${error.message}`, 'error');
      this.updateStatus('Connection Failed', 'error');
    }
  }

  setupSocketEventListeners() {
    this.socket.on('room-message', (data) => {
      this.log(`Received message: ${JSON.stringify(data)}`);
      this.addMessage(data.from, data.message, data.timestamp, false);
    });

    this.socket.on('room-typing', (data) => {
      this.log(`Typing indicator: ${data.from} is typing`);
      if (data.from !== this.displayName) {
        this.showTypingIndicator(data.from);
      }
    });

    this.socket.on('user-joined', (data) => {
      this.log(`User joined: ${data.userName}`);
      this.addSystemMessage(`${data.userName} joined the chat`);
    });

    this.socket.on('user-left', (data) => {
      this.log(`User left: ${data.userName}`);
      this.addSystemMessage(`${data.userName} left the chat`);
    });

    this.socket.on('room-participants', (data) => {
      this.log(`Room participants: ${JSON.stringify(data)}`);
      this.updateParticipantCount(data.participants?.length || 0);
    });
  }

  setupEventListeners() {
    // Send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
      sendBtn.onclick = () => this.sendMessage();
    }

    // Message input
    const msgInput = document.getElementById('msg');
    if (msgInput) {
      msgInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      };

      msgInput.oninput = () => {
        this.handleTyping();
      };
    }
  }

  async sendMessage() {
    const msgInput = document.getElementById('msg');
    const message = msgInput?.value?.trim();
    
    if (!message) return;

    try {
      // Add message to local display first
      this.addMessage(this.displayName, message, Date.now(), true);
      
      // Save message to database
      await this.saveMessageToDatabase(message);
      
      // Send via socket for real-time communication
      this.socket.emit('room-message', {
        roomName: this.roomName,
        from: this.displayName,
        message: message,
        senderId: this.currentUserId
      });

      // Clear input
      msgInput.value = '';
      
      // Stop typing indicator
      this.stopTypingIndicator();
      
      this.log('Message sent and saved successfully');
    } catch (error) {
      this.log(`Failed to send message: ${error.message}`, 'error');
      // Remove the message from display if saving failed
      this.removeLastMessage();
    }
  }

  async saveMessageToDatabase(message) {
    try {
      if (!window.API_CONFIG) {
        throw new Error('API configuration not available');
      }

      const response = await fetch(window.API_CONFIG.getAuthUrl('/chat/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          roomName: this.roomName,
          senderId: this.currentUserId,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        this.log('Message saved to database successfully');
      } else {
        throw new Error(data.message || 'Failed to save message');
      }
    } catch (error) {
      this.log(`Failed to save message to database: ${error.message}`, 'error');
      throw error;
    }
  }

  removeLastMessage() {
    const chatList = document.getElementById('chatList');
    if (chatList && chatList.lastChild) {
      chatList.removeChild(chatList.lastChild);
    }
    // Also remove from messages array
    if (this.messages.length > 0) {
      this.messages.pop();
    }
  }

  addMessage(from, message, timestamp, isOwn = false) {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-header">
          <span class="sender-name">${from}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${this.escapeHtml(message)}</div>
      </div>
    `;

    chatList.appendChild(messageDiv);
    chatList.scrollTop = chatList.scrollHeight;
    
    // Store message
    this.messages.push({ from, message, timestamp, isOwn });
  }

  addSystemMessage(message) {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;

    const systemDiv = document.createElement('div');
    systemDiv.className = 'system-message';
    systemDiv.textContent = message;
    
    chatList.appendChild(systemDiv);
    chatList.scrollTop = chatList.scrollHeight;
  }

  handleTyping() {
    if (!this.isTyping) {
      this.isTyping = true;
      this.socket.emit('room-typing', {
        roomName: this.roomName,
        from: this.displayName,
        isTyping: true
      });
    }

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set new timeout
    this.typingTimeout = setTimeout(() => {
      this.stopTypingIndicator();
    }, 1000);
  }

  stopTypingIndicator() {
    if (this.isTyping) {
      this.isTyping = false;
      this.socket.emit('room-typing', {
        roomName: this.roomName,
        from: this.displayName,
        isTyping: false
      });
    }
  }

  showTypingIndicator(from) {
    const typingBar = document.getElementById('typingBar');
    if (typingBar) {
      const typingText = typingBar.querySelector('.typing-text');
      if (typingText) {
        typingText.textContent = `${from} is typing...`;
      }
      typingBar.style.display = 'flex';
    }
  }

  hideTypingIndicator() {
    const typingBar = document.getElementById('typingBar');
    if (typingBar) {
      typingBar.style.display = 'none';
    }
  }

  startVideoCall() {
    const url = new URL(location.href);
    url.pathname = url.pathname.replace('room-chat.html', 'room-video.html');
    url.searchParams.set('mode', 'video');
    window.location.href = url.toString();
  }

  showMoreOptions() {
    // Implement more options menu
    this.log('More options clicked');
  }

  updateStatus(status, type = 'info') {
    const statusDot = document.getElementById('statusDot');
    const presenceText = document.getElementById('presenceText');
    
    if (statusDot) {
      const colorMap = {
        'success': '#22c55e',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#6b7280'
      };
      statusDot.style.background = colorMap[type] || colorMap.info;
    }
    
    if (presenceText) {
      presenceText.textContent = status;
    }
  }

  updateParticipantCount(count) {
    // Update participant count if needed
    this.log(`Room has ${count} participants`);
  }

  async loadChatHistory() {
    try {
      if (!window.API_CONFIG || !this.roomName) {
        this.log('API config or room name not available for loading chat history', 'warning');
        return;
      }

      const response = await fetch(window.API_CONFIG.getAuthUrl(`/chat/list?roomName=${encodeURIComponent(this.roomName)}&limit=50`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Clear existing messages
          this.messages = [];
          const chatList = document.getElementById('chatList');
          if (chatList) {
            chatList.innerHTML = '';
          }
          
          // Add messages from history
          data.data.forEach(msg => {
            const isOwn = msg.senderId === this.currentUserId;
            const senderName = isOwn ? this.displayName : this.peerName;
            this.addMessage(senderName, msg.message, new Date(msg.createdAt).getTime(), isOwn);
          });
          
          this.log(`Loaded ${data.data.length} messages from chat history`);
        }
      } else {
        this.log(`Failed to load chat history: ${response.statusText}`, 'warning');
      }
    } catch (error) {
      this.log(`Failed to load chat history: ${error.message}`, 'error');
    }
  }

  getUserId() {
    // Get user ID from localStorage or other sources
    return localStorage.getItem('userId') || this.params.get('userId') || null;
  }

  getPeerUserId() {
    // Get peer user ID from URL params or localStorage
    return this.params.get('peerId') || localStorage.getItem('peerUserId') || null;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  log(message, type = 'info') {
    console.log(`[ChatRoom] ${message}`);
    
    // Also show in UI if there's a log element
    const logElement = document.getElementById('logMessages');
    if (logElement) {
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry log-${type}`;
      logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logElement.appendChild(logEntry);
      logElement.scrollTop = logElement.scrollHeight;
    }
  }
}

// Initialize chat room when page loads
document.addEventListener('DOMContentLoaded', () => {
  new ChatRoom();
});
