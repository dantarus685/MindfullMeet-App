// app/chat/[id].jsx - COMPLETE FIXED VERSION - Enhanced message loading
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
  removeOptimisticMessage,
  selectTypingUsers,
  selectOnlineUsers,
  selectRoomById,
  clearError
} from '../../src/redux/chatSlice';
import socketService from '../../src/services/socketService';

const MessageBubble = React.memo(function MessageBubble({ message, isCurrentUser, showSender = false }) {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    outerContainer: {
      width: '100%',
      marginVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    senderContainer: {
      marginBottom: 4,
      alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
      paddingHorizontal: spacing.xs,
    },
    senderText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    messageContainer: {
      flexDirection: 'row',
      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end',
    },
    bubble: {
      backgroundColor: isCurrentUser ? '#DCF8C6' : colors.white || '#FFFFFF',
      borderRadius: 18,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      maxWidth: '80%',
      minWidth: '20%',
      // WhatsApp-style bubble tails
      borderBottomRightRadius: isCurrentUser ? 4 : 18,
      borderBottomLeftRadius: isCurrentUser ? 18 : 4,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      // Enhanced shadows for better depth
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      // Border for received messages (WhatsApp style)
      borderWidth: isCurrentUser ? 0 : 0.5,
      borderColor: isCurrentUser ? 'transparent' : '#E0E0E0',
    },
    optimisticBubble: {
      opacity: 0.7,
    },
    messageContent: {
      width: '100%',
    },
    messageText: {
      color: isCurrentUser ? '#000000' : colors.text || '#000000',
      fontSize: 16,
      lineHeight: 20,
      marginBottom: 2,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
      marginTop: 2,
    },
    timeText: {
      color: isCurrentUser ? 'rgba(0,0,0,0.5)' : colors.textSecondary || 'rgba(0,0,0,0.5)',
      fontSize: 11,
      fontWeight: '400',
    },
    statusIcon: {
      marginLeft: 4,
    },
    // WhatsApp-style avatar space for group chats
    avatarSpace: {
      width: 32,
      marginRight: spacing.xs,
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
      return <Ionicons name="time-outline" size={12} color="rgba(0,0,0,0.4)" />;
    }
    if (isCurrentUser) {
      return message.isRead ? 
        <Ionicons name="checkmark-done" size={12} color="#4FC3F7" /> :
        <Ionicons name="checkmark" size={12} color="rgba(0,0,0,0.4)" />;
    }
    return null;
  };

  return (
    <View style={styles.outerContainer}>
      {/* Sender name for group chats */}
      {showSender && message.sender && !isCurrentUser && (
        <View style={styles.senderContainer}>
          <Text style={styles.senderText}>{message.sender.name}</Text>
        </View>
      )}
      
      <View style={styles.messageContainer}>
        {/* Avatar space for group chats (left side only) */}
        {!isCurrentUser && showSender && (
          <View style={styles.avatarSpace} />
        )}
        
        <View style={[
          styles.bubble, 
          message.isOptimistic && styles.optimisticBubble
        ]}>
          <View style={styles.messageContent}>
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
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [socketJoinAttempted, setSocketJoinAttempted] = useState(false);
  
  // Refs
  const flatListRef = useRef(null);
  const lastMessageId = useRef(null);
  const socketEventListeners = useRef([]);

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
    connectionBanner: {
      backgroundColor: '#E3F2FD',
      borderBottomWidth: 1,
      borderBottomColor: '#BBDEFB',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    connectionText: {
      color: '#1976D2',
      fontSize: 14,
      marginLeft: spacing.sm,
    }
  });

  // Connection status subtitle
  const getConnectionSubtitle = useMemo(() => {
    if (!isConnected) return 'Offline mode • Limited features';
    
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

  // **ENHANCED: Load messages with better error handling and loading states**
  const loadMessages = useCallback(async () => {
    if (!roomId || !currentUser) {
      console.warn('⚠️ Cannot load messages - missing roomId or currentUser');
      return;
    }

    try {
      console.log('📥 Loading messages for room:', roomId);
      
      // Clear any existing errors
      dispatch(clearError({ type: 'messages', roomId }));
      
      const result = await dispatch(fetchRoomMessages({ roomId, page: 1, limit: 50 })).unwrap();
      
      console.log('✅ Messages loaded successfully:', result.data?.messages?.length || 0, 'messages');
      setMessagesLoaded(true);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      
      // Don't show alert for initial load failures, let the UI handle it
      throw error;
    }
  }, [dispatch, roomId, currentUser]);

  // **ENHANCED: Setup room with better socket handling**
  useEffect(() => {
    if (!roomId || !currentUser) return;

    console.log('🔄 Setting up chat room:', roomId);
    
    // Set active room in Redux
    dispatch(setActiveRoom({ id: roomId, name: roomName }));
    
    // Load messages first (this is crucial for getting previous chats)
    if (!messagesLoaded) {
      loadMessages();
    }
    
    // Socket event listeners for this room
    const handleRoomJoined = (data) => {
      if (data.roomId === roomId) {
        console.log('✅ Socket room joined confirmed:', data.roomId);
        
        // **KEY FIX: Check if we got message history from socket**
        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          console.log('📚 Received message history from socket:', data.messages.length, 'messages');
          // Socket service will handle adding these to Redux
        }
      }
    };

    const handleNewMessage = (data) => {
      if (data.roomId === roomId) {
        console.log('📨 New message for this room:', data.message?.content?.substring(0, 50) + '...');
        // Auto-scroll when new message arrives
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    };

    // Add socket event listeners
    const removeRoomJoinedListener = socketService.addEventListener('roomJoined', handleRoomJoined);
    const removeNewMessageListener = socketService.addEventListener('newMessage', handleNewMessage);
    
    socketEventListeners.current = [removeRoomJoinedListener, removeNewMessageListener];
    
    return () => {
      console.log('🧹 Cleaning up chat room:', roomId);
      
      // Remove socket event listeners
      socketEventListeners.current.forEach(removeListener => removeListener());
      socketEventListeners.current = [];
      
      // Leave socket room
      if (socketService.getConnectionStatus()) {
        socketService.leaveRoom(roomId);
      }
      
      // Clear active room
      dispatch(clearActiveRoom());
    };
  }, [roomId, currentUser, roomName, dispatch, messagesLoaded, loadMessages]);

  // **ENHANCED: Better socket room joining logic**
  useEffect(() => {
    if (isConnected && roomId && socketService.getConnectionStatus() && !socketJoinAttempted) {
      console.log('🚪 Socket connected, joining room:', roomId);
      
      // Add a small delay to ensure socket is fully ready
      setTimeout(() => {
        const joined = socketService.joinRoom(roomId);
        if (joined) {
          setSocketJoinAttempted(true);
          console.log('✅ Socket room join initiated');
        } else {
          console.warn('⚠️ Failed to join socket room');
        }
      }, 500);
    }
  }, [isConnected, roomId, socketJoinAttempted]);

  // **ENHANCED: Auto-scroll to bottom when new messages arrive**
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      const latestMessage = messages[messages.length - 1];
      
      // Only scroll if it's a new message (not already processed)
      if (latestMessage.id !== lastMessageId.current) {
        lastMessageId.current = latestMessage.id;
        
        // Delay scroll to ensure message is rendered
        const timer = setTimeout(() => {
          try {
            flatListRef.current?.scrollToEnd({ animated: true });
          } catch (error) {
            console.warn('Failed to scroll to end:', error);
          }
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [messages]);

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (roomId) {
        console.log('👁️ Screen focused, marking messages as read');
        dispatch(markRoomMessagesAsRead(roomId));
        if (socketService.getConnectionStatus()) {
          socketService.markMessagesAsRead(roomId);
        }
      }
    }, [dispatch, roomId])
  );

  // **FIXED: Enhanced send message handler**
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || sending) return;

    setSending(true);
    const messageContent = content.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    try {
      console.log('📤 Sending message:', messageContent.substring(0, 50) + '...');
      
      // Add optimistic message for immediate UI feedback
      dispatch(addOptimisticMessage({ 
        roomId, 
        content: messageContent,
        tempId 
      }));

      // Auto-scroll to show optimistic message
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 50);
      
      // **ENHANCED: Try socket first, fallback to API**
      let messageSent = false;
      
      // Try socket if connected
      if (isConnected && socketService.getConnectionStatus()) {
        console.log('🚀 Sending via socket...');
        const socketTempId = socketService.sendMessage(roomId, messageContent);
        
        if (socketTempId) {
          messageSent = true;
          console.log('✅ Message sent via socket');
        }
      }
      
      // Fallback to API if socket failed or not connected
      if (!messageSent) {
        console.log('🔄 Using API fallback...');
        
        try {
          await dispatch(sendMessage({ roomId, content: messageContent })).unwrap();
          
          // Remove optimistic message as API response will add the real one
          dispatch(removeOptimisticMessage({ roomId, tempId }));
          
          console.log('✅ Message sent via API');
        } catch (apiError) {
          console.error('❌ API send failed:', apiError);
          
          // Remove failed optimistic message
          dispatch(removeOptimisticMessage({ roomId, tempId }));
          
          throw apiError;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Remove failed optimistic message
      dispatch(removeOptimisticMessage({ roomId, tempId }));
      
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
      {!isConnected && (
        <Text style={[styles.emptyText, { fontSize: 14, marginTop: spacing.sm }]}>
          Real-time messaging will be available when connection is restored.
        </Text>
      )}
    </View>
  ), [styles, colors, isConnected, spacing]);

  // **ENHANCED: Better loading state**
  if (loading.messages[roomId] && messages.length === 0 && !messagesLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{roomName}</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
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
            { backgroundColor: isConnected ? '#4CAF50' : '#FFC107' }
          ]} 
        />
      </View>

      {/* Connection banner */}
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#1976D2" />
          <Text style={styles.connectionText}>
            Offline mode - Real-time features limited
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={20}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
        
        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />
        
        {/* Chat input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={sending}
          placeholder={isConnected ? "Type a message..." : "Type a message (offline)..."}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}