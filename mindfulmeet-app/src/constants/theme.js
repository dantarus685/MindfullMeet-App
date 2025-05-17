// src/constants/theme.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme color palettes
const lightColors = {
  // Primary colors
  primary: '#5B8E7D',
  secondary: '#8FC1B5',

  // Accent colors
  accent1: '#F4B9B2',
  accent2: '#C8D5B9',
  accent3: '#8BBBD9',

  text: '#333333',        // Primary text
  textSecondary: '#5C6670', // Secondary text
  // Functional colors
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F8BBD0',
  info: '#81D4FA',

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F9F8F8',
  lightGrey: '#E8ECEF',
  grey: '#A0A9B2',
  darkGrey: '#5C6670',
  black: '#333333',

  // Background
  background: '#F9F8F8',
  card: '#FFFFFF',
  modalBackground: 'rgba(0, 0, 0, 0.4)',
};

const darkColors = {
  // Primary colors - maintain brand colors but slightly adjusted for dark mode
  primary: '#6FA691',
  secondary: '#8FC1B5',

  // Accent colors - made slightly brighter for dark backgrounds
  accent1: '#F6C1BA',
  accent2: '#D0DEC2',
  accent3: '#9BC5E1',

  // Functional colors
  success: '#5EBC60',
  warning: '#FFC940',
  error: '#F8BBD0',
  info: '#8DD0FF',
  text: '#F9F8F8',        // Primary text
  textSecondary: '#B0B8BF', // Secondary text

  // Neutrals - inverted for dark mode
  white: '#333333',
  offWhite: '#242424',
  lightGrey: '#3A3A3A',
  grey: '#7A8288',
  darkGrey: '#B0B8BF',
  black: '#F9F8F8',

  // Background
  background: '#121212',
  card: '#1E1E1E',
  modalBackground: 'rgba(0, 0, 0, 0.7)',
};

// Typography stays the same in both themes
export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeights: {
    light: '300',
    regular: '400',
    medium: '500',
    bold: '700',
  },
};

// Spacing stays the same in both themes
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Borders and shadows
const lightEffects = {
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 999,
  },
  shadows: {
    light: {
      shadowColor: '#333333',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#333333',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

const darkEffects = {
  ...lightEffects,
  shadows: {
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// Theme context
const ThemeContext = createContext();
const THEME_PREFERENCE_KEY = 'mindfulmeet_theme_preference';

export const ThemeProvider = ({ children }) => {
  // Get system color scheme
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  
  // Determine the actual theme based on preferences
  const activeTheme = themeMode === 'system' 
    ? systemColorScheme || 'light' 
    : themeMode;
  
  const colors = activeTheme === 'dark' ? darkColors : lightColors;
  const effects = activeTheme === 'dark' ? darkEffects : lightEffects;

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Toggle theme function
  const toggleTheme = async () => {
    const newThemeMode = activeTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(newThemeMode);
    
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, newThemeMode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };
  
  // Set specific theme mode
  const setTheme = async (mode) => {
    setThemeMode(mode);
    
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, mode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const theme = {
    colors,
    typography,
    spacing,
    effects,
    isDark: activeTheme === 'dark',
    themeMode,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);