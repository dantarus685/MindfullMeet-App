// app/chat/[id].jsx - REPLACE THIS ENTIRE FILE
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../../src/constants/theme';
import {
  fetchRoomMessages,
  sendMessage,
  selectRoomMessages,
  selectChatLoading,
  selectChatErrors,
  markRoomMessagesAsRead,
  selectIsConnected,
  setActiveRoom,
  clearActiveRoom
} from '../../src/redux/chatSlice';
import socketService from '../../src/services/socketService';

const MessageBubble = ({ message, isCurrentUser }) => {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: isCurrentUser ? 'row-reverse' : 'row',
      marginVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      alignItems: 'flex-end',
    },
    bubble: {
      backgroundColor: isCurrentUser ? colors.primary : colors.lightGrey,
      borderRadius: 18,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      maxWidth: '75%',
      borderBottomRightRadius: isCurrentUser ? 4 : 18,
      borderBottomLeftRadius: isCurrentUser ? 18 : 4,
    },
    messageText: {
      color: isCurrentUser ? colors.white : colors.text,
      fontSize: 16,
    },
    timeText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
      textAlign: isCurrentUser ? 'right' : 'left',
    }
  });

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.messageText}>{message.content}</Text>
        <Text style={styles.timeText}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
};

const SimpleChatInput = ({ onSendMessage, onTyping, disabled = false }) => {
  const { colors, spacing } = useTheme();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
      alignItems: 'center',
      backgroundColor: colors.lightGrey,
      borderRadius: 25,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      minHeight: 40,
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
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      onTyping && onTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping && onTyping(false);
    }, 1000);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && onSendMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      if (isTyping) {
        setIsTyping(false);
        onTyping && onTyping(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={handleTextChange}
          placeholder={disabled ? "Connecting..." : "Type a message..."}
          placeholderTextColor={colors.textSecondary}
          multiline
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
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
  );
};

export default function ChatRoomScreen() {
  const { colors, spacing, isDark } = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const roomId = parseInt(params.id);
  const roomName = params.name || 'Chat';
  
  const messages = useSelector(selectRoomMessages(roomId));
  const loading = useSelector(selectChatLoading);
  const errors = useSelector(selectChatErrors);
  const currentUser = useSelector(state => state.auth.user);
  const isConnected = useSelector(selectIsConnected);
  
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
      backgroundColor: colors.background,
    },
    backButton: {
      padding: spacing.sm,
      marginRight: spacing.sm,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    connectionIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: spacing.sm,
    },
    messagesContainer: {
      flex: 1,
    },
    messagesList: {
      paddingVertical: spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    errorContainer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    errorText: {
      color: colors.error || '#F44336',
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.white,
      fontWeight: 'bold',
    }
  });

  // DEFINE loadMessages FIRST
  const loadMessages = useCallback(async () => {
    try {
      console.log('📥 Loading messages for room:', roomId);
      await dispatch(fetchRoomMessages({ roomId, page: 1, limit: 50 })).unwrap();
    } catch (error) {
      console.error('Failed to load messages:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    }
  }, [dispatch, roomId]);

  // Setup room and join socket room
  useEffect(() => {
    if (roomId && currentUser) {
      console.log('🔄 Setting up chat room:', roomId);
      
      dispatch(setActiveRoom({ id: roomId, name: roomName }));
      loadMessages();
      dispatch(markRoomMessagesAsRead(roomId));
      
      if (socketService.getConnectionStatus()) {
        console.log('🚪 Joining socket room:', roomId);
        socketService.joinRoom(roomId);
      }
    }
    
    return () => {
      console.log('🧹 Cleaning up chat room:', roomId);
      if (socketService.getConnectionStatus()) {
        socketService.leaveRoom(roomId);
      }
      dispatch(clearActiveRoom());
    };
  }, [roomId, currentUser, roomName, dispatch, loadMessages]);

  useEffect(() => {
    if (isConnected && roomId && socketService.getConnectionStatus()) {
      console.log('🔌 Socket connected, joining room:', roomId);
      socketService.joinRoom(roomId);
    }
  }, [isConnected, roomId]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      console.log('📤 Sending message:', content);
      
      if (isConnected && socketService.getConnectionStatus()) {
        console.log('🚀 Sending via socket...');
        const success = socketService.sendMessage(roomId, content);
        
        if (!success) {
          console.log('❌ Socket send failed, using API...');
          await dispatch(sendMessage({ roomId, content })).unwrap();
        }
      } else {
        console.log('🔄 Socket not connected, using API...');
        await dispatch(sendMessage({ roomId, content })).unwrap();
      }
      
      console.log('✅ Message sent successfully');
      
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [dispatch, roomId, sending, isConnected]);

  const handleTyping = useCallback((isTyping) => {
    if (isConnected && socketService.getConnectionStatus()) {
      socketService.sendTypingIndicator(roomId, isTyping);
    }
  }, [roomId, isConnected]);

  const renderMessage = useCallback(({ item }) => {
    const isCurrentUser = item.senderId === currentUser?.id;
    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
      />
    );
  }, [currentUser]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={60} color={colors.primary} />
      <Text style={styles.emptyText}>
        No messages yet. Start the conversation!
      </Text>
    </View>
  );

  if (loading.messages[roomId] && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{roomName}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errors.messages && errors.messages[roomId]) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{roomName}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {errors.messages[roomId]}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadMessages()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isConnected ? 'Connected • Real-time' : 'Offline • API only'}
          </Text>
        </View>
        
        <View 
          style={[
            styles.connectionIndicator, 
            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
          ]} 
        />
      </View>

      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
        
        <SimpleChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={sending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}