// src/services/socketService.js - REPLACE THIS ENTIRE FILE
import io from 'socket.io-client';
import { store } from '../redux/store';
import { 
  setConnectionStatus, 
  addMessage, 
  setUserTyping, 
  setUserOnlineStatus,
  markRoomMessagesAsRead,
  updateRoomOrder
} from '../redux/chatSlice';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.currentRooms = new Set();
    this.debug = __DEV__;
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[SocketService] ${message}`, data || '');
    }
  }

  error(message, error = null) {
    console.error(`[SocketService] ${message}`, error || '');
  }

  connect(token) {
    try {
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
        store.dispatch(setConnectionStatus(false));
        return false;
      }
      
      this.log('🔑 Using token:', `${token.substring(0, 20)}...`);
      
      if (this.socket) {
        this.log('🔄 Disconnecting existing socket...');
        this.disconnect();
      }

      const serverUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
      this.log('🌐 Connecting to:', serverUrl);

      this.socket = io(serverUrl, {
        auth: { 
          token: token 
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.setupEventHandlers();
      return true;
      
    } catch (error) {
      this.error('❌ Connection error:', error);
      store.dispatch(setConnectionStatus(false));
      return false;
    }
  }

  setupEventHandlers() {
    if (!this.socket) {
      this.error('❌ Cannot setup event handlers - no socket instance');
      return;
    }

    this.log('🔧 Setting up event handlers...');

    // Connection events
    this.socket.on('connect', () => {
      this.log('✅ Connected! Socket ID:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      store.dispatch(setConnectionStatus(true));
      this.rejoinRooms();
    });

    this.socket.on('disconnect', (reason) => {
      this.log('❌ Disconnected:', reason);
      this.isConnected = false;
      store.dispatch(setConnectionStatus(false));
      
      if (reason !== 'io server disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.error('🔌 Connection error:', error.message);
      
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        this.handleAuthError(error);
      } else {
        this.isConnected = false;
        store.dispatch(setConnectionStatus(false));
        this.handleReconnect();
      }
    });

    // Room events
    this.socket.on('roomJoined', (data) => {
      this.log('📥 Successfully joined room:', data);
      if (data.roomId) {
        this.currentRooms.add(data.roomId);
      }
    });

    this.socket.on('roomLeft', (data) => {
      this.log('📤 Successfully left room:', data);
      if (data.roomId) {
        this.currentRooms.delete(data.roomId);
      }
    });

    // Message events
    this.socket.on('newMessage', (data) => {
      this.log('📨 New message received:', data);
      const { message, roomId } = data;
      
      if (!message || !roomId) {
        this.error('❌ Invalid message data received:', data);
        return;
      }
      
      store.dispatch(addMessage({ roomId, message }));
      store.dispatch(updateRoomOrder(roomId));
    });

    this.socket.on('messageSent', (data) => {
      this.log('✅ Message sent confirmation:', data);
    });

    // Typing events
    this.socket.on('userTyping', (data) => {
      this.log('⌨️ User typing:', data);
      const { roomId, userId, userName, isTyping } = data;
      
      if (!roomId || !userId) {
        this.error('❌ Invalid typing data:', data);
        return;
      }
      
      store.dispatch(setUserTyping({ roomId, userId, userName, isTyping }));
      
      if (isTyping) {
        setTimeout(() => {
          store.dispatch(setUserTyping({ roomId, userId, userName, isTyping: false }));
        }, 3000);
      }
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
    });

    this.socket.on('userStatusChange', (data) => {
      this.log('🟢 User status change:', data);
      const { userId, status, roomId } = data;
      
      if (!userId || !status) {
        this.error('❌ Invalid status change data:', data);
        return;
      }
      
      store.dispatch(setUserOnlineStatus({ userId, status, roomId }));
    });

    // Read receipts
    this.socket.on('messagesRead', (data) => {
      this.log('👁️ Messages read:', data);
      const { roomId } = data;
      
      if (!roomId) {
        this.error('❌ Invalid messages read data:', data);
        return;
      }
      
      store.dispatch(markRoomMessagesAsRead(roomId));
    });

    // Error handling
    this.socket.on('error', (error) => {
      this.error('❌ Socket error:', error);
      
      if (error.message && (error.message.includes('Authentication') || error.message.includes('token'))) {
        this.handleAuthError(error);
      }
    });

    // Debug: Log all events in development
    if (this.debug) {
      this.socket.onAny((eventName, ...args) => {
        this.log(`📡 Event: ${eventName}`, args);
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
      this.currentRooms.forEach(roomId => {
        this.joinRoom(roomId, false);
      });
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    this.log(`🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
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
    if (!roomId || !content) {
      this.error('❌ Cannot send message - missing data');
      return false;
    }

    if (!this.socket || !this.isConnected) {
      this.log('⚠️ Cannot send message - not connected');
      return false;
    }

    this.log('📤 Sending message to room:', roomId, 'Content:', content);
    this.socket.emit('sendMessage', { roomId, content });
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

  disconnect() {
    if (this.socket) {
      this.log('🔌 Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRooms.clear();
      store.dispatch(setConnectionStatus(false));
    }
  }

  // UTILITY METHODS
  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
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
    if (this.socket) {
      this.socket.connect();
    }
  }

  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
      currentRooms: Array.from(this.currentRooms),
      reconnectAttempts: this.reconnectAttempts,
      hasSocket: !!this.socket
    };
  }
}

const socketService = new SocketService();
export default socketService;