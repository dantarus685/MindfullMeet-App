// src/config/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure API URL based on platform
const determineBaseUrl = () => {
  if (Platform.OS === 'android') {
    return __DEV__ ? 'http://10.0.2.2:5000' : 'https://your-production-api.com';
  }
  return __DEV__ ? 'http://localhost:5000' : 'https://your-production-api.com';
};

const API_URL = determineBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// Add a request interceptor to attach token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Token applied to request:', token.substring(0, 15) + '...');
      } else {
        console.log('No auth token found in storage');
      }
    } catch (error) {
      console.error('Error applying auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle auth errors
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized request - redirect to login');
      // You could trigger navigation to login here
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };