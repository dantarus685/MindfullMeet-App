import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TextInput from '../../components/common/TextInput';
import { useTheme } from '../../constants/theme';

const SignupScreen = () => {
  const { colors, typography, spacing, effects } = useTheme();
  
  const isLoading = false;
  const error = null;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    bio: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

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
        } else if (value.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        } else {
          newErrors.password = '';
        }
        
        // Also validate confirm password if it has been entered
        if (formData.confirmPassword && formData.confirmPassword !== value) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else if (formData.confirmPassword) {
          newErrors.confirmPassword = '';
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          newErrors.confirmPassword = '';
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  const validateForm = () => {
    const touchedFields = {};
    
    // Mark all fields as touched
    Object.keys(formData).forEach(field => {
      touchedFields[field] = true;
      validateField(field, formData[field]);
    });
    
    setTouched(touchedFields);
    
    // Check if there are any errors
    return !Object.values(errors).some(error => error);
  };

  const handleSignup = () => {
    if (validateForm()) {
      // For now, just show alert and navigate to login
      Alert.alert(
        'Success!',
        'Account created successfully. Please log in.',
        [
          { 
            text: 'OK', 
            onPress: () => router.push('/auth/login') 
          }
        ]
      );
    } else {
      Alert.alert('Error', 'Please fix the errors in the form');
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
            <Image
              source={{ uri: 'https://via.placeholder.com/80' }}
              style={styles.logo}
            />
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
              error={errors.name}
              touched={touched.name}
              icon="person-outline"
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              onBlur={() => handleBlur('email')}
              error={errors.email}
              touched={touched.email}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              onBlur={() => handleBlur('password')}
              error={errors.password}
              touched={touched.password}
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
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              onBlur={() => handleBlur('confirmPassword')}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
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
          style={styles.button}
          onPress={handleSignup}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Text>
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