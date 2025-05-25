// app/(tabs)/chat.js - REPLACE THIS ENTIRE FILE
import React, { useEffect, useState, useCallback } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
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
  setCurrentUserId
} from '../../src/redux/chatSlice';
import socketService from '../../src/services/socketService';
import { store } from '../../src/redux/store';

const ChatItem = ({ chat, onPress }) => {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
      backgroundColor: colors.background,
    },
    avatar: {
      width: 55,
      height: 55,
      borderRadius: 27.5,
      marginRight: spacing.md,
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
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      marginRight: 35,
    },
    unreadBadge: {
      position: 'absolute',
      right: 0,
      top: '50%',
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    unreadText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    messageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    groupIcon: {
      marginLeft: 4,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#4CAF50',
      borderWidth: 2,
      borderColor: colors.background,
    }
  });

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now - messageDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getDisplayName = () => {
    if (chat.type === 'group') {
      return chat.name;
    } else {
      const otherParticipant = chat.otherParticipants?.[0];
      return otherParticipant?.name || chat.name;
    }
  };

  const getAvatarSource = () => {
    if (chat.type === 'group' || !chat.otherParticipants?.[0]?.profileImage) {
      return null;
    }
    return { uri: chat.otherParticipants[0].profileImage };
  };

  const getLastMessage = () => {
    const lastMessage = chat.messages?.[0];
    if (!lastMessage) return 'No messages yet';
    
    if (chat.type === 'group' && lastMessage.sender) {
      return `${lastMessage.sender.name}: ${lastMessage.content}`;
    }
    return lastMessage.content;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(chat)}>
      <View style={{ position: 'relative' }}>
        {getAvatarSource() ? (
          <Image source={getAvatarSource()} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons 
              name={chat.type === 'group' ? 'people' : 'person'} 
              size={24} 
              color={colors.textSecondary} 
            />
          </View>
        )}
        {chat.type === 'one-on-one' && chat.isOnline && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {getDisplayName()}
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
          <Text style={styles.message} numberOfLines={1}>
            {getLastMessage()}
          </Text>
          {chat.unreadCount > 0 && (
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
};

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
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);

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
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    unreadBadge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
      paddingHorizontal: 6,
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
      backgroundColor: isConnected ? '#4CAF50' : '#F44336',
      borderRadius: 6,
      width: 12,
      height: 12,
      marginRight: spacing.sm,
    },
    newChatButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
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

  // DEFINE loadRooms FIRST before using it
  const loadRooms = useCallback(async () => {
    try {
      await dispatch(fetchUserRooms()).unwrap();
    } catch (error) {
      console.error('Failed to load rooms:', error);
      Alert.alert(
        'Connection Error',
        'Failed to load your conversations. Please check your internet connection.',
        [
          { text: 'Retry', onPress: loadRooms },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  }, [dispatch]);

  // NOW use loadRooms in useEffect
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 Setting up chat for user:', currentUser.id);
      
      dispatch(setCurrentUserId(currentUser.id));
      
      const connectSocket = async () => {
        try {
          const state = store.getState();
          const token = state.auth?.token;
          
          console.log('🔑 Token available:', !!token);
          console.log('🔑 Token preview:', token ? `${token.substring(0, 20)}...` : 'None');
          
          if (token) {
            console.log('🔌 Connecting to socket...');
            const success = socketService.connect(token);
            console.log('🔌 Socket connect attempt:', success);
            
            setTimeout(() => {
              const status = socketService.getConnectionStatus();
              console.log('🔍 Socket status after connect:', status);
              console.log('🔍 Socket debug info:', socketService.getDebugInfo());
            }, 2000);
          } else {
            console.error('❌ No token available for socket connection');
          }
        } catch (error) {
          console.error('❌ Error setting up socket:', error);
        }
      };
      
      connectSocket();
      loadRooms();
    }

    return () => {
      console.log('🧹 Cleaning up chat screen...');
      socketService.disconnect();
    };
  }, [currentUser, dispatch, loadRooms]);

  useEffect(() => {
    const checkConnection = () => {
      const debugInfo = socketService.getDebugInfo();
      console.log('📊 Connection Check:', {
        isConnected: debugInfo.isConnected,
        socketConnected: debugInfo.socketConnected,
        socketId: debugInfo.socketId,
        hasSocket: debugInfo.hasSocket
      });
    };
    
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setShowConnectionStatus(true);
    const timer = setTimeout(() => setShowConnectionStatus(false), 2000);
    return () => clearTimeout(timer);
  }, [isConnected]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }, [loadRooms]);

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

  const renderChatItem = useCallback(({ item }) => (
    <ChatItem chat={item} onPress={handleChatPress} />
  ), [handleChatPress]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={70} color={colors.primary} />
      <Text style={styles.emptyText}>
        You do not have any conversations yet. Start a new chat to connect with support groups and wellness coaches.
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>
        {errors.rooms || 'Something went wrong. Please try again.'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadRooms}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading.rooms && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
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
          {showConnectionStatus && (
            <View style={styles.connectionStatus} />
          )}
          <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
            <Ionicons name="create-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
      
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
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
}