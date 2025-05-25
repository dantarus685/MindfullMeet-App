import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Animated,
  Easing
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';
import TextInput from '../../components/common/TextInput';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../redux/authSlice';

const LoginScreen = () => {
  const { colors, typography, spacing } = useTheme();
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated } = useSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  // Create an animated value for the flip animation
  const flipAnimation = useRef(new Animated.Value(0)).current;
  
  // Create interpolated values for the rotation
  const flipRotation = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg']
  });
  
  // Create interpolated values for scaling during animation
  const flipScale = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1]
  });

  // Start the flip animation when isLoading changes
  useEffect(() => {
    if (isLoading) {
      // Reset and start continuous flipping animation
      Animated.loop(
        Animated.timing(flipAnimation, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      // Stop animation when loading stops
      flipAnimation.stopAnimation();
      // Reset to original position
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [isLoading]);

  // Clear previous errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
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
      
      // Use the new async thunk
      const result = await dispatch(loginUser({ email, password })).unwrap();
      
      console.log('Login successful:', result);
      
      // Navigation will be handled by the useEffect above
      // when isAuthenticated becomes true
      
    } catch (err) {
      console.error('Login error:', err);
      // Error is already handled by the async thunk and stored in Redux state
      // The useEffect above will show the alert
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
          {/* Animated logo with flip effect */}
          <Animated.View style={{
            transform: [
              { rotateY: flipRotation },
              { scale: flipScale }
            ]
          }}>
            <Image
              source={require('../../../assets/images/logo.png')} // Update with your actual logo path
              style={styles.logo}
            />
          </Animated.View>
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