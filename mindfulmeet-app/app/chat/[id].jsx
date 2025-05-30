// app/chat/[id].jsx - Enhanced version with ESLint fixes
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  TextInput,
  Animated
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
  clearActiveRoom,
  addOptimisticMessage,
  selectTypingUsers,
  selectOnlineUsers,
  selectRoomById,
  clearError
} from '../../src/redux/chatSlice';
import socketService from '../../src/services/socketService';

const MessageBubble = React.memo(function MessageBubble({ message, isCurrentUser, showSender = false }) {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: isCurrentUser ? 'row-reverse' : 'row',
      marginVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      alignItems: 'flex-end',
    },
    senderContainer: {
      marginBottom: 2,
      paddingHorizontal: spacing.md,
    },
    senderText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: isCurrentUser ? 'right' : 'left',
    },
    bubble: {
      backgroundColor: isCurrentUser ? colors.primary : colors.lightGrey,
      borderRadius: 18,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      maxWidth: '75%',
      borderBottomRightRadius: isCurrentUser ? 4 : 18,
      borderBottomLeftRadius: isCurrentUser ? 18 : 4,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    optimisticBubble: {
      opacity: 0.7,
    },
    messageText: {
      color: isCurrentUser ? colors.white : colors.text,
      fontSize: 16,
      lineHeight: 20,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    timeText: {
      color: isCurrentUser ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
      fontSize: 12,
      textAlign: isCurrentUser ? 'right' : 'left',
    },
    statusIcon: {
      marginLeft: 4,
    }
  });

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getStatusIcon = () => {
    if (message.isOptimistic) {
      return <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />;
    }
    if (isCurrentUser) {
      return message.isRead ? 
        <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.8)" /> :
        <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.6)" />;
    }
    return null;
  };

  return (
    <View>
      {showSender && message.sender && !isCurrentUser && (
        <View style={styles.senderContainer}>
          <Text style={styles.senderText}>{message.sender.name}</Text>
        </View>
      )}
      <View style={styles.container}>
        <View style={[
          styles.bubble, 
          message.isOptimistic && styles.optimisticBubble
        ]}>
          <Text style={styles.messageText}>{message.content}</Text>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(message.createdAt)}</Text>
            {isCurrentUser && (
              <View style={styles.statusIcon}>
                {getStatusIcon()}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});

const TypingIndicator = React.memo(function TypingIndicator({ typingUsers = [] }) {
  const { colors, spacing } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [typingUsers.length, animatedValue]);

  if (typingUsers.length === 0) return null;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    bubble: {
      backgroundColor: colors.lightGrey,
      borderRadius: 18,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: {
      color: colors.textSecondary,
      fontSize: 14,
      marginRight: spacing.sm,
    },
    dots: {
      flexDirection: 'row',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textSecondary,
      marginHorizontal: 1,
    }
  });

  const typingText = typingUsers.length === 1 
    ? `${typingUsers[0].name} is typing...`
    : `${typingUsers.length} people are typing...`;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{typingText}</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: animatedValue,
                  transform: [{
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -3],
                    })
                  }]
                }
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

const ChatInput = React.memo(function ChatInput({ onSendMessage, onTyping, disabled = false, placeholder = "Type a message..." }) {
  const { colors, spacing } = useTheme();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [height, setHeight] = useState(40);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

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
      paddingVertical: spacing.sm,
      minHeight: 50,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      maxHeight: 100,
      textAlignVertical: 'center',
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 22,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    sendButtonDisabled: {
      backgroundColor: colors.textSecondary,
    }
  });

  const handleTextChange = useCallback((text) => {
    setMessage(text);
    
    // Handle typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      onTyping && onTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping && onTyping(false);
      }
    }, 1000);
  }, [isTyping, onTyping]);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && onSendMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
      setHeight(40);
      
      // Clear typing indicator
      if (isTyping) {
        setIsTyping(false);
        onTyping && onTyping(false);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [message, disabled, onSendMessage, isTyping, onTyping]);

  const handleContentSizeChange = useCallback((event) => {
    const newHeight = Math.min(Math.max(40, event.nativeEvent.contentSize.height), 100);
    setHeight(newHeight);
  }, []);

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
          ref={inputRef}
          style={[styles.textInput, { height: Math.max(40, height) }]}
          value={message}
          onChangeText={handleTextChange}
          placeholder={disabled ? "Connecting..." : placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          onContentSizeChange={handleContentSizeChange}
          blurOnSubmit={false}
        />
        
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            !canSend && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
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
});

export default function ChatRoomScreen() {
  const { colors, spacing, isDark } = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const roomId = parseInt(params.id);
  const roomName = params.name || 'Chat';
  
  // Redux selectors
  const messages = useSelector(selectRoomMessages(roomId));
  const loading = useSelector(selectChatLoading);
  const errors = useSelector(selectChatErrors);
  const currentUser = useSelector(state => state.auth.user);
  const isConnected = useSelector(selectIsConnected);
  const typingUsers = useSelector(selectTypingUsers(roomId));
  const onlineUsers = useSelector(selectOnlineUsers(roomId));
  const room = useSelector(selectRoomById(roomId));
  
  // Local state
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Refs
  const flatListRef = useRef(null);
  const socketListenerRef = useRef(null);

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
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
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
    },
    reconnectBanner: {
      backgroundColor: '#FFF3CD',
      borderBottomWidth: 1,
      borderBottomColor: '#FFEAA7',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    reconnectText: {
      color: '#856404',
      fontSize: 14,
      marginLeft: spacing.sm,
    }
  });

  // Connection status subtitle
  const getConnectionSubtitle = useMemo(() => {
    if (!isConnected) return 'Offline • API only';
    
    const onlineCount = Object.keys(onlineUsers).length;
    if (room?.type === 'one-on-one') {
      const otherUser = room.otherParticipants?.[0];
      const isOtherOnline = otherUser && onlineUsers[otherUser.id];
      return isOtherOnline ? 'Online' : 'Last seen recently';
    } else if (room?.type === 'group') {
      return onlineCount > 0 ? `${onlineCount} online` : 'Group chat';
    }
    
    return 'Connected';
  }, [isConnected, onlineUsers, room]);

  // Load messages function
  const loadMessages = useCallback(async () => {
    try {
      console.log('📥 Loading messages for room:', roomId);
      await dispatch(fetchRoomMessages({ roomId, page: 1, limit: 50 })).unwrap();
    } catch (error) {
      console.error('Failed to load messages:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    }
  }, [dispatch, roomId]);

  // Setup room and socket connection
  useEffect(() => {
    if (roomId && currentUser) {
      console.log('🔄 Setting up chat room:', roomId);
      
      dispatch(setActiveRoom({ id: roomId, name: roomName }));
      loadMessages();
      
      // Clear any existing errors
      dispatch(clearError({ type: 'messages', roomId }));
      
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

  // Handle socket reconnection
  useEffect(() => {
    if (isConnected && roomId && socketService.getConnectionStatus()) {
      console.log('🔌 Socket connected, joining room:', roomId);
      setTimeout(() => {
        socketService.joinRoom(roomId);
      }, 500); // Small delay to ensure connection is stable
    }
  }, [isConnected, roomId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
          console.warn('Failed to scroll to end:', error);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (roomId) {
        dispatch(markRoomMessagesAsRead(roomId));
        if (socketService.getConnectionStatus()) {
          socketService.markMessagesAsRead(roomId);
        }
      }
    }, [dispatch, roomId])
  );

  // Socket event listeners
  useEffect(() => {
    const removeListener = socketService.addEventListener('newMessage', (data) => {
      if (data.roomId === roomId) {
        // Auto-scroll if user is near bottom
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    });

    socketListenerRef.current = removeListener;
    
    return () => {
      if (socketListenerRef.current) {
        socketListenerRef.current();
      }
    };
  }, [roomId]);

  // Send message handler
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || sending) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    setSending(true);

    try {
      console.log('📤 Sending message:', content);
      
      // Add optimistic message for immediate feedback
      dispatch(addOptimisticMessage({ 
        roomId, 
        content: content.trim(),
        tempId 
      }));

      // Scroll to bottom immediately
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 50);
      
      if (isConnected && socketService.getConnectionStatus()) {
        console.log('🚀 Sending via socket...');
        const success = socketService.sendMessage(roomId, content.trim());
        
        if (!success) {
          console.log('❌ Socket send failed, using API...');
          await dispatch(sendMessage({ roomId, content: content.trim() })).unwrap();
        }
      } else {
        console.log('🔄 Socket not connected, using API...');
        await dispatch(sendMessage({ roomId, content: content.trim() })).unwrap();
      }
      
      console.log('✅ Message sent successfully');
      
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [dispatch, roomId, sending, isConnected]);

  // Typing indicator handler
  const handleTyping = useCallback((isTyping) => {
    if (isConnected && socketService.getConnectionStatus()) {
      socketService.sendTypingIndicator(roomId, isTyping);
    }
  }, [roomId, isConnected]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMessages();
    } finally {
      setRefreshing(false);
    }
  }, [loadMessages]);

  // Retry handler
  const handleRetry = useCallback(() => {
    dispatch(clearError({ type: 'messages', roomId }));
    loadMessages();
  }, [dispatch, roomId, loadMessages]);

  // Message renderer
  const renderMessage = useCallback(({ item, index }) => {
    const isCurrentUser = item.senderId === currentUser?.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showSender = !isCurrentUser && 
      room?.type === 'group' && 
      (!prevMessage || prevMessage.senderId !== item.senderId);
    
    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        showSender={showSender}
      />
    );
  }, [currentUser, messages, room]);

  // Empty state renderer
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={60} color={colors.primary} />
      <Text style={styles.emptyText}>
        No messages yet. Start the conversation!
      </Text>
    </View>
  ), [styles, colors]);

  // Loading state
  if (loading.messages[roomId] && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{roomName}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (errors.messages && errors.messages[roomId]) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{roomName}</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {errors.messages[roomId]}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {getConnectionSubtitle}
          </Text>
        </View>
        
        <View 
          style={[
            styles.connectionIndicator, 
            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
          ]} 
        />
      </View>

      {/* Reconnection banner */}
      {!isConnected && (
        <View style={styles.reconnectBanner}>
          <Ionicons name="warning" size={16} color="#856404" />
          <Text style={styles.reconnectText}>
            Connection lost. Messages will be sent when reconnected.
          </Text>
        </View>
      )}

      {/* Messages */}
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
          onRefresh={handleRefresh}
          refreshing={refreshing}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={20}
          getItemLayout={(data, index) => ({
            length: 80, // Approximate message height
            offset: 80 * index,
            index,
          })}
        />
        
        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />
        
        {/* Chat input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={sending}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}