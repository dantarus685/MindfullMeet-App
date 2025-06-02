// src/services/socketService.js - ENHANCED AUTO-CONNECT VERSION
import io from 'socket.io-client';
import { Platform } from 'react-native';

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
    this.autoConnectEnabled = true;
    this.store = null; // Will be set by store
    
    // Track sent messages to prevent duplicates
    this.sentMessages = new Map();
    this.pendingMessages = new Set();
    this.processedMessageIds = new Set();
    
    // Auto-connection state tracking
    this.lastConnectedUser = null;
    this.lastConnectedToken = null;
    this.isAutoConnecting = false;
    this.hasTriedInitialConnection = false;
    
    // **NEW: Auto-connect checker interval**
    this.autoConnectChecker = null;
    this.startAutoConnectChecker();
  }

  // **NEW: Start periodic auto-connect checker**
  startAutoConnectChecker() {
    if (this.autoConnectChecker) {
      clearInterval(this.autoConnectChecker);
    }
    
    // Check every 3 seconds if we should auto-connect
    this.autoConnectChecker = setInterval(() => {
      if (!this.isConnected && !this.isAutoConnecting && this.autoConnectEnabled) {
        this.checkAndAutoConnect();
      }
    }, 3000);
    
    console.log('🔄 Auto-connect checker started');
  }

  // **NEW: Check if we should auto-connect and do it**
  async checkAndAutoConnect() {
    try {
      const state = this.getState();
      if (!state) return;

      const user = state.auth?.user;
      const token = state.auth?.token;
      const isAuthenticated = state.auth?.isAuthenticated;

      // Check if we have everything needed for connection
      if (user && token && isAuthenticated) {
        // Check if we're not already connected with this user/token
        const shouldConnect = !this.isConnected || 
                             this.lastConnectedUser?.id !== user.id || 
                             this.lastConnectedToken !== token;

        if (shouldConnect) {
          console.log('🚀 Auto-connect checker: Starting connection...', {
            userConnected: this.lastConnectedUser?.id === user.id,
            tokenMatches: this.lastConnectedToken === token,
            isConnected: this.isConnected
          });
          
          await this.autoConnect();
        }
      }
    } catch (error) {
      console.error('❌ Auto-connect checker error:', error);
    }
  }

  // Set store reference - called by store after creation
  setStore(store) {
    this.store = store;
    console.log('🔗 Store reference set for socket service');
    
    // **NEW: Immediately check for auto-connect once store is set**
    setTimeout(() => {
      this.checkAndAutoConnect();
    }, 1000);
  }

  // Get store state safely
  getState() {
    if (!this.store) {
      console.warn('⚠️ Store not available in socket service');
      return null;
    }
    return this.store.getState();
  }

  // Dispatch action safely
  dispatch(action) {
    if (!this.store) {
      console.warn('⚠️ Store not available for dispatch:', action);
      return;
    }
    this.store.dispatch(action);
  }

  log(message, data = '') {
    if (__DEV__) {
      console.log(`[SocketService] ${message}`, data);
    }
  }

  error(message, data = '') {
    console.error(`[SocketService] ${message}`, data);
  }

  // **ENHANCED: Auto-connection with immediate retry**
  async autoConnect() {
    if (this.isAutoConnecting) {
      this.log('Auto-connection already in progress, skipping');
      return false;
    }
    
    this.isAutoConnecting = true;

    try {
      const state = this.getState();
      if (!state) {
        this.log('⚠️ No store state available for auto-connection');
        return false;
      }

      const user = state.auth?.user;
      const token = state.auth?.token;
      const isAuthenticated = state.auth?.isAuthenticated;

      // Check if we should auto-connect
      if (!user || !token || !isAuthenticated) {
        this.log('⚠️ No user/token/auth for auto-connection', {
          hasUser: !!user,
          hasToken: !!token,
          isAuthenticated
        });
        return false;
      }

      // Check if already connected with same user/token
      if (this.isConnected && 
          this.lastConnectedUser?.id === user.id && 
          this.lastConnectedToken === token) {
        this.log('✅ Already connected with same user, skipping auto-connect');
        return true;
      }

      this.log('🚀 Starting auto-connection...', { 
        userId: user.id, 
        userName: user.name,
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
      });

      // Store current user/token for tracking
      this.lastConnectedUser = user;
      this.lastConnectedToken = token;
      this.hasTriedInitialConnection = true;

      // Connect
      const success = await this.connect(token);
      
      if (success) {
        this.log('✅ Auto-connection successful!');
        return true;
      } else {
        this.error('❌ Auto-connection failed');
        return false;
      }
    } catch (error) {
      this.error('❌ Auto-connection error:', error.message);
      return false;
    } finally {
      this.isAutoConnecting = false;
    }
  }

  // **NEW: Force immediate connection check - called by chat screen**
  async forceAutoConnect() {
    console.log('🔥 Force auto-connect requested from chat screen');
    
    // Reset flags to force a fresh attempt
    this.hasTriedInitialConnection = false;
    this.lastConnectedUser = null;
    this.lastConnectedToken = null;
    
    return this.autoConnect();
  }

  // Enhanced connect method
  async connect(token, retryCount = 0) {
    const maxRetries = 3;
    
    // If already connected with same token, return success
    if (this.isConnected && this.socket?.connected && this.lastToken === token) {
      this.log('Already connected with same token, skipping connection attempt');
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
        const state = this.getState();
        token = state?.auth?.token;
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
          this.updateConnectionStatus(true);
          
          // Start heartbeat
          this._startPingInterval();
          
          // Clean up listeners safely
          if (this.socket) {
            this.socket.off('connect', onConnect);
            this.socket.off('connect_error', onConnectError);
          }
          resolve(true);
        };

        const onConnectError = (error) => {
          clearTimeout(connectTimeout);
          this.error('❌ Connection failed:', error.message);
          this._cleanup();
          // Safe cleanup
          if (this.socket) {
            this.socket.off('connect', onConnect);
            this.socket.off('connect_error', onConnectError);
          }
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

  // Safe connection status update
  updateConnectionStatus(connected) {
    try {
      if (this.store) {
        // Dynamically import to avoid circular dependency
        const { setConnectionStatus } = require('../redux/chatSlice');
        this.dispatch(setConnectionStatus(connected));
      }
    } catch (error) {
      this.log('⚠️ Could not update connection status:', error.message);
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
      this.updateConnectionStatus(true);
      
      // Rejoin rooms after connection
      this._rejoinRooms();
      this._emitToListeners('connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.log('❌ Disconnected:', reason);
      this.isConnected = false;
      this.updateConnectionStatus(false);
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
      this.updateConnectionStatus(false);
      this._emitToListeners('connect_error', { error });
      
      if (error.message?.includes('Authentication') || error.message?.includes('token')) {
        this._handleAuthError();
      } else {
        this._scheduleReconnect();
      }
    });

    // ROOM EVENTS
    this.socket.on('roomJoined', (data) => {
      this.log('✅ Room joined with data:', data);
      
      if (data.roomId) {
        this.currentRooms.add(data.roomId);
      }
      
      // Handle message history from room join
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        this.log(`📚 Received ${data.messages.length} messages from room join`);
        
        try {
          const state = this.getState();
          const existingMessages = state?.chat?.messagesByRoom?.[data.roomId] || [];
          
          // Only add messages if we don't have any yet (avoid duplicates)
          if (existingMessages.length === 0) {
            this.log('💾 Adding message history to Redux store');
            
            // Format messages properly
            const formattedMessages = data.messages.map(message => ({
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              roomId: message.roomId || data.roomId,
              isRead: message.isRead || false,
              createdAt: message.createdAt,
              updatedAt: message.updatedAt,
              sender: message.sender || null
            }));
            
            // Use prependMessages to add them chronologically
            const { prependMessages } = require('../redux/chatSlice');
            this.dispatch(prependMessages({ 
              roomId: data.roomId, 
              messages: formattedMessages 
            }));
          } else {
            this.log('⚠️ Room already has messages, skipping history from socket');
          }
        } catch (error) {
          this.error('❌ Error handling room messages:', error);
        }
      }
      
      this._emitToListeners('roomJoined', data);
    });

    // MESSAGE EVENTS
    this.socket.on('newMessage', (data) => {
      this.log('📨 New message received:', data);
      const { message, roomId } = data;
      
      if (message && roomId) {
        try {
          // Prevent duplicate processing
          if (this.processedMessageIds.has(message.id)) {
            this.log('⚠️ Message already processed, skipping:', message.id);
            return;
          }
          
          this.processedMessageIds.add(message.id);
          
          // Check if this is our own message that we sent
          const state = this.getState();
          const isOwnMessage = message.senderId === state?.auth?.user?.id;
          
          if (isOwnMessage) {
            // Remove any optimistic message with same content
            const roomMessages = state?.chat?.messagesByRoom?.[roomId] || [];
            const optimisticMessage = roomMessages.find(m => 
              m.isOptimistic && 
              m.content.trim() === message.content.trim() && 
              m.senderId === message.senderId
            );
            
            if (optimisticMessage) {
              const { removeOptimisticMessage } = require('../redux/chatSlice');
              this.dispatch(removeOptimisticMessage({ 
                roomId, 
                tempId: optimisticMessage.id 
              }));
              this.log('🗑️ Removed optimistic message, adding real message');
            }
          }
          
          // Check if message already exists (prevent duplicates)
          const existingMessages = state?.chat?.messagesByRoom?.[roomId] || [];
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
            const { addMessage, updateRoomOrder } = require('../redux/chatSlice');
            this.dispatch(addMessage({ roomId, message: formattedMessage }));
            this.dispatch(updateRoomOrder(roomId));
            
            this.log('✅ Message added to store for room:', roomId);
          } else {
            this.log('⚠️ Message already exists, skipping duplicate:', message.id);
          }
        } catch (error) {
          this.error('❌ Error handling new message:', error);
        }
      }
      
      this._emitToListeners('newMessage', data);
    });

    // TYPING EVENTS
    this.socket.on('userTyping', (data) => {
      this.log('⌨️ User typing event received:', data);
      const { roomId, userId, userName, isTyping } = data;
      
      if (roomId && userId) {
        try {
          // Don't show typing for current user
          const state = this.getState();
          if (userId !== state?.auth?.user?.id) {
            const { setUserTyping } = require('../redux/chatSlice');
            this.dispatch(setUserTyping({ roomId, userId, userName, isTyping }));
            
            // Auto-clear typing after timeout
            if (isTyping) {
              setTimeout(() => {
                this.dispatch(setUserTyping({ roomId, userId, userName, isTyping: false }));
              }, 3000);
            }
            
            this.log(`⌨️ Updated typing status for user ${userName} in room ${roomId}: ${isTyping}`);
          }
        } catch (error) {
          this.error('❌ Error handling typing indicator:', error);
        }
      }
      
      this._emitToListeners('userTyping', data);
    });

    // USER PRESENCE EVENTS
    this.socket.on('userJoinedRoom', (data) => {
      this.log('👤 User joined room:', data);
      const { roomId, user } = data;
      
      if (roomId && user) {
        try {
          const { setUserOnlineStatus } = require('../redux/chatSlice');
          this.dispatch(setUserOnlineStatus({ 
            userId: user.id, 
            status: 'online', 
            roomId 
          }));
        } catch (error) {
          this.error('❌ Error handling user joined room:', error);
        }
      }
      
      this._emitToListeners('userJoinedRoom', data);
    });

    this.socket.on('userLeftRoom', (data) => {
      this.log('👤 User left room:', data);
      const { roomId, userId } = data;
      
      if (roomId && userId) {
        try {
          const { setUserOnlineStatus } = require('../redux/chatSlice');
          this.dispatch(setUserOnlineStatus({ 
            userId, 
            status: 'offline', 
            roomId 
          }));
        } catch (error) {
          this.error('❌ Error handling user left room:', error);
        }
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
      tempId
    };

    this.pendingMessages.add(tempId);

    this.log('📤 Sending message to room:', roomId, 'Content:', content.substring(0, 50) + '...');
    
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
    
    return tempId;
  }

  sendTypingIndicator(roomId, isTyping) {
    if (!roomId || !this.socket || !this.isConnected) {
      this.log('⚠️ Cannot send typing indicator - not connected or missing roomId');
      return false;
    }
    
    this.log(`⌨️ Sending typing indicator to room ${roomId}: ${isTyping}`);
    this.socket.emit('typing', { roomId: parseInt(roomId), isTyping });
    return true;
  }

  markMessagesAsRead(roomId) {
    if (!roomId || !this.socket || !this.isConnected) {
      this.log('⚠️ Cannot mark messages as read - not connected or missing roomId');
      return false;
    }
    
    this.log('👁️ Marking messages as read for room:', roomId);
    this.socket.emit('markMessagesRead', { roomId: parseInt(roomId) });
    return true;
  }

  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }

  forceReconnect() {
    this.log('🔄 Force reconnect requested');
    this.reconnectAttempts = 0;
    
    if (this.lastToken) {
      return this.connect(this.lastToken);
    } else {
      const state = this.getState();
      const token = state?.auth?.token;
      if (token) {
        return this.connect(token);
      } else {
        this.error('❌ No token available for reconnection');
        return Promise.resolve(false);
      }
    }
  }

  // UTILITY METHODS
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

  _startPingInterval() {
    this._stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.ping({ heartbeat: true });
      }
    }, 30000);
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
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (error) {
        this.error('❌ Error during socket cleanup:', error.message);
      }
      this.socket = null;
    }
    
    this.isConnected = false;
    this.updateConnectionStatus(false);
  }

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
      const state = this.getState();
      const newToken = state?.auth?.token;
      
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

  ping(data = {}) {
    if (!this.socket || !this.isConnected) return false;
    
    this.socket.emit('ping', { ...data, timestamp: Date.now() });
    return true;
  }

  disconnect() {
    this.log('🔌 Manual disconnect');
    this.autoConnectEnabled = false; // Disable auto-connect
    
    // Clear auto-connect checker
    if (this.autoConnectChecker) {
      clearInterval(this.autoConnectChecker);
      this.autoConnectChecker = null;
    }
    
    this.eventListeners.clear();
    this.currentRooms.clear();
    this.reconnectAttempts = 0;
    this.lastToken = null;
    this.sentMessages.clear();
    this.pendingMessages.clear();
    this.processedMessageIds.clear();
    this.lastConnectedUser = null;
    this.lastConnectedToken = null;
    this.hasTriedInitialConnection = false;
    
    try {
      this._cleanup();
    } catch (error) {
      this.error('❌ Error during manual disconnect:', error.message);
    }
  }

  getDebugInfo() {
    const state = this.getState();
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
      hasStore: !!this.store,
      pendingMessages: this.pendingMessages.size,
      sentMessages: this.sentMessages.size,
      processedMessages: this.processedMessageIds.size,
      autoConnectEnabled: this.autoConnectEnabled,
      isAutoConnecting: this.isAutoConnecting,
      hasTriedInitialConnection: this.hasTriedInitialConnection,
      lastConnectedUser: this.lastConnectedUser?.name || null,
      lastConnectedToken: this.lastConnectedToken ? this.lastConnectedToken.substring(0, 20) + '...' : null,
      hasAutoConnectChecker: !!this.autoConnectChecker,
      storeState: {
        hasAuth: !!state?.auth,
        hasUser: !!state?.auth?.user,
        hasToken: !!state?.auth?.token,
        isAuthenticated: !!state?.auth?.isAuthenticated,
        userName: state?.auth?.user?.name
      }
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;