// src/components/chat/ChatBubble.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/theme';
import UserAvatar from '../common/UserAvatar';

const ChatBubble = ({ message, isCurrentUser, showAvatar = true }) => {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: isCurrentUser ? 'row-reverse' : 'row',
      marginVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      alignItems: 'flex-end',
    },
    avatarContainer: {
      marginHorizontal: spacing.xs,
    },
    bubbleContainer: {
      maxWidth: '75%',
      minWidth: '20%',
    },
    bubble: {
      backgroundColor: isCurrentUser ? colors.primary : colors.lightGrey,
      borderRadius: 18,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomRightRadius: isCurrentUser ? 4 : 18,
      borderBottomLeftRadius: isCurrentUser ? 18 : 4,
    },
    messageText: {
      color: isCurrentUser ? colors.white : colors.text,
      fontSize: 16,
      lineHeight: 20,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    timeText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    readStatus: {
      color: isCurrentUser ? colors.primary : colors.textSecondary,
      fontSize: 12,
      marginLeft: spacing.xs,
    }
  });

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {!isCurrentUser && showAvatar && (
        <View style={styles.avatarContainer}>
          <UserAvatar 
            user={message.sender} 
            size={32}
          />
        </View>
      )}
      
      <View style={styles.bubbleContainer}>
        <View style={styles.bubble}>
          <Text style={styles.messageText}>
            {message.content}
          </Text>
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(message.createdAt)}
          </Text>
          {isCurrentUser && (
            <Text style={styles.readStatus}>
              {message.isRead ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
      
      {isCurrentUser && showAvatar && (
        <View style={styles.avatarContainer}>
          <UserAvatar 
            user={message.sender} 
            size={32}
          />
        </View>
      )}
    </View>
  );
};

export default ChatBubble;