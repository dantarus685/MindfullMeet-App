// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import profileReducer from './profileSlice';
import eventReducer from './eventSlice';
import rsvpReducer from './rsvpSlice';
import chatReducer from './chatSlice';

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

// Export helper functions for getting typed dispatch and state
export const getRootState = () => store.getState();
export const getAppDispatch = () => store.dispatch;

// For TypeScript projects (these won't affect JavaScript)
/** @typedef {ReturnType<typeof store.getState>} RootState */
/** @typedef {typeof store.dispatch} AppDispatch */