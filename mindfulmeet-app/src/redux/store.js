// src/redux/store.js
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
          'payload.updatedAt'
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