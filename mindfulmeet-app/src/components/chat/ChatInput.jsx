// src/components/chat/ChatInput.jsx
import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';

const ChatInput = ({ 
  onSendMessage, 
  onTyping, 
  placeholder = "Type a message...",
  disabled = false 
}) => {
  const { colors, spacing } = useTheme();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.lightGrey,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.lightGrey,
      borderRadius: 25,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
      minHeight: 50,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      maxHeight: 100,
      minHeight: Platform.OS === 'ios' ? 20 : 35,
      textAlignVertical: 'center',
      paddingVertical: Platform.OS === 'ios' ? 8 : 0,
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    sendButtonDisabled: {
      backgroundColor: colors.textSecondary,
    }
  });

  const handleTextChange = (text) => {
    setMessage(text);
    
    // Handle typing indicators
    if (onTyping) {
      if (!isTyping && text.length > 0) {
        setIsTyping(true);
        onTyping(true);
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          onTyping(false);
        }
      }, 1000);
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && onSendMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Stop typing indicator
      if (isTyping && onTyping) {
        setIsTyping(false);
        onTyping(false);
      }
      
      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={message}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="center"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!disabled}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              !canSend && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={colors.white} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatInput;