// src/redux/chatSlice.js - REPLACE THIS ENTIRE FILE
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
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch rooms'
      );
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
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create room'
      );
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
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch messages'
      );
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ roomId, content }, { rejectWithValue }) => {
    try {
      console.log(`🔄 Sending message via API to room ${roomId}:`, content);
      const response = await api.post(`/api/support/rooms/${roomId}/messages`, { content });
      console.log(`✅ Message sent via API:`, response.data);
      return { roomId, ...response.data };
    } catch (error) {
      console.error('❌ Send message error:', error);
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send message'
      );
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
      return rejectWithValue(
        error.response?.data?.message || 'Failed to join room'
      );
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
    sending: {}
  },
  
  // Error states
  error: {
    rooms: null,
    messages: {},
    sending: {}
  },
  
  // Socket connection status
  isConnected: false,
  
  // Current user ID
  currentUserId: null,
  
  // Notifications
  unreadCounts: {},
  totalUnreadCount: 0
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Socket connection management
    setConnectionStatus: (state, action) => {
      console.log('🔌 Connection status changed:', action.payload);
      state.isConnected = action.payload;
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
        state.messagesByRoom[roomId].push(message);
        console.log(`✅ Message added to room ${roomId}`);
        
        // Update room's last message in rooms list
        const room = state.rooms.find(r => r.id === roomId);
        if (room) {
          room.messages = [message];
          room.updatedAt = message.createdAt;
          
          // Update unread count if not current user's message and not active room
          if (message.senderId !== state.currentUserId && state.activeRoom?.id !== roomId) {
            room.unreadCount = (room.unreadCount || 0) + 1;
            state.unreadCounts[roomId] = room.unreadCount;
            state.totalUnreadCount += 1;
          }
        }
      } else {
        console.log(`⚠️ Message already exists in room ${roomId}, skipping`);
      }
    },
    
    // Message read status
    markRoomMessagesAsRead: (state, action) => {
      const roomId = action.payload;
      console.log(`👁️ Marking messages as read for room ${roomId}`);
      
      // Reset unread count for room
      const room = state.rooms.find(r => r.id === roomId);
      if (room && room.unreadCount > 0) {
        state.totalUnreadCount -= room.unreadCount;
        room.unreadCount = 0;
        state.unreadCounts[roomId] = 0;
      }
      
      // Mark messages as read
      if (state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId].forEach(message => {
          if (!message.isRead) {
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
        state.typingUsers[roomId][userId] = userName;
      } else {
        delete state.typingUsers[roomId][userId];
      }
    },
    
    clearTypingUsers: (state, action) => {
      const roomId = action.payload;
      state.typingUsers[roomId] = {};
    },
    
    // Online status
    setUserOnlineStatus: (state, action) => {
      const { userId, status, roomId } = action.payload;
      
      if (!state.onlineUsers[roomId]) {
        state.onlineUsers[roomId] = {};
      }
      
      if (status === 'online') {
        state.onlineUsers[roomId][userId] = true;
      } else {
        delete state.onlineUsers[roomId][userId];
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
        state.error.rooms = null;
      } else if (type === 'messages' && roomId) {
        delete state.error.messages[roomId];
      } else if (type === 'sending' && roomId) {
        delete state.error.sending[roomId];
      }
    },
    
    // Reset chat state
    resetChatState: (state) => {
      console.log('🔄 Resetting chat state');
      return { ...initialState };
    },
    
    // Update room order (move to top when new message)
    updateRoomOrder: (state, action) => {
      const roomId = action.payload;
      const roomIndex = state.rooms.findIndex(r => r.id === roomId);
      
      if (roomIndex > 0) {
        const room = state.rooms[roomIndex];
        state.rooms.splice(roomIndex, 1);
        state.rooms.unshift(room);
        console.log(`📊 Room ${roomId} moved to top`);
      }
    }
  },
  
  extraReducers: (builder) => {
    // Fetch user rooms
    builder
      .addCase(fetchUserRooms.pending, (state) => {
        state.loading.rooms = true;
        state.error.rooms = null;
      })
      .addCase(fetchUserRooms.fulfilled, (state, action) => {
        state.loading.rooms = false;
        state.rooms = action.payload.data.rooms;
        state.roomsPagination = action.payload.data.pagination;
        
        // Calculate total unread count
        state.totalUnreadCount = state.rooms.reduce((total, room) => {
          const unreadCount = room.unreadCount || 0;
          state.unreadCounts[room.id] = unreadCount;
          return total + unreadCount;
        }, 0);
        
        console.log(`✅ ${state.rooms.length} rooms loaded, total unread: ${state.totalUnreadCount}`);
      })
      .addCase(fetchUserRooms.rejected, (state, action) => {
        state.loading.rooms = false;
        state.error.rooms = action.payload;
      });
    
    // Create room
    builder
      .addCase(createRoom.pending, (state) => {
        state.loading.rooms = true;
        state.error.rooms = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading.rooms = false;
        const newRoom = action.payload.data.room;
        
        // Add to beginning of rooms list
        state.rooms.unshift(newRoom);
        state.unreadCounts[newRoom.id] = 0;
        console.log(`✅ New room created: ${newRoom.id}`);
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading.rooms = false;
        state.error.rooms = action.payload;
      });
    
    // Fetch room messages
    builder
      .addCase(fetchRoomMessages.pending, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.messages[roomId] = true;
        if (state.error.messages[roomId]) {
          delete state.error.messages[roomId];
        }
      })
      .addCase(fetchRoomMessages.fulfilled, (state, action) => {
        const { roomId } = action.payload;
        state.loading.messages[roomId] = false;
        
        console.log(`✅ Messages loaded for room ${roomId}:`, action.payload.data);
        
        // Store messages - ensure they're in chronological order (oldest first)
        const messages = action.payload.data.messages || [];
        // Most APIs return newest first, but we want oldest first for display
        state.messagesByRoom[roomId] = messages.reverse();
        state.messagePagination[roomId] = action.payload.data.pagination;
        
        console.log(`📝 Stored ${messages.length} messages for room ${roomId}`);
        
        // Mark as read
        chatSlice.caseReducers.markRoomMessagesAsRead(state, { payload: roomId });
      })
      .addCase(fetchRoomMessages.rejected, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.messages[roomId] = false;
        state.error.messages[roomId] = action.payload;
        console.error(`❌ Failed to load messages for room ${roomId}:`, action.payload);
      });
    
    // Send message
    builder
      .addCase(sendMessage.pending, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.sending[roomId] = true;
        if (state.error.sending[roomId]) {
          delete state.error.sending[roomId];
        }
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { roomId } = action.payload;
        state.loading.sending[roomId] = false;
        
        console.log(`✅ Message sent via API to room ${roomId}:`, action.payload.data);
        
        // Add the new message to the local state immediately
        const newMessage = action.payload.data.message;
        if (newMessage && state.messagesByRoom[roomId]) {
          // Check if message already exists (prevent duplicates)
          const exists = state.messagesByRoom[roomId].find(m => m.id === newMessage.id);
          if (!exists) {
            state.messagesByRoom[roomId].push(newMessage);
            console.log(`📝 Added new API message to local state for room ${roomId}`);
          }
        }
        
        // Update room order
        chatSlice.caseReducers.updateRoomOrder(state, { payload: roomId });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading.sending[roomId] = false;
        state.error.sending[roomId] = action.payload;
        console.error(`❌ Failed to send message to room ${roomId}:`, action.payload);
      });
    
    // Join room
    builder
      .addCase(joinRoom.fulfilled, (state, action) => {
        state.activeRoom = action.payload.data.room;
        console.log(`✅ Joined room:`, action.payload.data.room);
      });
  }
});

export const {
  setConnectionStatus,
  setActiveRoom,
  clearActiveRoom,
  addMessage,
  markRoomMessagesAsRead,
  setUserTyping,
  clearTypingUsers,
  setUserOnlineStatus,
  setCurrentUserId,
  clearError,
  resetChatState,
  updateRoomOrder
} = chatSlice.actions;

// Selectors
export const selectRooms = (state) => state.chat.rooms;
export const selectActiveRoom = (state) => state.chat.activeRoom;
export const selectRoomMessages = (roomId) => (state) => state.chat.messagesByRoom[roomId] || [];
export const selectIsConnected = (state) => state.chat.isConnected;
export const selectTotalUnreadCount = (state) => state.chat.totalUnreadCount;
export const selectRoomUnreadCount = (roomId) => (state) => state.chat.unreadCounts[roomId] || 0;
export const selectTypingUsers = (roomId) => (state) => state.chat.typingUsers[roomId] || {};
export const selectOnlineUsers = (roomId) => (state) => state.chat.onlineUsers[roomId] || {};
export const selectChatLoading = (state) => state.chat.loading;
export const selectChatErrors = (state) => state.chat.error;

export default chatSlice.reducer;