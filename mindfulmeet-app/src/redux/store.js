// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import eventReducer from './eventSlice';
import rsvpReducer from './rsvpSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventReducer,
    rsvp: rsvpReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore date objects in our state
        ignoredActionPaths: ['payload.startTime', 'payload.endTime'],
        ignoredPaths: [
          'events.currentEvent.startTime',
          'events.currentEvent.endTime',
          'events.events.*.startTime',
          'events.events.*.endTime'
        ]
      }
    })
});