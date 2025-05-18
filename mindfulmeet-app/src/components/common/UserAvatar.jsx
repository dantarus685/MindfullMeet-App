import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/theme';

const UserAvatar = ({ size = 40, image, name, userId }) => {
  const { colors } = useTheme();
  
  // Get initials from name
  const getInitials = () => {
    if (!name) return '?';
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };
  
  // Get background color based on userId (for consistent colors)
  const getBackgroundColor = () => {
    // Return default color if userId is missing or not a string
    if (!userId || typeof userId !== 'string') return colors.primary;
    
    const colorOptions = [
      colors.primary,
      colors.secondary || '#6200ee',  // fallback if no secondary color
      '#4CAF50',  // green
      '#F44336',  // red
      '#9C27B0',  // purple
      '#FF9800',  // orange
      '#03A9F4',  // light blue
      '#607D8B',  // blue grey
    ];
    
    // Use userId to determine color (simple hash)
    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colorOptions[hash % colorOptions.length];
  };
  
  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: getBackgroundColor(),
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    initials: {
      color: colors.white,
      fontSize: size * 0.4,
      fontWeight: 'bold',
    }
  });
  
  if (image) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: image }} style={styles.image} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.initials}>{getInitials()}</Text>
    </View>
  );
};

export default UserAvatar;