// src/components/chat/TypingIndicator.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../constants/theme';

const TypingIndicator = ({ typingUsers = {}, roomId }) => {
  const { colors, spacing } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    typingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.lightGrey,
      borderRadius: 15,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignSelf: 'flex-start',
    },
    typingText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontStyle: 'italic',
    },
    dots: {
      marginLeft: spacing.xs,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textSecondary,
      marginHorizontal: 1,
    }
  });

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    if (Object.keys(typingUsers).length > 0) {
      animate();
    }
  }, [typingUsers, animatedValue]);

  if (Object.keys(typingUsers).length === 0) {
    return null;
  }

  const typingUserNames = Object.values(typingUsers);
  const typingText = typingUserNames.length === 1 
    ? `${typingUserNames[0]} is typing`
    : `${typingUserNames.slice(0, -1).join(', ')} and ${typingUserNames[typingUserNames.length - 1]} are typing`;

  return (
    <View style={styles.container}>
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>
          {typingText}
        </Text>
        <View style={styles.dots}>
          <Animated.View 
            style={[
              styles.dot, 
              { 
                opacity: animatedValue,
                transform: [{ 
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2]
                  })
                }]
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

export default TypingIndicator;