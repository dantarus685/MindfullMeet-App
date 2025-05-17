import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';
import TextInput from '../../components/common/TextInput';

const LoginScreen = () => {
  const { colors, typography, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              icon="lock-closed-outline"
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
        </View>
        
        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => console.log('Forgot password')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => console.log('Login pressed')}
        >
          <Text style={styles.buttonText}>Login</Text>
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