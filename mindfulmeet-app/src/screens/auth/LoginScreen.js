import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';
import TextInput from '../../components/common/TextInput';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure, clearError } from '../../redux/authSlice';
import api, { API_URL } from '../../config/api'; // Import the configured api instance
import AsyncStorage from '@react-native-async-storage/async-storage'; // For token storage
import axios from 'axios';

// Configure your API base URL

const LoginScreen = () => {
  const { colors, typography, spacing } = useTheme();
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated } = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Clear previous errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  // Show alert when error changes
  useEffect(() => {
    if (error) {
      Alert.alert('Login Failed', error);
    }
  }, [error]);

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

const handleLogin = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    console.log('Starting login process...');
    dispatch(loginStart());
    
    // Make the actual API call
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    });
    
    console.log('Login API response:', response.data);
    
    // API success - dispatch loginSuccess with the response data
    const userData = {
      user: response.data.user,
      token: response.data.token
    };
    
    // Store the token for future API calls
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    
    // Save to AsyncStorage for persistence (you should add this)
    // await AsyncStorage.setItem('auth_token', userData.token);
    // await AsyncStorage.setItem('auth_user', JSON.stringify(userData.user));
    
    dispatch(loginSuccess(userData));
    console.log('Login success dispatched');
    
    // Navigate to home immediately (no need for timeout)
    router.navigate('/(tabs)');
    
  } catch (err) {
    console.error('Login error:', err);
    
    // Handle different types of errors
    if (err.response) {
      // The request was made and the server responded with a status code outside of 2xx
      const errorMessage = err.response.data.error || 
                           err.response.data.message || 
                           'Invalid credentials';
      dispatch(loginFailure(errorMessage));
    } else if (err.request) {
      // The request was made but no response was received
      dispatch(loginFailure('Network error. Please check your connection.'));
    } else {
      // Something happened in setting up the request
      dispatch(loginFailure(err.message || 'Login failed'));
    }
  }
};

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    backButton: {
      position: 'absolute',
      top: spacing.lg,
      left: spacing.md,
      zIndex: 10,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logo: {
      width: 100,
      height: 100,
      resizeMode: 'contain',
    },
    title: {
      fontSize: typography.fontSizes.xxl,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.fontSizes.md,
      color: colors.darkGrey,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      top: 14,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: spacing.lg,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: typography.fontSizes.sm,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    buttonDisabled: {
      backgroundColor: colors.grey,
    },
    buttonText: {
      color: colors.white,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.lg,
    },
    signupText: {
      color: colors.darkGrey,
      fontSize: typography.fontSizes.md,
    },
    signupLink: {
      color: colors.primary,
      fontWeight: typography.fontWeights.bold,
      marginLeft: spacing.xs,
    },
    errorText: {
      color: colors.error,
      fontSize: typography.fontSizes.sm,
      marginTop: 5,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.darkGrey} />
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://via.placeholder.com/100' }}
            style={styles.logo}
          />
        </View>
        
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to continue to MindfulMeet</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (formErrors.email) {
                setFormErrors({...formErrors, email: ''});
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
            error={formErrors.email}
          />
          {formErrors.email ? (
            <Text style={styles.errorText}>{formErrors.email}</Text>
          ) : null}
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (formErrors.password) {
                  setFormErrors({...formErrors, password: ''});
                }
              }}
              secureTextEntry={!showPassword}
              icon="lock-closed-outline"
              error={formErrors.password}
            />
            <TouchableOpacity 
              style={styles.passwordToggle} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.grey}
              />
            </TouchableOpacity>
          </View>
          {formErrors.password ? (
            <Text style={styles.errorText}>{formErrors.password}</Text>
          ) : null}
        </View>
        
        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => console.log('Forgot password')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/auth/signup")}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;