// src/config/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// Configure your API base URL - adjust this for your environment
// For development with Expo on mobile:
// - Using localhost won't work on physical devices
// - On iOS simulator: http://localhost:5000/api
// - On Android emulator: http://10.0.2.2:5000/api
// - For physical devices, use your computer's network IP: http://192.168.x.x:5000/api

// Determine proper API URL based on environment
const determineBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator runs in a virtual machine, so localhost refers to the VM, not your dev machine
    return __DEV__ ? 'http://10.0.2.2:5000/api' : 'https://your-production-api.com/api';
  }
  
  // iOS or web
  return __DEV__ ? 'http://localhost:5000/api' : 'https://your-production-api.com/api';
};

const API_URL = determineBaseUrl();

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000 // 10 seconds timeout
});

// Setup token loading from storage
export const setupAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error loading auth token', error);
    return false;
  }
};

// Add response interceptor for handling common errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Token expired/invalid
      if (error.response.status === 401) {
        // Clear local storage and redirect to login if needed
        AsyncStorage.removeItem('auth_token');
        AsyncStorage.removeItem('auth_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };