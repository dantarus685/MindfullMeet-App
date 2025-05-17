import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../constants/theme';

const WelcomeScreen = ({ navigation }) => {
  const { colors, typography, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 150,
      height: 150,
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: typography.fontSizes.xxxl,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.fontSizes.lg,
      color: colors.darkGrey,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      width: '100%',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    buttonText: {
      color: colors.white,
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.medium,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    secondaryButtonText: {
      color: colors.primary,
    },
  });

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://via.placeholder.com/150' }}
        style={styles.logo}
      />
      <Text style={styles.title}>MindfulMeet</Text>
      <Text style={styles.subtitle}>
        Connect with mental health resources and supportive communities
      </Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate('Signup')}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WelcomeScreen;