// src/redux/profileSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../config/api';

// Async thunks for API calls using the configured api instance

// Get user profile
export const getUserProfile = createAsyncThunk(
  'profile/getUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Fetching profile...');
      
      const response = await api.get('/api/users/profile');
      
      console.log('✅ Profile fetched successfully:', response.data);
      return response.data.data.user;
    } catch (error) {
      console.error('❌ Profile fetch error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to fetch profile';
      return rejectWithValue(message);
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'profile/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      console.log('🔄 Updating profile with data:', profileData);
      
      const response = await api.patch('/api/users/profile', profileData);
      
      console.log('✅ Profile updated successfully:', response.data);
      return response.data.data.user;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      return rejectWithValue(message);
    }
  }
);

// Get user events
export const getUserEvents = createAsyncThunk(
  'profile/getUserEvents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/users/events');
      
      console.log('✅ User events fetched successfully:', response.data);
      return response.data.data || [];
    } catch (error) {
      console.error('❌ User events fetch error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to fetch user events';
      return rejectWithValue(message);
    }
  }
);

// Search users
export const searchUsers = createAsyncThunk(
  'profile/searchUsers',
  async ({ search = '', limit = 20, page = 1 }, { rejectWithValue }) => {
    try {
      const params = {
        search,
        limit: limit.toString(),
        page: page.toString(),
      };

      const response = await api.get('/api/users', { params });
      
      console.log('✅ Users search completed:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ Users search error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to search users';
      return rejectWithValue(message);
    }
  }
);

// Initial state
const initialState = {
  // Profile data
  profile: null,
  isProfileInitialized: false,
  
  // User events
  userEvents: [],
  
  // Users search
  searchResults: [],
  searchPagination: null,
  
  // Loading states
  isLoading: false,
  isUpdating: false,
  isLoadingEvents: false,
  isSearching: false,
  
  // Error states
  error: null,
  updateError: null,
  eventsError: null,
  searchError: null,
};

// Profile slice
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    // Clear profile data
    clearProfile: (state) => {
      state.profile = null;
      state.isProfileInitialized = false;
      state.userEvents = [];
      state.searchResults = [];
      state.searchPagination = null;
      state.error = null;
      state.updateError = null;
      state.eventsError = null;
      state.searchError = null;
    },
    
    // Clear errors
    clearErrors: (state) => {
      state.error = null;
      state.updateError = null;
      state.eventsError = null;
      state.searchError = null;
    },
    
    // Clear search results
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchPagination = null;
      state.searchError = null;
    },
    
    // Update local profile (for optimistic updates)
    updateLocalProfile: (state, action) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get user profile
      .addCase(getUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.isProfileInitialized = true;
        state.error = null;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isProfileInitialized = true; // Still mark as initialized even on error
      })
      
      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.profile = action.payload;
        state.updateError = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload;
      })
      
      // Get user events
      .addCase(getUserEvents.pending, (state) => {
        state.isLoadingEvents = true;
        state.eventsError = null;
      })
      .addCase(getUserEvents.fulfilled, (state, action) => {
        state.isLoadingEvents = false;
        state.userEvents = action.payload;
        state.eventsError = null;
      })
      .addCase(getUserEvents.rejected, (state, action) => {
        state.isLoadingEvents = false;
        state.eventsError = action.payload;
      })
      
      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.isSearching = true;
        state.searchError = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload.users || [];
        state.searchPagination = action.payload.pagination || null;
        state.searchError = null;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.isSearching = false;
        state.searchError = action.payload;
      });
  },
});

// Export actions
export const { 
  clearProfile, 
  clearErrors, 
  clearSearchResults, 
  updateLocalProfile 
} = profileSlice.actions;

// Selectors
export const selectProfile = (state) => state.profile.profile;
export const selectIsProfileInitialized = (state) => state.profile.isProfileInitialized;
export const selectUserEvents = (state) => state.profile.userEvents;
export const selectSearchResults = (state) => state.profile.searchResults;
export const selectSearchPagination = (state) => state.profile.searchPagination;

export const selectProfileLoading = (state) => state.profile.isLoading;
export const selectProfileUpdating = (state) => state.profile.isUpdating;
export const selectEventsLoading = (state) => state.profile.isLoadingEvents;
export const selectSearchLoading = (state) => state.profile.isSearching;

export const selectProfileErrors = (state) => ({
  profile: state.profile.error,
  update: state.profile.updateError,
  events: state.profile.eventsError,
  search: state.profile.searchError,
});

// Export reducer
export default profileSlice.reducer;