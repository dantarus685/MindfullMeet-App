// src/redux/chatSlice.js - Enhanced version
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../config/api';

// Async thunks for API calls
export const fetchUserRooms = createAsyncThunk(
  'chat/fetchUserRooms',
  async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      console.log('🔄 Fetching user rooms...');
      const response = await api.get(`/api/support/rooms?page=${page}&limit=${limit}`);
      console.log('✅ Rooms fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Fetch rooms error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to fetch rooms';
      return rejectWithValue(message);
    }
  }
);

export const createRoom = createAsyncThunk(
  'chat/createRoom',
  async (roomData, { rejectWithValue }) => {
    try {
      console.log('🔄 Creating room:', roomData);
      const response = await api.post('/api/support/rooms', roomData);
      console.log('✅ Room created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Create room error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to create room';
      return rejectWithValue(message);
    }
  }
);

export const fetchRoomMessages = createAsyncThunk(
  'chat/fetchRoomMessages',
  async ({ roomId, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      console.log(`🔄 Fetching messages for room ${roomId}...`);
      const response = await api.get(`/api/support/rooms/${roomId}/messages?page=${page}&limit=${limit}`);
      console.log(`✅ Messages fetched for room ${roomId}:`, response.data);
      return { roomId, ...response.data };
    } catch (error) {
      console.error('❌ Fetch messages error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to fetch messages';
      return rejectWithValue(message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ roomId, content }, { rejectWithValue, getState }) => {
    try {
      console.log(`🔄 Sending message via API to room ${roomId}:`, content);
      const response = await api.post(`/api/support/rooms/${roomId}/messages`, { content });
      console.log(`✅ Message sent via API:`, response.data);
      return { roomId, ...response.data };
    } catch (error) {
      console.error('❌ Send message error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to send message';
      return rejectWithValue(message);
    }
  }
);

export const joinRoom = createAsyncThunk(
  'chat/joinRoom',
  async (roomId, { rejectWithValue }) => {
    try {
      console.log(`🔄 Joining room ${roomId}...`);
      const response = await api.get(`/api/support/rooms/${roomId}`);
      console.log(`✅ Room joined:`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Join room error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to join room';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  // Rooms
  rooms: [],
  roomsPagination: {
    currentPage: 1,
    totalPages: 1,
    totalRooms: 0,
    hasNext: false,
    hasPrev: false
  },
  
  // Messages by room ID
  messagesByRoom: {},
  messagePagination: {},
  
  // Current active room
  activeRoom: null,
  
  // Real-time state
  onlineUsers: {},
  typingUsers: {},
  
  // Loading states
  loading: {
    rooms: false,
    messages: {},
    sending: {},
    creating: false
  },
  
  // Error states
  errors: {
    rooms: null,
    messages: {},
    sending: {},
    creating: null
  },
  
  // Socket connection status
  isConnected: false,
  
  // Current user ID
  currentUserId: null,
  
  // Notifications
  unreadCounts: {},
  totalUnreadCount: 0,
  
  // UI state
  lastActivity: null,
  connectionHistory: []
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Socket connection management
    setConnectionStatus: (state, action) => {
      const isConnected = action.payload;
      const timestamp = new Date().toISOString();
      
      console.log('🔌 Connection status changed:', isConnected);
      
      state.isConnected = isConnected;
      state.lastActivity = timestamp;
      
      // Track connection history
      state.connectionHistory.unshift({
        status: isConnected ? 'connected' : 'disconnected',
        timestamp
      });
      
      // Keep only last 10 connection events
      if (state.connectionHistory.length > 10) {
        state.connectionHistory = state.connectionHistory.slice(0, 10);
      }
    },
    
    // Room management
    setActiveRoom: (state, action) => {
      console.log('🏠 Setting active room:', action.payload);
      state.activeRoom = action.payload;
    },
    
    clearActiveRoom: (state) => {
      console.log('🏠 Clearing active room');
      state.activeRoom = null;
    },
    
    // Real-time message handling
    addMessage: (state, action) => {
      const { roomId, message } = action.payload;
      console.log(`📨 Adding message to room ${roomId}:`, message);
      
      if (!state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = [];
      }
      
      // Check if message already exists (prevent duplicates)
      const existingMessage = state.messagesByRoom[roomId].find(m => m.id === message.id);
      if (!existingMessage) {
        // Ensure message is properly formatted
        const formattedMessage = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          roomId: message.roomId || roomId,
          isRead: message.isRead || false,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          sender: message.sender || null
        };
        
        state.messagesByRoom[roomId].push(formattedMessage);
        console.log(`✅ Message added to room ${roomId}`);
        
        // Update room's last message in rooms list
        const room = state.rooms.find(r => r.id === parseInt(roomId));
        if (room) {
          room.messages = [formattedMessage];
          room.updatedAt = formattedMessage.createdAt;
          
          // Update unread count if not current user's message and not active room
          if (formattedMessage.senderId !== state.currentUserId && 
              state.activeRoom?.id !== parseInt(roomId)) {
            const previousCount = room.unreadCount || 0;
            room.unreadCount = previousCount + 1;
            state.unreadCounts[roomId] = room.unreadCount;
            state.totalUnreadCount += 1;
            
            console.log(`📊 Updated unread count for room ${roomId}: ${room.unreadCount}`);
          }
        }
      } else {
        console.log(`⚠️ Message already exists in room ${roomId}, skipping`);
      }
    },
    
    // Optimistic message adding (for immediate UI feedback)
    addOptimisticMessage: (state, action) => {
      const { roomId, content, tempId } = action.payload;
      
      if (!state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = [];
      }
      
      const optimisticMessage = {
        id: tempId || `temp_${Date.now()}`,
        content,
        senderId: state.currentUserId,
        roomId: parseInt(roomId),
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: null,
        isOptimistic: true
      };
      
      state.messagesByRoom[roomId].push(optimisticMessage);
      console.log(`⚡ Added optimistic message to room ${roomId}`);
    },
    
    // Remove optimistic message (when real message arrives)
    removeOptimisticMessage: (state, action) => {
      const { roomId, tempId } = action.payload;
      
      if (state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = state.messagesByRoom[roomId].filter(
          m => !(m.isOptimistic && m.id === tempId)
        );
        console.log(`🗑️ Removed optimistic message ${tempId} from room ${roomId}`);
      }
    },
    
    // Message read status
    markRoomMessagesAsRead: (state, action) => {
      const roomId = action.payload;
      console.log(`👁️ Marking messages as read for room ${roomId}`);
      
      // Reset unread count for room
      const room = state.rooms.find(r => r.id === parseInt(roomId));
      if (room && room.unreadCount > 0) {
        state.totalUnreadCount -= room.unreadCount;
        room.unreadCount = 0;
        state.unreadCounts[roomId] = 0;
      }
      
      // Mark messages as read
      if (state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId].forEach(message => {
          if (!message.isRead && message.senderId !== state.currentUserId) {
            message.isRead = true;
          }
        });
      }
    },
    
    // Typing indicators
    setUserTyping: (state, action) => {
      const { roomId, userId, userName, isTyping } = action.payload;
      
      if (!state.typingUsers[roomId]) {
        state.typingUsers[roomId] = {};
      }
      
      if (isTyping) {
        state.typingUsers[roomId][userId] = {
          name: userName,
          timestamp: Date.now()
        };
      } else {
        delete state.typingUsers[roomId][userId];
      }
    },
    
    clearTypingUsers: (state, action) => {
      const roomId = action.payload;
      if (state.typingUsers[roomId]) {
        state.typingUsers[roomId] = {};
      }
    },
    
    // Clear old typing indicators
    clearOldTypingIndicators: (state) => {
      const now = Date.now();
      const timeout = 5000; // 5 seconds
      
      Object.keys(state.typingUsers).forEach(roomId => {
        Object.keys(state.typingUsers[roomId]).forEach(userId => {
          const typingData = state.typingUsers[roomId][userId];
          if (typeof typingData === 'object' && now - typingData.timestamp > timeout) {
            delete state.typingUsers[roomId][userId];
          }
        });
      });
    },
    
    // Online status
    setUserOnlineStatus: (state, action) => {
      const { userId, status, roomId } = action.payload;
      
      if (!state.onlineUsers[roomId]) {
        state.onlineUsers[roomId] = {};
      }
      
      if (status === 'online') {
        state.onlineUsers[roomId][userId] = {
          status: 'online',
          timestamp: Date.now()
        };
      } else {
        delete state.onlineUsers[roomId][userId];
      }
      
      // Update room data if it exists
      const room = state.rooms.find(r => r.id === parseInt(roomId));
      if (room && room.type === 'one-on-one') {
        const otherParticipant = room.otherParticipants?.[0];
        if (otherParticipant && otherParticipant.id === userId) {
          room.isOnline = status === 'online';
        }
      }
    },
    
    // User management
    setCurrentUserId: (state, action) => {
      console.log('👤 Setting current user ID:', action.payload);
      state.currentUserId = action.payload;
    },
    
    // Error handling
    clearError: (state, action) => {
      const { type, roomId } = action.payload || {};
      
      if (type === 'rooms') {
        state.errors.rooms = null;
      } else if (type === 'messages' && roomId) {
        delete state.errors.messages[roomId];
      } else if (type === 'sending' && roomId) {
        delete state.errors.sending[roomId];
      } else if (type === 'creating') {
        state.errors.creating = null;
      }
    },
    
    clearAllErrors: (state) => {
      state.errors = {
        rooms: null,
        messages: {},
        sending: {},
        creating: null
      };
    },
    
    // Reset chat state
    resetChatState: (state) => {
      console.log('🔄 Resetting chat state');
      return { ...initialState };
    },
    
    // Update room order (move to top when new message)
    updateRoomOrder: (state, action) => {
      const roomId = parseInt(action.payload);
      const roomIndex = state.rooms.findIndex(r => r.id === roomId);
      
      if (roomIndex > 0) {
        const room = state.rooms[roomIndex];
        state.rooms.splice(roomIndex, 1);
        state.rooms.unshift(room);
        console.log(`📊 Room ${roomId} moved to top`);
      }
    },
    
    // Update room info
    updateRoomInfo: (state, action) => {
      const { roomId, updates } = action.payload;
      const room = state.rooms.find(r => r.id === parseInt(roomId));
      
      if (room) {
        Object.assign(room, updates);
        console.log(`📝 Updated room ${roomId} info:`, updates);
      }
    },
    
    // Set last activity
    setLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },
    
    // Message pagination
    setMessagePagination: (state, action) => {
      const { roomId, pagination } = action.payload;
      state.messagePagination[roomId] = pagination;
    },
    
    // Load more messages (prepend to existing)
    prependMessages: (state, action) => {
      const { roomId, messages } = action.payload;
      
      if (!state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = [];
      }
      
      // Filter out duplicates and prepend
      const existingIds = new Set(state.messagesByRoom[roomId].map(m => m.id));
      const newMessages = messages.filter(m => !existingIds.has(m.id));
      
      state.messagesByRoom[roomId] = [...newMessages, ...state.messagesByRoom[roomId]];
      console.log(`📥 Prepended ${newMessages.length} messages to room ${roomId}`);
    }
  },
  
  extraReducers: (builder) => {
    // Fetch user rooms
    builder
      .addCase(fetchUserRooms.pending, (state) => {
        state.loading.rooms = true;
        state.errors.rooms = null;
      })
      .addCase(fetchUserRooms.fulfilled, (state, action) => {
        state.loading.rooms = false;
        
        if (action.payload?.data?.rooms) {
          state.rooms = action.payload.data.rooms.map(room => ({
            ...room,
            // Ensure unreadCount is a number
            unreadCount: parseInt(room.unreadCount) || 0,
            // Add online status for one-on-one chats
            isOnline: room.type === 'one-on-one' && room.otherParticipants?.[0] 
              ? state.onlineUsers[room.id]?.[room.otherParticipants[0].id]?.status === 'online'
              : false
          }));
          
          state.roomsPagination = action.payload.data.pagination || state.roomsPagination;
          
          // Calculate total unread count
          state.totalUnreadCount = state.rooms.reduce((total, room) => {
            const unreadCount = room.unreadCount || 0;
            state.unreadCounts[room.id] = unreadCount;
            return total + unreadCount;
          }, 0);
          
          console.log(`✅ ${state.rooms.length} rooms loaded, total unread: ${state.totalUnreadCount}`);
        } else {
          console.warn('⚠️ Invalid rooms data received:', action.payload);
        }
      })
      .addCase(fetchUserRooms.rejected, (state, action) => {
        state.loading.rooms = false;
        state.errors.rooms = action.payload;
        console.error('❌ Failed to fetch rooms:', action.payload);
      });
    
    // Create room
    builder
      .addCase(createRoom.pending, (state) => {
        state.loading.creating = true;
        state.errors.creating = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading.creating = false;
        
        if (action.payload?.data?.room) {
          const newRoom = {
            ...action.payload.data.room,
            unreadCount: 0,
            isOnline: false
          };
          
          // Add to beginning of rooms list
          state.rooms.unshift(newRoom);
          state.unreadCounts[newRoom.id] = 0;
          console.log(`✅ New room created: ${newRoom.id}`);
        }
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading.creating = false;
        state.errors.creating = action.payload;
        console.error('❌ Failed to create room:', action.payload);
      });
    
    // Fetch room messages
    builder
      .addCase(fetchRoomMessages.pending, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.messages[roomId] = true;
        if (state.errors.messages[roomId]) {
          delete state.errors.messages[roomId];
        }
      })
      .addCase(fetchRoomMessages.fulfilled, (state, action) => {
        const { roomId } = action.payload;
        state.loading.messages[roomId] = false;
        
        if (action.payload?.data?.messages) {
          const messages = action.payload.data.messages.map(message => ({
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            roomId: message.roomId || roomId,
            isRead: message.isRead || false,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            sender: message.sender || null
          }));
          
          // Store messages in chronological order (oldest first)
          state.messagesByRoom[roomId] = messages.reverse();
          state.messagePagination[roomId] = action.payload.data.pagination;
          
          console.log(`📝 Stored ${messages.length} messages for room ${roomId}`);
          
          // Mark as read
          chatSlice.caseReducers.markRoomMessagesAsRead(state, { payload: roomId });
        } else {
          console.warn('⚠️ Invalid messages data received for room', roomId);
          state.messagesByRoom[roomId] = [];
        }
      })
      .addCase(fetchRoomMessages.rejected, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.messages[roomId] = false;
        state.errors.messages[roomId] = action.payload;
        console.error(`❌ Failed to load messages for room ${roomId}:`, action.payload);
      });
    
    // Send message
    builder
      .addCase(sendMessage.pending, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.sending[roomId] = true;
        if (state.errors.sending[roomId]) {
          delete state.errors.sending[roomId];
        }
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { roomId } = action.payload;
        state.loading.sending[roomId] = false;
        
        if (action.payload?.data?.message) {
          const newMessage = action.payload.data.message;
          
          // Format message
          const formattedMessage = {
            id: newMessage.id,
            content: newMessage.content,
            senderId: newMessage.senderId,
            roomId: newMessage.roomId || roomId,
            isRead: newMessage.isRead || false,
            createdAt: newMessage.createdAt,
            updatedAt: newMessage.updatedAt,
            sender: newMessage.sender || null
          };
          
          // Remove any optimistic message for this content
          if (state.messagesByRoom[roomId]) {
            state.messagesByRoom[roomId] = state.messagesByRoom[roomId].filter(
              m => !(m.isOptimistic && m.content === formattedMessage.content)
            );
          }
          
          // Add the real message if it doesn't exist
          if (state.messagesByRoom[roomId]) {
            const exists = state.messagesByRoom[roomId].find(m => m.id === formattedMessage.id);
            if (!exists) {
              state.messagesByRoom[roomId].push(formattedMessage);
              console.log(`📝 Added API message to local state for room ${roomId}`);
            }
          }
          
          // Update room order
          chatSlice.caseReducers.updateRoomOrder(state, { payload: roomId });
          
          console.log(`✅ Message sent via API to room ${roomId}`);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.sending[roomId] = false;
        state.errors.sending[roomId] = action.payload;
        console.error(`❌ Failed to send message to room ${roomId}:`, action.payload);
        
        // Remove failed optimistic message
        if (state.messagesByRoom[roomId]) {
          state.messagesByRoom[roomId] = state.messagesByRoom[roomId].filter(
            m => !m.isOptimistic
          );
        }
      });
    
    // Join room
    builder
      .addCase(joinRoom.fulfilled, (state, action) => {
        if (action.payload?.data?.room) {
          state.activeRoom = action.payload.data.room;
          console.log(`✅ Joined room:`, action.payload.data.room);
        }
      })
      .addCase(joinRoom.rejected, (state, action) => {
        console.error('❌ Failed to join room:', action.payload);
      });
  }
});

export const {
  setConnectionStatus,
  setActiveRoom,
  clearActiveRoom,
  addMessage,
  addOptimisticMessage,
  removeOptimisticMessage,
  markRoomMessagesAsRead,
  setUserTyping,
  clearTypingUsers,
  clearOldTypingIndicators,
  setUserOnlineStatus,
  setCurrentUserId,
  clearError,
  clearAllErrors,
  resetChatState,
  updateRoomOrder,
  updateRoomInfo,
  setLastActivity,
  setMessagePagination,
  prependMessages
} = chatSlice.actions;

// Enhanced Selectors
export const selectRooms = (state) => state.chat.rooms;
export const selectActiveRoom = (state) => state.chat.activeRoom;
export const selectRoomMessages = (roomId) => (state) => state.chat.messagesByRoom[roomId] || [];
export const selectIsConnected = (state) => state.chat.isConnected;
export const selectTotalUnreadCount = (state) => state.chat.totalUnreadCount;
export const selectRoomUnreadCount = (roomId) => (state) => state.chat.unreadCounts[roomId] || 0;
export const selectTypingUsers = (roomId) => (state) => {
  const typingData = state.chat.typingUsers[roomId] || {};
  return Object.entries(typingData).map(([userId, data]) => ({
    userId,
    name: typeof data === 'object' ? data.name : data,
    timestamp: typeof data === 'object' ? data.timestamp : Date.now()
  }));
};
export const selectOnlineUsers = (roomId) => (state) => state.chat.onlineUsers[roomId] || {};
export const selectChatLoading = (state) => state.chat.loading;
export const selectChatErrors = (state) => state.chat.errors;
export const selectLastActivity = (state) => state.chat.lastActivity;
export const selectConnectionHistory = (state) => state.chat.connectionHistory;
export const selectMessagePagination = (roomId) => (state) => state.chat.messagePagination[roomId];

// Computed selectors
export const selectRoomById = (roomId) => (state) => 
  state.chat.rooms.find(room => room.id === parseInt(roomId));

export const selectIsUserTyping = (roomId, userId) => (state) => {
  const typingUsers = state.chat.typingUsers[roomId] || {};
  return !!typingUsers[userId];
};

export const selectIsUserOnline = (roomId, userId) => (state) => {
  const onlineUsers = state.chat.onlineUsers[roomId] || {};
  return !!onlineUsers[userId];
};

export const selectRoomsWithUnread = (state) => 
  state.chat.rooms.filter(room => (room.unreadCount || 0) > 0);

export const selectRecentRooms = (limit = 5) => (state) => 
  state.chat.rooms.slice(0, limit);

export default chatSlice.reducer;