// src/services/socketService.js - COMPLETE FIXED VERSION
import io from 'socket.io-client';
import { Platform } from 'react-native';
import { store } from '../redux/store';
import { 
  setConnectionStatus, 
  addMessage, 
  setUserTyping, 
  setUserOnlineStatus,
  markRoomMessagesAsRead,
  updateRoomOrder,
  removeOptimisticMessage
} from '../redux/chatSlice';

const getSocketUrl = () => {
  const baseUrl = 'http://192.168.56.1:5000';
  
  if (__DEV__) {
    console.log('🌐 Using socket URL:', baseUrl);
    return baseUrl;
  }
  
  return 'https://your-production-api.com';
};

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.currentRooms = new Set();
    this.eventListeners = new Map();
    this.connectionPromise = null;
    this.lastToken = null;
    this.reconnectTimer = null;
    this.pingInterval = null;
    
    // Track sent messages to prevent duplicates
    this.sentMessages = new Map(); // tempId -> real message data
    this.pendingMessages = new Set(); // track messages being sent
    this.processedMessageIds = new Set(); // prevent duplicate processing
  }

  log(message, data = '') {
    if (__DEV__) {
      console.log(`[SocketService] ${message}`, data);
    }
  }

  error(message, data = '') {
    console.error(`[SocketService] ${message}`, data);
  }

  // IMPROVED AUTO-CONNECTION
  async connect(token, retryCount = 0) {
    const maxRetries = 3;
    
    // If already connected, return success
    if (this.isConnected && this.socket?.connected) {
      this.log('Already connected, skipping connection attempt');
      return true;
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Prevent multiple connection attempts
    if (this.connectionPromise) {
      this.log('Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    this.connectionPromise = this._performConnection(token)
      .catch(async (error) => {
        this.error('Connection failed:', error.message);
        
        // Auto-retry with exponential backoff
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          this.log(`Auto-retrying connection in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.connect(token, retryCount + 1);
        }
        
        throw error;
      });

    try {
      const result = await this.connectionPromise;
      return result;
    } finally {
      this.connectionPromise = null;
    }
  }

  async _performConnection(token) {
    try {
      // Disconnect existing socket cleanly
      if (this.socket) {
        this.log('Cleaning up existing socket');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Get and validate token
      if (!token) {
        const state = store.getState();
        token = state.auth?.token;
      }

      if (!token) {
        throw new Error('No authentication token available');
      }

      this.lastToken = token;
      this.log('Starting connection with token:', token.substring(0, 20) + '...');

      // Test server connectivity first
      const serverUrl = getSocketUrl();
      try {
        this.log('Testing server connectivity...');
        const response = await fetch(`${serverUrl}/health`, {
          method: 'GET',
          timeout: 5000,
        });
        
        if (!response.ok) {
          throw new Error(`Server health check failed: ${response.status}`);
        }
        
        const data = await response.json();
        this.log('✅ Server health check passed:', data.status);
      } catch (healthError) {
        this.error('❌ Health check failed:', healthError.message);
        throw new Error(`Server unreachable: ${healthError.message}`);
      }

      // Create socket connection
      this.log('Creating socket connection to:', serverUrl);
      
      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 15000,
        forceNew: true,
        autoConnect: false,
        reconnection: false, // We handle reconnection manually
        upgrade: true,
        rememberUpgrade: true,
      });

      // Setup event handlers BEFORE connecting
      this._setupEventHandlers();

      // Connect and wait for result
      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          this.error('❌ Connection timeout after 15 seconds');
          this._cleanup();
          reject(new Error('Connection timeout'));
        }, 15000);

        const onConnect = () => {
          clearTimeout(connectTimeout);
          this.log('✅ Socket connected successfully, ID:', this.socket.id);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          store.dispatch(setConnectionStatus(true));
          
          // Start heartbeat
          this._startPingInterval();
          
          // Clean up listeners
          this.socket.off('connect', onConnect);
          this.socket.off('connect_error', onConnectError);
          resolve(true);
        };

        const onConnectError = (error) => {
          clearTimeout(connectTimeout);
          this.error('❌ Connection failed:', error.message);
          this._cleanup();
          this.socket.off('connect', onConnect);
          this.socket.off('connect_error', onConnectError);
          reject(error);
        };

        this.socket.on('connect', onConnect);
        this.socket.on('connect_error', onConnectError);

        // Start connection
        this.log('🔌 Initiating socket connection...');
        this.socket.connect();
      });

    } catch (error) {
      this.error('Connection error:', error);
      this._cleanup();
      throw error;
    }
  }

  _setupEventHandlers() {
    if (!this.socket) return;

    this.log('Setting up event handlers...');
    this.socket.removeAllListeners();

    // CONNECTION EVENTS
    this.socket.on('connect', () => {
      this.log('✅ Connected! Socket ID:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      store.dispatch(setConnectionStatus(true));
      
      // Rejoin rooms after connection
      this._rejoinRooms();
      this._emitToListeners('connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.log('❌ Disconnected:', reason);
      this.isConnected = false;
      store.dispatch(setConnectionStatus(false));
      this._stopPingInterval();
      this._emitToListeners('disconnected', { reason });
      
      // Auto-reconnect unless intentional
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        this._scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.error('❌ Connection error:', error.message);
      this.isConnected = false;
      store.dispatch(setConnectionStatus(false));
      this._emitToListeners('connect_error', { error });
      
      if (error.message?.includes('Authentication') || error.message?.includes('token')) {
        this._handleAuthError();
      } else {
        this._scheduleReconnect();
      }
    });

    // SERVER CONFIRMATION EVENTS
    this.socket.on('chatConnected', (data) => {
      this.log('✅ Server confirmed chat connection:', data);
      this._emitToListeners('chatConnected', data);
    });

    // ROOM EVENTS
    this.socket.on('roomJoined', (data) => {
      this.log('✅ Room joined:', data);
      if (data.roomId) {
        this.currentRooms.add(data.roomId);
      }
      this._emitToListeners('roomJoined', data);
    });

    this.socket.on('roomLeft', (data) => {
      this.log('📤 Room left:', data);
      if (data.roomId) {
        this.currentRooms.delete(data.roomId);
      }
      this._emitToListeners('roomLeft', data);
    });

    // MESSAGE EVENTS - FIXED TO PREVENT DUPLICATES
    this.socket.on('newMessage', (data) => {
      this.log('📨 New message received:', data);
      const { message, roomId } = data;
      
      if (message && roomId) {
        // Prevent duplicate processing
        if (this.processedMessageIds.has(message.id)) {
          this.log('⚠️ Message already processed, skipping:', message.id);
          return;
        }
        
        this.processedMessageIds.add(message.id);
        
        // Check if this is our own message that we sent
        const state = store.getState();
        const isOwnMessage = message.senderId === state.auth?.user?.id;
        
        if (isOwnMessage) {
          // Remove any optimistic message with same content
          const roomMessages = state.chat.messagesByRoom[roomId] || [];
          const optimisticMessage = roomMessages.find(m => 
            m.isOptimistic && 
            m.content.trim() === message.content.trim() && 
            m.senderId === message.senderId
          );
          
          if (optimisticMessage) {
            store.dispatch(removeOptimisticMessage({ 
              roomId, 
              tempId: optimisticMessage.id 
            }));
            this.log('🗑️ Removed optimistic message, adding real message');
          }
        }
        
        // Check if message already exists (prevent duplicates)
        const existingMessages = state.chat.messagesByRoom[roomId] || [];
        const messageExists = existingMessages.find(m => m.id === message.id);
        
        if (!messageExists) {
          const formattedMessage = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            roomId: message.roomId || roomId,
            isRead: message.isRead || false,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            sender: message.sender
          };
          
          // Dispatch to Redux store
          store.dispatch(addMessage({ roomId, message: formattedMessage }));
          store.dispatch(updateRoomOrder(roomId));
          
          this.log('✅ Message added to store for room:', roomId);
        } else {
          this.log('⚠️ Message already exists, skipping duplicate:', message.id);
        }
      }
      
      this._emitToListeners('newMessage', data);
    });

    // MESSAGE SENT CONFIRMATION - HANDLE OPTIMISTIC UPDATES
    this.socket.on('messageSent', (data) => {
      this.log('✅ Message sent confirmation:', data);
      
      // Remove from pending messages
      if (data.tempId) {
        this.pendingMessages.delete(data.tempId);
        this.sentMessages.set(data.tempId, data.message);
      }
      
      this._emitToListeners('messageSent', data);
    });

    // TYPING EVENTS
    this.socket.on('userTyping', (data) => {
      const { roomId, userId, userName, isTyping } = data;
      
      if (roomId && userId) {
        // Don't show typing for current user
        const state = store.getState();
        if (userId !== state.auth?.user?.id) {
          store.dispatch(setUserTyping({ roomId, userId, userName, isTyping }));
          
          // Auto-clear typing after timeout
          if (isTyping) {
            setTimeout(() => {
              store.dispatch(setUserTyping({ roomId, userId, userName, isTyping: false }));
            }, 3000);
          }
        }
      }
      
      this._emitToListeners('userTyping', data);
    });

    // USER PRESENCE EVENTS
    this.socket.on('userJoinedRoom', (data) => {
      this.log('👤 User joined room:', data);
      const { roomId, user } = data;
      
      if (roomId && user) {
        store.dispatch(setUserOnlineStatus({ 
          userId: user.id, 
          status: 'online', 
          roomId 
        }));
      }
      
      this._emitToListeners('userJoinedRoom', data);
    });

    this.socket.on('userLeftRoom', (data) => {
      this.log('👤 User left room:', data);
      const { roomId, userId } = data;
      
      if (roomId && userId) {
        store.dispatch(setUserOnlineStatus({ 
          userId, 
          status: 'offline', 
          roomId 
        }));
      }
      
      this._emitToListeners('userLeftRoom', data);
    });

    // READ RECEIPTS
    this.socket.on('messagesRead', (data) => {
      this.log('👁️ Messages read:', data);
      this._emitToListeners('messagesRead', data);
    });

    this.socket.on('messagesMarkedRead', (data) => {
      this.log('✅ Messages marked read confirmation:', data);
      this._emitToListeners('messagesMarkedRead', data);
    });

    // PING/PONG
    this.socket.on('pong', (data) => {
      this.log('🏓 Pong received:', data);
      this._emitToListeners('pong', data);
    });

    // ERROR HANDLING
    this.socket.on('error', (error) => {
      this.error('❌ Socket error:', error);
      
      if (error.message?.includes('Authentication') || error.message?.includes('token')) {
        this._handleAuthError();
      }
      
      this._emitToListeners('error', { error });
    });

    // Debug in development
    if (__DEV__) {
      this.socket.onAny((eventName, ...args) => {
        if (!['pong', 'ping'].includes(eventName)) {
          this.log(`📡 Event: ${eventName}`, args);
        }
      });
    }
  }

  // IMPROVED RECONNECTION LOGIC
  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(2000 * this.reconnectAttempts, 10000);
    
    this.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected && this.lastToken) {
        this.log('🔄 Attempting auto-reconnection...');
        this.connect(this.lastToken);
      }
    }, delay);
  }

  _handleAuthError() {
    this.error('❌ Authentication error, need fresh token');
    
    try {
      const state = store.getState();
      const newToken = state.auth?.token;
      
      if (newToken && newToken !== this.lastToken) {
        this.log('🔄 Retrying with fresh token');
        setTimeout(() => {
          this.connect(newToken);
        }, 2000);
      } else {
        this.error('❌ No fresh token available');
      }
    } catch (err) {
      this.error('❌ Failed to get fresh token:', err);
    }
  }

  _startPingInterval() {
    this._stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.ping({ heartbeat: true });
      }
    }, 30000); // Ping every 30 seconds
  }

  _stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _cleanup() {
    this._stopPingInterval();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    store.dispatch(setConnectionStatus(false));
  }

  _rejoinRooms() {
    if (this.currentRooms.size > 0) {
      this.log('🚪 Rejoining rooms:', Array.from(this.currentRooms));
      setTimeout(() => {
        this.currentRooms.forEach(roomId => {
          this.joinRoom(roomId, false);
        });
      }, 1000);
    }
  }

  // EVENT LISTENER MANAGEMENT
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    
    return () => {
      this.removeEventListener(event, callback);
    };
  }

  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  _emitToListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // PUBLIC API METHODS
  joinRoom(roomId, addToTracking = true) {
    if (!roomId) {
      this.error('❌ Cannot join room - no roomId');
      return false;
    }

    if (addToTracking) {
      this.currentRooms.add(roomId);
    }

    if (!this.socket || !this.isConnected) {
      this.log('⚠️ Socket not connected, room will be joined on reconnect');
      return false;
    }

    this.log('🚪 Joining room:', roomId);
    this.socket.emit('joinRoom', { roomId: parseInt(roomId) });
    return true;
  }

  leaveRoom(roomId) {
    if (!roomId) {
      this.error('❌ Cannot leave room - no roomId');
      return false;
    }

    this.currentRooms.delete(roomId);

    if (!this.socket || !this.isConnected) {
      this.log('⚠️ Socket not connected, cannot leave room');
      return false;
    }

    this.log('📤 Leaving room:', roomId);
    this.socket.emit('leaveRoom', { roomId: parseInt(roomId) });
    return true;
  }

  // FIXED MESSAGE SENDING - NO DUPLICATES
  sendMessage(roomId, content) {
    if (!roomId || !content?.trim()) {
      this.error('❌ Cannot send message - missing data');
      return false;
    }

    if (!this.socket || !this.isConnected) {
      this.log('⚠️ Socket not connected, cannot send message');
      return false;
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const messageData = {
      roomId: parseInt(roomId),
      content: content.trim(),
      tempId // Include tempId for tracking
    };

    // Track as pending to prevent duplicates
    this.pendingMessages.add(tempId);

    this.log('📤 Sending message to room:', roomId, 'Content:', content.substring(0, 50) + '...');
    
    // Send with acknowledgment callback
    this.socket.emit('sendMessage', messageData, (response) => {
      this.pendingMessages.delete(tempId);
      
      if (response?.success) {
        this.log('✅ Message delivery confirmed by server');
        if (response.message) {
          this.sentMessages.set(tempId, response.message);
        }
      } else {
        this.error('❌ Message delivery failed:', response?.error);
      }
    });
    
    return tempId; // Return tempId for tracking
  }

  sendTypingIndicator(roomId, isTyping) {
    if (!roomId || !this.socket || !this.isConnected) return false;
    
    this.socket.emit('typing', { roomId: parseInt(roomId), isTyping });
    return true;
  }

  markMessagesAsRead(roomId) {
    if (!roomId || !this.socket || !this.isConnected) return false;
    
    this.log('👁️ Marking messages as read for room:', roomId);
    this.socket.emit('markMessagesRead', { roomId: parseInt(roomId) });
    return true;
  }

  ping(data = {}) {
    if (!this.socket || !this.isConnected) return false;
    
    this.socket.emit('ping', { ...data, timestamp: Date.now() });
    return true;
  }

  disconnect() {
    this.log('🔌 Manual disconnect');
    this.eventListeners.clear();
    this.currentRooms.clear();
    this.reconnectAttempts = 0;
    this.lastToken = null;
    this.sentMessages.clear();
    this.pendingMessages.clear();
    this.processedMessageIds.clear();
    
    this._cleanup();
  }

  // UTILITY METHODS
  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }

  getCurrentRooms() {
    return Array.from(this.currentRooms);
  }

  forceReconnect() {
    this.log('🔄 Force reconnect requested');
    this.reconnectAttempts = 0;
    
    if (this.lastToken) {
      return this.connect(this.lastToken);
    } else {
      const state = store.getState();
      const token = state.auth?.token;
      if (token) {
        return this.connect(token);
      } else {
        this.error('❌ No token available for reconnection');
        return Promise.resolve(false);
      }
    }
  }

  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
      currentRooms: Array.from(this.currentRooms),
      reconnectAttempts: this.reconnectAttempts,
      hasSocket: !!this.socket,
      serverUrl: getSocketUrl(),
      platform: Platform.OS,
      hasToken: !!this.lastToken,
      pendingMessages: this.pendingMessages.size,
      sentMessages: this.sentMessages.size,
      processedMessages: this.processedMessageIds.size,
      eventListeners: Object.fromEntries(
        Array.from(this.eventListeners.entries()).map(([key, set]) => [key, set.size])
      ),
      transport: this.socket?.io?.engine?.transport?.name,
      pingInterval: !!this.pingInterval
    };
  }

  healthCheck() {
    const info = this.getDebugInfo();
    this.log('🏥 Health Check:', info);
    
    if (this.isConnected) {
      this.ping({ healthCheck: true });
    }
    
    return info;
  }
}

const socketService = new SocketService();

// AUTO-INITIALIZE when auth state changes - THIS IS THE KEY MISSING PIECE!
let currentUser = null;
let currentToken = null;

const checkAndAutoInitialize = () => {
  const state = store.getState();
  const user = state.auth?.user;
  const token = state.auth?.token;
  
  // Check if user or token changed
  if (user && token && (user !== currentUser || token !== currentToken)) {
    currentUser = user;
    currentToken = token;
    
    console.log('🚀 Auth state changed, auto-initializing socket...');
    console.log('User:', user.name, 'Token exists:', !!token);
    
    // Auto-connect after a short delay
    setTimeout(async () => {
      try {
        console.log('⚡ STARTING AUTO-CONNECTION...');
        const success = await socketService.connect(token);
        if (success) {
          console.log('✅ AUTO-CONNECTION SUCCESSFUL!');
        } else {
          console.log('❌ AUTO-CONNECTION FAILED');
        }
      } catch (error) {
        console.error('❌ Auto-connection error:', error);
      }
    }, 2000);
  }
};

// Listen to store changes for auto-initialization
console.log('🔧 Setting up store subscription for auto-initialization');
store.subscribe(checkAndAutoInitialize);

// Initial check
setTimeout(checkAndAutoInitialize, 1000);

export default socketService;