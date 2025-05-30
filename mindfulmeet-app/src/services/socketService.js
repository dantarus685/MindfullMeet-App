// src/services/socketService.js - Enhanced version with better error handling and connectivity
import io from 'socket.io-client';
import { Platform } from 'react-native';
import { store } from '../redux/store';
import { 
  setConnectionStatus, 
  addMessage, 
  setUserTyping, 
  setUserOnlineStatus,
  markRoomMessagesAsRead,
  updateRoomOrder
} from '../redux/chatSlice';

// Determine the correct server URL based on platform
const determineSocketUrl = () => {
  if (Platform.OS === 'android') {
    return __DEV__ ? 'http://10.0.2.2:5000' : 'https://your-production-api.com';
  }
  // For iOS simulator and physical devices, use your computer's IP
  return __DEV__ ? 'http://192.168.1.146:5000' : 'https://your-production-api.com';
};

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.currentRooms = new Set();
    this.debug = __DEV__;
    this.connectionPromise = null;
    this.eventListeners = new Map();
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[SocketService] ${message}`, data || '');
    }
  }

  error(message, error = null) {
    console.error(`[SocketService] ${message}`, error || '');
  }

  async connect(token) {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      this.log('⚠️ Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect(token);
    const result = await this.connectionPromise;
    this.connectionPromise = null;
    return result;
  }

  async _connect(token) {
    try {
      this.connectionState = 'connecting';
      this.log('🔌 Attempting to connect...');
      
      if (!token) {
        try {
          const state = store.getState();
          token = state.auth?.token;
          this.log('🔑 Retrieved token from store');
        } catch (error) {
          this.error('Could not get token from store:', error);
        }
      }
      
      if (!token) {
        this.error('❌ No token available');
        this.connectionState = 'error';
        store.dispatch(setConnectionStatus(false));
        return false;
      }
      
      this.log('🔑 Using token:', `${token.substring(0, 20)}...`);
      
      // Disconnect existing socket if any
      if (this.socket) {
        this.log('🔄 Disconnecting existing socket...');
        this.disconnect();
      }

      // Use the platform-specific URL
      const serverUrl = determineSocketUrl();
      this.log('🌐 Connecting to:', serverUrl);
      this.log('📱 Platform:', Platform.OS);

      // Enhanced socket configuration for React Native
      this.socket = io(serverUrl, {
        auth: { 
          token: token 
        },
        transports: ['websocket', 'polling'],
        timeout: 30000, // Increased timeout for React Native
        forceNew: true,
        autoConnect: false, // We'll connect manually
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        maxReconnectionAttempts: 5,
        randomizationFactor: 0.5,
        // React Native specific optimizations
        jsonp: false,
        rememberUpgrade: false,
        rejectUnauthorized: false, // Only for development
        // Additional options to help with React Native connectivity
        upgrade: true,
        // rememberUpgrade: false,
        forceBase64: false
      });

      // Setup event handlers before connecting
      this.setupEventHandlers();
      
      // Connect and wait for connection with enhanced timeout handling
      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          this.error('❌ Connection timeout after 30 seconds');
          this.connectionState = 'error';
          this.cleanup();
          reject(new Error('Connection timeout after 30s'));
        }, 30000);

        const connectHandler = () => {
          clearTimeout(connectTimeout);
          this.log('✅ Socket connected successfully');
          this.connectionState = 'connected';
          resolve(true);
        };

        const errorHandler = (error) => {
          clearTimeout(connectTimeout);
          this.error('❌ Connection failed:', error.message);
          this.connectionState = 'error';
          this.error('🔍 Detailed error info:', {
            message: error.message,
            description: error.description,
            context: error.context,
            type: error.type,
            transport: error.transport
          });
          reject(error);
        };

        // Set up one-time event listeners
        this.socket.once('connect', connectHandler);
        this.socket.once('connect_error', errorHandler);

        // Initiate connection
        this.log('🚀 Initiating socket connection...');
        this.socket.connect();
      });
      
    } catch (error) {
      this.error('❌ Connection error:', error);
      this.connectionState = 'error';
      store.dispatch(setConnectionStatus(false));
      return false;
    }
  }

  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.connectionState = 'disconnected';
  }

  setupEventHandlers() {
    if (!this.socket) {
      this.error('❌ Cannot setup event handlers - no socket instance');
      return;
    }

    this.log('🔧 Setting up event handlers...');

    // Clear existing listeners to prevent duplicates
    this.socket.removeAllListeners();

    // Connection events
    this.socket.on('connect', () => {
      this.log('✅ Connected! Socket ID:', this.socket.id);
      this.isConnected = true;
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      store.dispatch(setConnectionStatus(true));
      
      // Rejoin rooms after connection
      this.rejoinRooms();
      
      // Emit custom connected event
      this.emitToListeners('connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.log('❌ Disconnected:', reason);
      this.isConnected = false;
      this.connectionState = 'disconnected';
      store.dispatch(setConnectionStatus(false));
      
      this.emitToListeners('disconnected', { reason });
      
      // Don't auto-reconnect if server initiated disconnect or client initiated
      if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.error('🔌 Connection error:', error.message);
      this.connectionState = 'error';
      this.error('🔍 Connection error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        stack: error.stack
      });
      
      if (error.message && (error.message.includes('Authentication') || error.message.includes('token'))) {
        this.handleAuthError(error);
      } else {
        this.isConnected = false;
        store.dispatch(setConnectionStatus(false));
        this.handleReconnect();
      }
      
      this.emitToListeners('connect_error', { error });
    });

    // Custom confirmation events
    this.socket.on('connected', (data) => {
      this.log('📥 Server confirmed connection:', data);
      this.emitToListeners('server_connected', data);
    });

    // Room events
    this.socket.on('roomJoined', (data) => {
      this.log('📥 Successfully joined room:', data);
      if (data.roomId) {
        this.currentRooms.add(data.roomId);
      }
      this.emitToListeners('roomJoined', data);
    });

    this.socket.on('roomLeft', (data) => {
      this.log('📤 Successfully left room:', data);
      if (data.roomId) {
        this.currentRooms.delete(data.roomId);
      }
      this.emitToListeners('roomLeft', data);
    });

    // Message events
    this.socket.on('newMessage', (data) => {
      this.log('📨 New message received:', data);
      const { message, roomId } = data;
      
      if (!message || !roomId) {
        this.error('❌ Invalid message data received:', data);
        return;
      }
      
      // Ensure message has required fields
      const processedMessage = {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        roomId: message.roomId,
        isRead: message.isRead || false,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        sender: message.sender
      };
      
      store.dispatch(addMessage({ roomId, message: processedMessage }));
      store.dispatch(updateRoomOrder(roomId));
      
      this.emitToListeners('newMessage', data);
    });

    this.socket.on('messageSent', (data) => {
      this.log('✅ Message sent confirmation:', data);
      this.emitToListeners('messageSent', data);
    });

    // Typing events
    this.socket.on('userTyping', (data) => {
      const { roomId, userId, userName, isTyping } = data;
      
      if (!roomId || !userId) {
        this.error('❌ Invalid typing data:', data);
        return;
      }
      
      // Don't show typing indicator for current user
      const state = store.getState();
      if (userId === state.chat?.currentUserId) {
        return;
      }
      
      this.log('⌨️ User typing:', data);
      store.dispatch(setUserTyping({ roomId, userId, userName, isTyping }));
      
      // Auto-clear typing indicator after delay
      if (isTyping) {
        setTimeout(() => {
          store.dispatch(setUserTyping({ roomId, userId, userName, isTyping: false }));
        }, 3000);
      }
      
      this.emitToListeners('userTyping', data);
    });

    // User presence events
    this.socket.on('userJoinedRoom', (data) => {
      this.log('👤 User joined room:', data);
      const { roomId, user } = data;
      
      if (!roomId || !user) {
        this.error('❌ Invalid user joined data:', data);
        return;
      }
      
      store.dispatch(setUserOnlineStatus({ 
        userId: user.id, 
        status: 'online', 
        roomId 
      }));
      
      this.emitToListeners('userJoinedRoom', data);
    });

    this.socket.on('userLeftRoom', (data) => {
      this.log('👤 User left room:', data);
      const { roomId, userId } = data;
      
      if (!roomId || !userId) {
        this.error('❌ Invalid user left data:', data);
        return;
      }
      
      store.dispatch(setUserOnlineStatus({ 
        userId, 
        status: 'offline', 
        roomId 
      }));
      
      this.emitToListeners('userLeftRoom', data);
    });

    this.socket.on('userStatusChange', (data) => {
      this.log('🟢 User status change:', data);
      const { userId, status, roomId } = data;
      
      if (!userId || !status) {
        this.error('❌ Invalid status change data:', data);
        return;
      }
      
      store.dispatch(setUserOnlineStatus({ userId, status, roomId }));
      this.emitToListeners('userStatusChange', data);
    });

    // Read receipts
    this.socket.on('messagesRead', (data) => {
      this.log('👁️ Messages read:', data);
      const { roomId } = data;
      
      if (!roomId) {
        this.error('❌ Invalid messages read data:', data);
        return;
      }
      
      this.emitToListeners('messagesRead', data);
    });

    this.socket.on('messagesMarkedRead', (data) => {
      this.log('✅ Messages marked as read confirmation:', data);
      this.emitToListeners('messagesMarkedRead', data);
    });

    // Ping/pong for connection testing
    this.socket.on('pong', (data) => {
      this.log('🏓 Pong received:', data);
      this.emitToListeners('pong', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      this.error('❌ Socket error:', error);
      
      if (error.message && (error.message.includes('Authentication') || error.message.includes('token'))) {
        this.handleAuthError(error);
      }
      
      this.emitToListeners('error', { error });
    });

    // Force disconnect handler
    this.socket.on('forceDisconnect', (data) => {
      this.log('⚠️ Force disconnect received:', data);
      this.disconnect();
      this.emitToListeners('forceDisconnect', data);
    });

    // Server shutdown handler
    this.socket.on('serverShutdown', (data) => {
      this.log('🔄 Server shutdown notification:', data);
      this.emitToListeners('serverShutdown', data);
    });

    // Debug: Log all events in development
    if (this.debug) {
      this.socket.onAny((eventName, ...args) => {
        if (!['pong', 'ping'].includes(eventName)) { // Reduce noise
          this.log(`📡 Event received: ${eventName}`, args);
        }
      });
    }
  }

  // Event listener management for components
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

  emitToListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  handleAuthError(error) {
    this.error('🔐 Authentication error:', error);
    
    try {
      const state = store.getState();
      const newToken = state.auth?.token;
      
      if (newToken) {
        this.log('🔄 Retrying with fresh token...');
        setTimeout(() => {
          this.connect(newToken);
        }, 2000);
      } else {
        this.error('❌ No token available for retry');
        store.dispatch(setConnectionStatus(false));
      }
    } catch (err) {
      this.error('❌ Failed to get fresh token:', err);
    }
  }

  rejoinRooms() {
    if (this.currentRooms.size > 0) {
      this.log('🔄 Rejoining rooms:', Array.from(this.currentRooms));
      // Add small delay to ensure connection is stable
      setTimeout(() => {
        this.currentRooms.forEach(roomId => {
          this.joinRoom(roomId, false);
        });
      }, 1000);
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.error('❌ Max reconnection attempts reached');
      this.connectionState = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      15000 // Max 15 seconds
    );
    
    this.log(`🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    this.connectionState = 'connecting';
    
    setTimeout(() => {
      if (this.socket && !this.isConnected) {
        this.socket.connect();
      }
    }, delay);
  }

  // CORE METHODS
  joinRoom(roomId, addToCurrentRooms = true) {
    if (!roomId) {
      this.error('❌ Cannot join room - no roomId');
      return false;
    }

    if (!this.socket) {
      this.error('❌ Cannot join room - no socket');
      return false;
    }

    if (!this.isConnected) {
      this.log('⚠️ Socket not connected, queueing room:', roomId);
      if (addToCurrentRooms) {
        this.currentRooms.add(roomId);
      }
      return false;
    }

    this.log('🚪 Joining room:', roomId);
    this.socket.emit('joinRoom', { roomId });
    
    if (addToCurrentRooms) {
      this.currentRooms.add(roomId);
    }
    
    return true;
  }

  leaveRoom(roomId) {
    if (!roomId) {
      this.error('❌ Cannot leave room - no roomId');
      return false;
    }

    this.currentRooms.delete(roomId);

    if (!this.socket || !this.isConnected) {
      this.log('⚠️ Cannot leave room - not connected');
      return false;
    }

    this.log('🚪 Leaving room:', roomId);
    this.socket.emit('leaveRoom', { roomId });
    return true;
  }

  sendMessage(roomId, content) {
    if (!roomId || !content?.trim()) {
      this.error('❌ Cannot send message - missing data');
      return false;
    }

    if (!this.socket || !this.isConnected) {
      this.log('⚠️ Cannot send message - not connected');
      return false;
    }

    this.log('📤 Sending message to room:', roomId, 'Content preview:', content.substring(0, 50));
    this.socket.emit('sendMessage', { roomId, content: content.trim() });
    return true;
  }

  sendTypingIndicator(roomId, isTyping) {
    if (!roomId || !this.socket || !this.isConnected) return false;
    
    this.socket.emit('typing', { roomId, isTyping });
    return true;
  }

  markMessagesAsRead(roomId) {
    if (!roomId || !this.socket || !this.isConnected) return false;
    
    this.log('👁️ Marking messages as read for room:', roomId);
    this.socket.emit('markMessagesRead', { roomId });
    return true;
  }

  // Connection testing
  ping(data = {}) {
    if (!this.socket || !this.isConnected) return false;
    
    this.socket.emit('ping', { ...data, timestamp: Date.now() });
    return true;
  }

  disconnect() {
    if (this.socket) {
      this.log('🔌 Disconnecting...');
      
      // Clear event listeners
      this.eventListeners.clear();
      
      // Disconnect socket
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionState = 'disconnected';
      this.currentRooms.clear();
      this.reconnectAttempts = 0;
      
      store.dispatch(setConnectionStatus(false));
    }
  }

  // UTILITY METHODS
  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }

  getConnectionState() {
    return this.connectionState;
  }

  getSocket() {
    return this.socket;
  }

  getCurrentRooms() {
    return Array.from(this.currentRooms);
  }

  forceReconnect() {
    this.log('🔄 Forcing reconnection...');
    this.reconnectAttempts = 0;
    this.connectionState = 'connecting';
    
    if (this.socket) {
      this.socket.connect();
    } else {
      // Try to reconnect with stored token
      const state = store.getState();
      const token = state.auth?.token;
      if (token) {
        this.connect(token);
      }
    }
  }

  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
      currentRooms: Array.from(this.currentRooms),
      reconnectAttempts: this.reconnectAttempts,
      hasSocket: !!this.socket,
      serverUrl: determineSocketUrl(),
      platform: Platform.OS,
      eventListeners: Object.fromEntries(
        Array.from(this.eventListeners.entries()).map(([key, set]) => [key, set.size])
      )
    };
  }

  // Health check method
  healthCheck() {
    const info = this.getDebugInfo();
    this.log('🔍 Health Check:', info);
    
    if (this.isConnected) {
      this.ping({ healthCheck: true });
    }
    
    return info;
  }
}

const socketService = new SocketService();
export default socketService;