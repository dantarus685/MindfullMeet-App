// src/redux/store.js - FINAL CORRECTED VERSION - Proper SocketService initialization
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import profileReducer from './profileSlice';
import eventReducer from './eventSlice';
import rsvpReducer from './rsvpSlice';
import chatReducer from './chatSlice';
import socketService from '../services/socketService';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    events: eventReducer,
    rsvp: rsvpReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore date objects in our state
        ignoredActionPaths: [
          'payload.startTime', 
          'payload.endTime',
          'payload.message.createdAt',
          'payload.message.updatedAt',
          'payload.createdAt',
          'payload.updatedAt',
          'payload.passwordChangedAt',
          'meta.arg', // Ignore async thunk arguments
        ],
        ignoredPaths: [
          // Auth
          'auth.user.createdAt',
          'auth.user.updatedAt',
          'auth.user.passwordChangedAt',
          
          // Events
          'events.currentEvent.startTime',
          'events.currentEvent.endTime',
          'events.events.*.startTime',
          'events.events.*.endTime',
          'events.currentEvent.createdAt',
          'events.currentEvent.updatedAt',
          'events.events.*.createdAt',
          'events.events.*.updatedAt',
          
          // Chat
          'chat.messagesByRoom.*.*.createdAt',
          'chat.messagesByRoom.*.*.updatedAt',
          'chat.rooms.*.updatedAt',
          'chat.rooms.*.createdAt',
          'chat.rooms.*.messages.*.createdAt',
          'chat.rooms.*.messages.*.updatedAt',
          'chat.activeRoom.createdAt',
          'chat.activeRoom.updatedAt',
          
          // Profile
          'profile.profile.createdAt',
          'profile.profile.updatedAt',
          'profile.profile.passwordChangedAt',
          'profile.users.*.createdAt',
          'profile.users.*.updatedAt',
          'profile.searchResults.*.createdAt',
          'profile.searchResults.*.updatedAt',
          'profile.userEvents.*.startTime',
          'profile.userEvents.*.endTime',
          'profile.userEvents.*.createdAt',
          'profile.userEvents.*.updatedAt'
        ]
      }
    }),
  devTools: process.env.NODE_ENV !== 'production'
});

// **FIXED: Import socket service AFTER store creation to avoid circular dependency**

// **FIXED: Set store reference in socket service**
socketService.setStore(store);

// **ENHANCED: More aggressive auth state monitoring for immediate socket connection**
let previousAuthState = null;
let initTimeout = null;
let connectionAttemptCount = 0;

const monitorAuthChanges = () => {
  const currentState = store.getState();
  const currentAuth = {
    user: currentState.auth?.user,
    token: currentState.auth?.token,
    isAuthenticated: currentState.auth?.isAuthenticated
  };

  const authChanged = JSON.stringify(currentAuth) !== JSON.stringify(previousAuthState);

  if (authChanged || !socketService.getConnectionStatus()) {
    console.log('🔄 Auth state changed or socket disconnected:', {
      authChanged,
      wasAuth: !!previousAuthState?.isAuthenticated,
      nowAuth: !!currentAuth.isAuthenticated,
      user: currentAuth.user?.name,
      hasToken: !!currentAuth.token,
      userId: currentAuth.user?.id,
      socketConnected: socketService.getConnectionStatus(),
      attemptCount: connectionAttemptCount
    });

    // Clear any pending initialization
    if (initTimeout) {
      clearTimeout(initTimeout);
    }

    // Immediate connection attempt for authenticated users
    if (currentAuth.isAuthenticated && currentAuth.user && currentAuth.token) {
      connectionAttemptCount++;
      
      // **IMMEDIATE**: Try to connect right away if not connected
      if (!socketService.getConnectionStatus()) {
        console.log('🚀 Store: Immediate socket auto-connect attempt...');
        socketService.forceAutoConnect().catch(error => {
          console.error('❌ Store: Immediate auto-connect failed:', error);
        });
      }
      
      // **BACKUP**: Also schedule a delayed attempt
      initTimeout = setTimeout(() => {
        if (currentAuth.isAuthenticated && currentAuth.user && currentAuth.token && !socketService.getConnectionStatus()) {
          console.log('🔄 Store: Backup socket auto-connect attempt...');
          socketService.forceAutoConnect().catch(error => {
            console.error('❌ Store: Backup auto-connect failed:', error);
          });
        }
      }, 1000);
      
    } else if (previousAuthState?.isAuthenticated && !currentAuth.isAuthenticated) {
      console.log('🔌 Store: User logged out, disconnecting socket...');
      socketService.disconnect();
      connectionAttemptCount = 0;
    }

    previousAuthState = { ...currentAuth };
  }
};

// Subscribe to store changes
console.log('🔗 Setting up auth state monitoring for socket service...');
store.subscribe(monitorAuthChanges);

// **FIXED: Initial check with proper delay**
setTimeout(() => {
  console.log('🚀 Performing initial socket auto-connect check...');
  monitorAuthChanges();
}, 2000);

// Export helper functions for getting typed dispatch and state
export const getRootState = () => store.getState();
export const getAppDispatch = () => store.dispatch;

// For TypeScript projects (these won't affect JavaScript)
/** @typedef {ReturnType<typeof store.getState>} RootState */
/** @typedef {typeof store.dispatch} AppDispatch */