import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/theme';

const RsvpStatusBadge = ({ status }) => {
  const { colors, spacing } = useTheme();
  
  const getStatusColor = () => {
    switch (status) {
      case 'going':
        return colors.success;
      case 'interested':
        return colors.primary;
      case 'not-going':
        return colors.error;
      default:
        return colors.grey;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'going':
        return 'Going';
      case 'interested':
        return 'Interested';
      case 'not-going':
        return 'Not Going';
      default:
        return 'Unknown';
    }
  };
  
  const styles = StyleSheet.create({
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: getStatusColor(),
    },
    text: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '500',
    }
  });
  
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{getStatusText()}</Text>
    </View>
  );
};

export default RsvpStatusBadge;