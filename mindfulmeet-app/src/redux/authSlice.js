// src/redux/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

// Login async thunk
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data?.error || 'Login failed'
      );
    }
  }
);

// Signup async thunk
export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/signup', userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data?.error || 'Signup failed'
      );
    }
  }
);

// Check for stored auth on app start
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔍 Checking stored authentication...');
      
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('auth_user');
      
      console.log('🔍 Found in storage:', { 
        hasToken: !!token, 
        hasUser: !!userString,
        tokenPreview: token ? token.substring(0, 20) + '...' : null
      });
      
      if (token && userString) {
        const user = JSON.parse(userString);
        
        // Set token in axios headers first
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('🔑 Token set in axios headers');
        
        // Verify token is still valid by making a request
        try {
          console.log('🔍 Verifying token with profile request...');
          const response = await api.get('/api/users/profile');
          console.log('✅ Token valid, user authenticated');
          return { user: response.data.data.user, token };
        } catch (error) {
          console.log('❌ Token invalid, clearing storage');
          // Token is invalid, clear storage
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('auth_user');
          delete api.defaults.headers.common['Authorization'];
          return null;
        }
      } else {
        console.log('ℹ️ No stored authentication found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
      return rejectWithValue('Failed to check authentication');
    }
  }
);

const initialState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Keep these for backward compatibility with existing code
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      
      // Store auth data
      AsyncStorage.setItem('auth_token', action.payload.token);
      AsyncStorage.setItem('auth_user', JSON.stringify(action.payload.user));
      
      // Set token in axios headers immediately
      api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      
      // Clear auth data
      AsyncStorage.removeItem('auth_token');
      AsyncStorage.removeItem('auth_user');
      
      // Clear auth header
      delete api.defaults.headers.common['Authorization'];
    },
    clearError: (state) => {
      state.error = null;
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        
        // Store auth data
        AsyncStorage.setItem('auth_token', action.payload.token);
        AsyncStorage.setItem('auth_user', JSON.stringify(action.payload.user));
        
        // Set token in axios headers
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Signup cases
      .addCase(signupUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        
        // Store auth data
        AsyncStorage.setItem('auth_token', action.payload.token);
        AsyncStorage.setItem('auth_user', JSON.stringify(action.payload.user));
        
        // Set token in axios headers
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Check auth cases
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
        }
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
        state.error = action.payload;
      });
  }
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout, 
  clearError, 
  setInitialized 
} = authSlice.actions;

export default authSlice.reducer;