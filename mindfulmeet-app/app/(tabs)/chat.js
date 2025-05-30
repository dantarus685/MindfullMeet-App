// app/(tabs)/chat.js - Enhanced main chat screen with ESLint fixes
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  AppState
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../../src/constants/theme';
import { 
  fetchUserRooms, 
  selectRooms, 
  selectTotalUnreadCount,
  selectChatLoading,
  selectChatErrors,
  selectIsConnected,
  setCurrentUserId,
  clearAllErrors,
  selectLastActivity
} from '../../src/redux/chatSlice';
import socketService from '../../src/services/socketService';
import { store } from '../../src/redux/store';

const ConnectionStatusBanner = React.memo(function ConnectionStatusBanner({ isConnected, onReconnect }) {
  const { colors, spacing } = useTheme();
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (visible) {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isConnected, slideAnim, visible]);

  if (!visible && isConnected) return null;

  const styles = StyleSheet.create({
    banner: {
      backgroundColor: '#FFF3CD',
      borderBottomWidth: 1,
      borderBottomColor: '#FFEAA7',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    text: {
      color: '#856404',
      fontSize: 14,
      marginLeft: spacing.sm,
      flex: 1,
    },
    reconnectButton: {
      backgroundColor: '#856404',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 4,
    },
    reconnectText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    }
  });

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <Ionicons name="warning" size={16} color="#856404" />
        <Text style={styles.text}>
          Connection lost. Some features may not work properly.
        </Text>
      </View>
      <TouchableOpacity style={styles.reconnectButton} onPress={onReconnect}>
        <Text style={styles.reconnectText}>Reconnect</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const ChatItem = React.memo(function ChatItem({ chat, onPress, currentUserId }) {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
      backgroundColor: colors.background,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: spacing.md,
    },
    avatar: {
      width: 55,
      height: 55,
      borderRadius: 27.5,
      backgroundColor: colors.lightGrey,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    time: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      marginRight: 35,
      flex: 1,
    },
    unreadMessage: {
      fontWeight: '600',
      color: colors.text,
    },
    unreadBadge: {
      position: 'absolute',
      right: 0,
      top: '50%',
      backgroundColor: colors.primary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      transform: [{ translateY: -12 }],
    },
    unreadText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    groupIcon: {
      marginLeft: 4,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#4CAF50',
      borderWidth: 2,
      borderColor: colors.background,
    },
    offlineIndicator: {
      backgroundColor: colors.textSecondary,
    }
  });

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now - messageDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getDisplayInfo = () => {
    if (chat.type === 'group') {
      return {
        name: chat.name,
        avatar: null,
        isOnline: false
      };
    } else {
      const otherParticipant = chat.otherParticipants?.[0];
      return {
        name: otherParticipant?.name || chat.name,
        avatar: otherParticipant?.profileImage ? { uri: otherParticipant.profileImage } : null,
        isOnline: chat.isOnline || false
      };
    }
  };

  const getLastMessage = () => {
    const lastMessage = chat.messages?.[0];
    if (!lastMessage) return 'No messages yet';
    
    let prefix = '';
    if (chat.type === 'group' && lastMessage.sender) {
      const senderName = lastMessage.senderId === currentUserId ? 'You' : lastMessage.sender.name;
      prefix = `${senderName}: `;
    } else if (lastMessage.senderId === currentUserId) {
      prefix = 'You: ';
    }
    
    return `${prefix}${lastMessage.content}`;
  };

  const displayInfo = getDisplayInfo();
  const hasUnread = (chat.unreadCount || 0) > 0;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(chat)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {displayInfo.avatar ? (
          <Image source={displayInfo.avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons 
              name={chat.type === 'group' ? 'people' : 'person'} 
              size={24} 
              color={colors.textSecondary} 
            />
          </View>
        )}
        
        {chat.type === 'one-on-one' && (
          <View style={[
            styles.onlineIndicator,
            !displayInfo.isOnline && styles.offlineIndicator
          ]} />
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={[styles.name, hasUnread && { fontWeight: 'bold' }]} numberOfLines={1}>
              {displayInfo.name}
            </Text>
            {chat.type === 'group' && (
              <Ionicons 
                name="people" 
                size={14} 
                color={colors.primary} 
                style={styles.groupIcon}
              />
            )}
          </View>
          <Text style={styles.time}>
            {formatTime(chat.messages?.[0]?.createdAt || chat.updatedAt)}
          </Text>
        </View>
        
        <View style={styles.messageContainer}>
          <Text 
            style={[styles.message, hasUnread && styles.unreadMessage]} 
            numberOfLines={2}
          >
            {getLastMessage()}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ChatScreen() {
  const { colors, spacing, isDark } = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  
  // Redux selectors
  const rooms = useSelector(selectRooms);
  const totalUnreadCount = useSelector(selectTotalUnreadCount);
  const loading = useSelector(selectChatLoading);
  const errors = useSelector(selectChatErrors);
  const isConnected = useSelector(selectIsConnected);
  const currentUser = useSelector(state => state.auth.user);
  const lastActivity = useSelector(selectLastActivity);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  
  // Refs
  const appStateRef = useRef(AppState.currentState);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
      backgroundColor: colors.background,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    unreadBadge: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
      paddingHorizontal: 8,
    },
    unreadText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    connectionStatus: {
      borderRadius: 8,
      width: 16,
      height: 16,
      marginRight: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    newChatButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
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
      marginTop: spacing.lg,
      lineHeight: 24,
    },
    loadingContainer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    errorContainer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    errorText: {
      color: colors.error || '#F44336',
      textAlign: 'center',
      marginBottom: spacing.md,
      fontSize: 16,
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
    debugInfo: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 8,
      borderRadius: 4,
    },
    debugText: {
      color: 'white',
      fontSize: 10,
    }
  });

  // Load rooms function
  const loadRooms = useCallback(async () => {
    try {
      console.log('🔄 Loading user rooms...');
      await dispatch(fetchUserRooms()).unwrap();
      setRetryAttempts(0);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setRetryAttempts(prev => prev + 1);
      
      if (retryAttempts < 3) {
        Alert.alert(
          'Connection Error',
          'Failed to load your conversations. Please check your internet connection.',
          [
            { text: 'Retry', onPress: loadRooms },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    }
  }, [dispatch, retryAttempts]);

  // Setup socket connection
  const setupSocket = useCallback(async () => {
    if (!currentUser) return;

    try {
      const state = store.getState();
      const token = state.auth?.token;
      
      console.log('🔌 Setting up socket connection...');
      
      if (token) {
        const success = await socketService.connect(token);
        console.log('🔌 Socket connection result:', success);
        
        if (success) {
          setTimeout(() => {
            const status = socketService.getConnectionStatus();
            console.log('🔍 Socket status after connect:', status);
          }, 2000);
        }
      } else {
        console.error('❌ No token available for socket connection');
      }
    } catch (error) {
      console.error('❌ Error setting up socket:', error);
    }
  }, [currentUser]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 App state changed:', appStateRef.current, '->', nextAppState);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('📱 App became active, refreshing data...');
        if (currentUser) {
          loadRooms();
          setupSocket();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        console.log('📱 App went to background');
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [currentUser, loadRooms, setupSocket]);

  // Initial setup
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 Setting up chat for user:', currentUser.id);
      
      dispatch(setCurrentUserId(currentUser.id));
      dispatch(clearAllErrors());
      
      setupSocket();
      loadRooms();
    }

    return () => {
      console.log('🧹 Cleaning up chat screen...');
    };
  }, [currentUser, dispatch, setupSocket, loadRooms]);

  // Connection status monitoring
  useEffect(() => {
    setShowConnectionStatus(true);
    const timer = setTimeout(() => setShowConnectionStatus(false), 3000);
    
    return () => clearTimeout(timer);
  }, [isConnected]);

  // Screen focus handler
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Chat screen focused');
      
      if (currentUser && !loading.rooms) {
        // Refresh data when screen becomes active
        loadRooms();
      }
      
      return () => {
        console.log('📱 Chat screen unfocused');
      };
    }, [currentUser, loading.rooms, loadRooms])
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRooms();
      
      // Also try to reconnect socket if needed
      if (!isConnected) {
        setupSocket();
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadRooms, isConnected, setupSocket]);

  const handleChatPress = useCallback((chat) => {
    router.push({
      pathname: '/chat/[id]',
      params: { 
        id: chat.id,
        name: chat.type === 'group' ? chat.name : chat.otherParticipants?.[0]?.name || 'Chat',
        type: chat.type
      }
    });
  }, [router]);

  const handleNewChat = useCallback(() => {
    router.push('/chat/new');
  }, [router]);

  const handleReconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    setupSocket();
  }, [setupSocket]);

  const handleRetry = useCallback(() => {
    dispatch(clearAllErrors());
    loadRooms();
  }, [dispatch, loadRooms]);

  // Render functions
  const renderChatItem = useCallback(({ item }) => (
    <ChatItem 
      chat={item} 
      onPress={handleChatPress} 
      currentUserId={currentUser?.id}
    />
  ), [handleChatPress, currentUser]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={70} color={colors.primary} />
      <Text style={styles.emptyText}>
        You don&apos;t have any conversations yet.{'\n\n'}
        Start a new chat to connect with support groups and wellness coaches.
      </Text>
    </View>
  ), [styles, colors]);

  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error || '#F44336'} />
      <Text style={styles.errorText}>
        {errors.rooms || 'Something went wrong. Please try again.'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ), [styles, colors, errors.rooms, handleRetry]);

  const getConnectionIndicator = () => {
    if (isConnected) {
      return (
        <View style={[styles.connectionStatus, { backgroundColor: '#4CAF50' }]}>
          <Ionicons name="checkmark" size={10} color="white" />
        </View>
      );
    } else {
      return (
        <View style={[styles.connectionStatus, { backgroundColor: '#F44336' }]}>
          <Ionicons name="close" size={10} color="white" />
        </View>
      );
    }
  };

  // Loading state
  if (loading.rooms && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Messages</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { marginTop: spacing.md }]}>
            Loading your conversations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Connection status banner */}
      <ConnectionStatusBanner 
        isConnected={isConnected} 
        onReconnect={handleReconnect}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Messages</Text>
          {totalUnreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerButtons}>
          {showConnectionStatus && getConnectionIndicator()}
          <TouchableOpacity 
            style={styles.newChatButton} 
            onPress={handleNewChat}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content */}
      {errors.rooms ? (
        renderError()
      ) : rooms.length > 0 ? (
        <FlatList
          data={rooms}
          renderItem={renderChatItem}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.lightGrey, marginLeft: 87 }} />
          )}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={10}
        />
      ) : (
        renderEmptyState()
      )}
      
      {/* Debug info (development only) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Connected: {isConnected ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Rooms: {rooms.length}
          </Text>
          <Text style={styles.debugText}>
            Unread: {totalUnreadCount}
          </Text>
          <Text style={styles.debugText}>
            Last Activity: {lastActivity ? new Date(lastActivity).toLocaleTimeString() : 'None'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}