// src/config/api.js - Updated with correct IP addresses
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure API URL based on platform and your actual network configuration
const determineBaseUrl = () => {
  if (Platform.OS === 'android') {
    // For Android emulator, use the special IP that maps to host's localhost
    return __DEV__ ? 'http://10.0.2.2:5000' : 'https://your-production-api.com';
  }
  
  // For iOS simulator and physical devices
  // Based on your ipconfig, try these IPs in order of preference:
  // 1. 192.168.56.1 (Ethernet adapter Ethernet)
  // 2. 192.168.42.28 (Ethernet adapter Ethernet 2) 
  // 3. localhost as fallback
  
  if (__DEV__) {
    // Try the most stable network adapter first
    return 'http://192.168.56.1:5000';
    
    // If the above doesn't work, uncomment one of these alternatives:
    // return 'http://192.168.42.28:5000';
    // return 'http://localhost:5000'; // Last resort for iOS simulator only
  }
  
  return 'https://your-production-api.com';
};

const API_URL = determineBaseUrl();

// Log the API URL for debugging
if (__DEV__) {
  console.log('🌐 API Base URL:', API_URL);
  console.log('📱 Platform:', Platform.OS);
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increased timeout for network stability
});

// Add a request interceptor to attach token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token applied to request:', token.substring(0, 15) + '...');
      } else {
        console.log('⚠️ No auth token found in storage');
      }
    } catch (error) {
      console.error('❌ Error applying auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and debugging
api.interceptors.response.use(
  response => {
    if (__DEV__) {
      console.log(`✅ API ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  error => {
    if (__DEV__) {
      if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
        console.error('🚫 Network connection failed - check if server is running and firewall settings');
        console.error('🔍 Attempted URL:', error.config?.baseURL || API_URL);
      } else if (error.response) {
        console.error(`❌ API ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}:`, error.response.data);
      } else {
        console.error('❌ API Error:', error.message);
      }
    }
    
    // Handle auth errors
    if (error.response && error.response.status === 401) {
      console.log('🔐 Unauthorized request - token may be expired');
      // You could trigger navigation to login here or refresh token
    }
    
    return Promise.reject(error);
  }
);

// Export a test function to check API connectivity
export const testApiConnectivity = async () => {
  try {
    console.log('🧪 Testing API connectivity to:', API_URL);
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connectivity test successful:', data);
      return { success: true, data };
    } else {
      console.log('❌ API connectivity test failed:', response.status);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log('❌ API connectivity test error:', error.message);
    return { success: false, error: error.message };
  }
};

export default api;
export { API_URL };