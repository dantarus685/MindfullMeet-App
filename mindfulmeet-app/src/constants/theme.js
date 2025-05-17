import React, { createContext, useContext } from 'react';

// Calming color palette for mental wellness app
export const colors = {
  // Primary colors
  primary: '#5B8E7D', // Sage green - calming, represents growth
  secondary: '#8FC1B5', // Lighter green - supportive

  // Accent colors
  accent1: '#F4B9B2', // Soft pink - warmth and compassion
  accent2: '#C8D5B9', // Light green - freshness and hope
  accent3: '#8BBBD9', // Soft blue - tranquility and peace

  // Functional colors
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F8BBD0', // Soft pink for gentler error indication
  info: '#81D4FA',

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F9F8F8',
  lightGrey: '#E8ECEF',
  grey: '#A0A9B2',
  darkGrey: '#5C6670',
  black: '#333333', // Soft black for less harshness

  // Background
  background: '#F9F8F8',
  card: '#FFFFFF',
  modalBackground: 'rgba(0, 0, 0, 0.4)',
};

// Typography
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

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Borders and shadows
export const effects = {
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 999,
  },
  shadows: {
    light: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// Create theme context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const theme = {
    colors,
    typography,
    spacing,
    effects,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);