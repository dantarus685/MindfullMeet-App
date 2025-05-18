// src/redux/rsvpSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../config/api';

// Async thunks for RSVP actions
export const rsvpToEvent = createAsyncThunk(
  'rsvp/rsvpToEvent',
  async ({ eventId, status }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/events/${eventId}/rsvp`, { status });
      return response.data.data.rsvp;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const checkInToEvent = createAsyncThunk(
  'rsvp/checkInToEvent',
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/events/${eventId}/checkin`);
      return response.data.data.rsvp;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const submitFeedback = createAsyncThunk(
  'rsvp/submitFeedback',
  async ({ eventId, rating, feedback }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/events/${eventId}/feedback`, {
        rating, feedback
      });
      return response.data.data.rsvp;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchEventRSVPs = createAsyncThunk(
  'rsvp/fetchEventRSVPs',
  async ({ eventId, status }, { rejectWithValue }) => {
    try {
      let url = `/api/events/${eventId}/rsvps`;
      if (status) {
        url += `?status=${status}`;
      }
      const response = await api.get(url);
      return {
        eventId,
        rsvps: response.data.data.rsvps
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Initial state
const initialState = {
  userRSVPs: {}, // Map of eventId to RSVP
  eventRSVPs: {}, // Map of eventId to array of RSVPs
  loading: false,
  error: null
};

// RSVP slice
const rsvpSlice = createSlice({
  name: 'rsvp',
  initialState,
  reducers: {
    clearRSVPErrors: (state) => {
      state.error = null;
    },
    resetRSVPState: () => initialState
  },
  extraReducers: (builder) => {
    builder
      // RSVP to event
      .addCase(rsvpToEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rsvpToEvent.fulfilled, (state, action) => {
        state.loading = false;
        // Store the RSVP in user's RSVPs
        state.userRSVPs[action.payload.eventId] = action.payload;
      })
      .addCase(rsvpToEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to RSVP to event';
      })
      
      // Check in to event
      .addCase(checkInToEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkInToEvent.fulfilled, (state, action) => {
        state.loading = false;
        // Update the RSVP in user's RSVPs
        state.userRSVPs[action.payload.eventId] = action.payload;
      })
      .addCase(checkInToEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to check in to event';
      })
      
      // Submit feedback
      .addCase(submitFeedback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitFeedback.fulfilled, (state, action) => {
        state.loading = false;
        // Update the RSVP in user's RSVPs
        state.userRSVPs[action.payload.eventId] = action.payload;
      })
      .addCase(submitFeedback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to submit feedback';
      })
      
      // Fetch event RSVPs
      .addCase(fetchEventRSVPs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventRSVPs.fulfilled, (state, action) => {
        state.loading = false;
        // Store RSVPs for the event
        state.eventRSVPs[action.payload.eventId] = action.payload.rsvps;
      })
      .addCase(fetchEventRSVPs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch event RSVPs';
      });
  }
});

export const { clearRSVPErrors, resetRSVPState } = rsvpSlice.actions;
export default rsvpSlice.reducer;