// src/redux/eventSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../config/api';

// Async thunks for API calls
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async ({ page = 1, limit = 10, eventType, searchTerm }, { rejectWithValue }) => {
    try {
      let url = `/api/events?page=${page}&limit=${limit}`;
      
      if (eventType && eventType !== 'all') {
        url += `&eventType=${eventType}`;
      }
      
      if (searchTerm) {
        url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/events/${eventId}`);
      return response.data.data.event;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/events', eventData);
      return response.data.data.event;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ id, eventData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/events/${id}`, eventData);
      return response.data.data.event;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/events/${eventId}`);
      return eventId;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchUserEvents = createAsyncThunk(
  'events/fetchUserEvents',
  async ({ page = 1, limit = 10, status }, { rejectWithValue }) => {
    try {
      let url = `/api/events/my/events?page=${page}&limit=${limit}`;
      
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchEventsByCategory = createAsyncThunk(
  'events/fetchEventsByCategory',
  async ({ category, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/api/events/category/${category}?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Initial state
const initialState = {
  events: [],
  currentEvent: null,
  userEvents: [],
  categoryEvents: {},
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  },
  userEventsPagination: {
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  }
};

// Event slice
const eventSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearEventErrors: (state) => {
      state.error = null;
    },
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },
    resetEventState: () => initialState
  },
  extraReducers: (builder) => {
    builder
      // Fetch events
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        // If it's page 1, replace all events, otherwise append
        if (action.meta.arg.page === 1) {
          state.events = action.payload.data.events;
        } else {
          // Append new events, filtering out duplicates
          const existingIds = new Set(state.events.map(event => event.id));
          const newEvents = action.payload.data.events.filter(event => !existingIds.has(event.id));
          state.events = [...state.events, ...newEvents];
        }
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          hasMore: action.payload.currentPage < action.payload.totalPages
        };
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch events';
      })
      
      // Fetch single event
      .addCase(fetchEventById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEvent = action.payload;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch event';
      })
      
      // Create event
      .addCase(createEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events.unshift(action.payload);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to create event';
      })
      
      // Update event
      .addCase(updateEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.loading = false;
        // Update in events array
        const index = state.events.findIndex(event => event.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        // Update currentEvent if it's the same
        if (state.currentEvent && state.currentEvent.id === action.payload.id) {
          state.currentEvent = action.payload;
        }
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to update event';
      })
      
      // Delete event
      .addCase(deleteEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events = state.events.filter(event => event.id !== action.payload);
        if (state.currentEvent && state.currentEvent.id === action.payload) {
          state.currentEvent = null;
        }
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to delete event';
      })
      
      // Fetch user events
      .addCase(fetchUserEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserEvents.fulfilled, (state, action) => {
        state.loading = false;
        if (action.meta.arg.page === 1) {
          state.userEvents = action.payload.data.events;
        } else {
          const existingIds = new Set(state.userEvents.map(event => event.id));
          const newEvents = action.payload.data.events.filter(event => !existingIds.has(event.id));
          state.userEvents = [...state.userEvents, ...newEvents];
        }
        state.userEventsPagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          hasMore: action.payload.currentPage < action.payload.totalPages
        };
      })
      .addCase(fetchUserEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch your events';
      })
      
      // Fetch events by category
      .addCase(fetchEventsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        const category = action.meta.arg.category;
        
        // Initialize category if not exists
        if (!state.categoryEvents[category]) {
          state.categoryEvents[category] = {
            events: [],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              hasMore: false
            }
          };
        }
        
        // If page 1, replace events, otherwise append
        if (action.meta.arg.page === 1) {
          state.categoryEvents[category].events = action.payload.data.events;
        } else {
          const existingIds = new Set(state.categoryEvents[category].events.map(event => event.id));
          const newEvents = action.payload.data.events.filter(event => !existingIds.has(event.id));
          state.categoryEvents[category].events = [
            ...state.categoryEvents[category].events,
            ...newEvents
          ];
        }
        
        state.categoryEvents[category].pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          hasMore: action.payload.currentPage < action.payload.totalPages
        };
      })
      .addCase(fetchEventsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch category events';
      });
  }
});

export const { clearEventErrors, clearCurrentEvent, resetEventState } = eventSlice.actions;
export default eventSlice.reducer;