import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Animated,
  Easing
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import TextInput from '../../components/common/TextInput';
import { useTheme } from '../../constants/theme';
import { clearError } from '../../redux/authSlice';
import axios from 'axios';
import {API_URL} from '../../config/api'; // Import the configured api instance

const SignupScreen = () => {
  const { colors, typography, spacing, effects } = useTheme();
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    bio: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  // Start the flip animation when isSubmitting changes
  useEffect(() => {
    if (isSubmitting || isLoading) {
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
  }, [isSubmitting, isLoading]);

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

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    validateField(field, formData[field]);
  };

  const validateField = (field, value) => {
    let newErrors = { ...errors };
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Name is required';
        } else if (value.length < 2) {
          newErrors.name = 'Name must be at least 2 characters';
        } else {
          newErrors.name = '';
        }
        break;
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          newErrors.email = 'Please enter a valid email';
        } else {
          newErrors.email = '';
        }
        break;
        
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          newErrors.password = '';
        }
        
        // Also validate passwordConfirm if it has been entered
        if (formData.passwordConfirm && formData.passwordConfirm !== value) {
          newErrors.passwordConfirm = 'Password confirmation does not match password';
        } else if (formData.passwordConfirm) {
          newErrors.passwordConfirm = '';
        }
        break;
        
      case 'passwordConfirm':
        if (!value) {
          newErrors.passwordConfirm = 'Please confirm your password';
        } else if (value !== formData.password) {
          newErrors.passwordConfirm = 'Password confirmation does not match password';
        } else {
          newErrors.passwordConfirm = '';
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
    return !newErrors[field]; // Return true if valid, false if invalid
  };

  const validateForm = () => {
    const touchedFields = {};
    let isValid = true;
    
    // Mark all fields as touched
    Object.keys(formData).forEach(field => {
      if (field !== 'bio') { // Skip optional fields
        touchedFields[field] = true;
        const fieldIsValid = validateField(field, formData[field]);
        if (!fieldIsValid) isValid = false;
      }
    });
    
    setTouched(touchedFields);
    return isValid;
  };

  const handleSignup = async () => {
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        console.log('Sending signup request to:', `${API_URL}/api/auth/signup`);
        
        // Make API call to your actual backend
        const response = await axios.post(`${API_URL}/api/auth/signup`, formData);
        
        console.log('Signup successful:', response.data);
        setIsSubmitting(false);
        
        // Navigate to login screen
        router.replace('/auth/login');
        
        // Show success message
        Alert.alert('Success!', 'Account created successfully. Please log in.');
        
      } catch (err) {
        console.error('Signup error:', err);
        setIsSubmitting(false);
        
        // Handle different types of errors
        if (err.response) {
          console.log('Server response error data:', err.response.data);
          
          // Handle validation errors from your API
          const serverErrors = err.response.data.errors || err.response.data.error;
          
          if (Array.isArray(serverErrors)) {
            // Handle express-validator errors format
            const newErrors = {};
            
            serverErrors.forEach(error => {
              newErrors[error.param] = error.msg;
            });
            
            setErrors(newErrors);
            setTouched({
              name: true,
              email: true,
              password: true,
              passwordConfirm: true
            });
            
            Alert.alert('Validation Error', serverErrors[0]?.msg || 'Please check the form for errors');
          } else {
            // Handle generic error message
            Alert.alert('Error', 
              err.response.data.message || 
              err.response.data.error || 
              'Signup failed');
          }
        } else if (err.request) {
          // The request was made but no response was received
          Alert.alert('Network Error', 'Please check your connection');
        } else {
          // Something else happened while setting up the request
          Alert.alert('Error', err.message || 'An error occurred during signup');
        }
      }
    } else {
      Alert.alert('Form Error', 'Please fix the errors in the form');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    title: {
      fontSize: typography.fontSizes.xxl,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.fontSizes.md,
      color: colors.darkGrey,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    formContainer: {
      marginBottom: spacing.xl,
    },
    inputContainer: {
      marginBottom: spacing.md,
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordToggle: {
      position: 'absolute',
      right: 15,
      top: 15,
    },
    errorText: {
      color: colors.error,
      fontSize: typography.fontSizes.sm,
      marginTop: spacing.xs,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: effects.borderRadius.md,
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
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    footerText: {
      color: colors.darkGrey,
      fontSize: typography.fontSizes.md,
    },
    footerLink: {
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
      marginLeft: spacing.xs,
    },
    backButton: {
      position: 'absolute',
      top: spacing.lg,
      left: spacing.md,
      zIndex: 10,
    },
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.darkGrey} />
      </TouchableOpacity>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join MindfulMeet to connect with wellness events and supportive communities
          </Text>
        </View>
        
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              label="Full Name"
              placeholder="Enter your name"
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              onBlur={() => handleBlur('name')}
              error={touched.name && errors.name ? errors.name : null}
              icon="person-outline"
              autoCapitalize="words"
            />
            {touched.name && errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              onBlur={() => handleBlur('email')}
              error={touched.email && errors.email ? errors.email : null}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {touched.email && errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              onBlur={() => handleBlur('password')}
              error={touched.password && errors.password ? errors.password : null}
              secureTextEntry={!showPassword}
              icon="lock-closed-outline"
            />
            <TouchableOpacity 
              style={styles.passwordToggle} 
              onPress={togglePasswordVisibility}
            >
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={colors.grey} 
              />
            </TouchableOpacity>
            {touched.password && errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.passwordConfirm}
              onChangeText={(text) => handleChange('passwordConfirm', text)}
              onBlur={() => handleBlur('passwordConfirm')}
              error={touched.passwordConfirm && errors.passwordConfirm ? errors.passwordConfirm : null}
              secureTextEntry={!showConfirmPassword}
              icon="lock-closed-outline"
            />
            <TouchableOpacity 
              style={styles.passwordToggle} 
              onPress={toggleConfirmPasswordVisibility}
            >
              <Ionicons 
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={colors.grey} 
              />
            </TouchableOpacity>
            {touched.passwordConfirm && errors.passwordConfirm ? (
              <Text style={styles.errorText}>{errors.passwordConfirm}</Text>
            ) : null}
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Bio (Optional)"
              placeholder="Tell us a bit about yourself"
              value={formData.bio}
              onChangeText={(text) => handleChange('bio', text)}
              multiline
              numberOfLines={3}
              icon="person-circle-outline"
            />
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, (isSubmitting || isLoading) && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.footerLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignupScreen;