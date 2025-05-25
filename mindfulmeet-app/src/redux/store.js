// src/redux/store.js (Keep as .js, add TS exports)
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import eventReducer from './eventSlice';
import rsvpReducer from './rsvpSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
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
          'meta.arg', // Ignore async thunk arguments
        ],
        ignoredPaths: [
          'events.currentEvent.startTime',
          'events.currentEvent.endTime',
          'events.events.*.startTime',
          'events.events.*.endTime',
          'chat.messagesByRoom.*.*.createdAt',
          'chat.messagesByRoom.*.*.updatedAt',
          'chat.rooms.*.updatedAt',
          'chat.rooms.*.createdAt',
          'chat.rooms.*.messages.*.createdAt',
          'chat.rooms.*.messages.*.updatedAt',
          'chat.activeRoom.createdAt',
          'chat.activeRoom.updatedAt'
        ]
      }
    })
});

// Export types for TypeScript compatibility
export const getRootState = () => store.getState();
export const getAppDispatch = () => store.dispatch;

// For TypeScript projects (these won't affect JavaScript)
/** @typedef {ReturnType<typeof store.getState>} RootState */
/** @typedef {typeof store.dispatch} AppDispatch */