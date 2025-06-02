// app/(tabs)/chat.js - FIXED VERSION with Navigation & Auto Socket Connection
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  clearAllErrors
} from '../../src/redux/chatSlice';
import socketService from '../../src/services/socketService';

// JWT Token decoder utility
const decodeJWTToken = (token) => {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(padded);
    const userData = JSON.parse(decoded);
    
    return userData;
  } catch (error) {
    console.error('❌ Error decoding JWT token:', error);
    return null;
  }
};

const getUserFromToken = (token) => {
  const decoded = decodeJWTToken(token);
  
  if (decoded) {
    return {
      id: decoded.id || decoded.userId || decoded.sub,
      name: decoded.name || decoded.username,
      email: decoded.email,
      role: decoded.role
    };
  }
  
  return null;
};

// Enhanced Debug panel with socket connection controls
const DebugPanel = React.memo(function DebugPanel({ effectiveUser }) {
  const [visible, setVisible] = useState(false);
  
  const isConnected = useSelector(state => state.chat.isConnected);
  const rooms = useSelector(state => state.chat.rooms);
  const loading = useSelector(state => state.chat.loading);
  const errors = useSelector(state => state.chat.errors);
  const token = useSelector(state => state.auth.token);
  
  if (!__DEV__) return null;

  const testConnection = async () => {
    try {
      const response = await fetch('http://192.168.56.1:5000/health');
      const data = await response.json();
      Alert.alert('Server Test', `✅ Server reachable!\nStatus: ${data.status}\nConnections: ${data.connections?.active || 0}`);
    } catch (error) {
      Alert.alert('Server Test', `❌ Server unreachable: ${error.message}`);
    }
  };

  const checkReduxState = () => {
    const state = window.store?.getState();
    Alert.alert(
      'Redux State Check',
      `Auth User: ${state?.auth?.user?.name || 'None'}\n` +
      `Effective User: ${effectiveUser?.name || 'None'}\n` +
      `Rooms in Redux: ${state?.chat?.rooms?.length || 0}\n` +
      `Socket Connected: ${state?.chat?.isConnected ? 'Yes' : 'No'}\n` +
      `Loading: ${state?.chat?.loading?.rooms ? 'Yes' : 'No'}\n` +
      `Error: ${state?.chat?.errors?.rooms || 'None'}`
    );
  };

  const forceSocketConnect = async () => {
    try {
      console.log('🔌 Force connecting socket...');
      
      if (!effectiveUser || !token) {
        Alert.alert('Socket Connect', '❌ Cannot connect - missing user or token');
        return;
      }

      // Force disconnect first
      socketService.disconnect();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force connect
      const connected = await socketService.connect(token, effectiveUser);
      
      Alert.alert(
        'Force Socket Connect', 
        connected ? '✅ Socket connected successfully!' : '❌ Socket connection failed'
      );
    } catch (error) {
      console.error('❌ Force socket connect error:', error);
      Alert.alert('Force Socket Connect', `❌ Error: ${error.message}`);
    }
  };

  const testNavigation = () => {
    // Test navigation to first room
    if (rooms.length > 0) {
      const firstRoom = rooms[0];
      Alert.alert(
        'Navigation Test',
        `Will navigate to: ${firstRoom.name}\nRoom ID: ${firstRoom.id}\nType: ${firstRoom.type}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Navigate', 
            onPress: () => {
              console.log('🧪 Test navigation to room:', firstRoom.id);
              // Use router from window if available
              if (window.router) {
                window.router.push(`/chat/${firstRoom.id}?name=${encodeURIComponent(firstRoom.name)}&type=${firstRoom.type}`);
              }
            }
          }
        ]
      );
    } else {
      Alert.alert('Navigation Test', '❌ No rooms available to test');
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={{
          position: 'absolute',
          top: 50,
          right: 10,
          backgroundColor: isConnected ? 'green' : 'red',
          padding: 8,
          borderRadius: 15,
          zIndex: 1000,
        }}
        onPress={() => setVisible(!visible)}
      >
        <Text style={{ color: 'white', fontSize: 10 }}>
          {visible ? '✕' : `${isConnected ? '🟢' : '🔴'}${rooms.length}`}
        </Text>
      </TouchableOpacity>

      {visible && (
        <View style={{
          position: 'absolute',
          top: 90,
          right: 10,
          width: 320,
          backgroundColor: 'rgba(0,0,0,0.95)',
          padding: 12,
          borderRadius: 8,
          zIndex: 999,
          maxHeight: 450,
        }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
            Chat Debug Panel
          </Text>
          
          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 2 }}>
            Socket: <Text style={{ color: isConnected ? 'green' : 'red' }}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </Text>
          </Text>
          
          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 2 }}>
            User: <Text style={{ color: effectiveUser ? 'green' : 'red' }}>
              {effectiveUser?.name || effectiveUser?.email || `ID: ${effectiveUser?.id}` || 'None'}
            </Text>
          </Text>

          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 2 }}>
            Rooms: <Text style={{ color: 'white' }}>{rooms.length}</Text>
          </Text>

          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 8 }}>
            Loading: <Text style={{ color: loading.rooms ? 'orange' : 'green' }}>
              {loading.rooms ? 'Yes' : 'No'}
            </Text>
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginBottom: 8,
            flexWrap: 'wrap'
          }}>
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#007bff', 
                padding: 6, 
                borderRadius: 4, 
                width: '48%',
                marginBottom: 4
              }}
              onPress={testConnection}
            >
              <Text style={{ color: 'white', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                Server
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#28a745', 
                padding: 6, 
                borderRadius: 4, 
                width: '48%',
                marginBottom: 4
              }}
              onPress={checkReduxState}
            >
              <Text style={{ color: 'white', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                Redux
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ 
                backgroundColor: '#ff6b35', 
                padding: 6, 
                borderRadius: 4, 
                width: '48%',
                marginBottom: 4
              }}
              onPress={forceSocketConnect}
            >
              <Text style={{ color: 'white', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                Connect Socket
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ 
                backgroundColor: '#17a2b8', 
                padding: 6, 
                borderRadius: 4, 
                width: '48%',
                marginBottom: 4
              }}
              onPress={testNavigation}
            >
              <Text style={{ color: 'white', fontSize: 9, textAlign: 'center', fontWeight: 'bold' }}>
                Test Nav
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={{ 
              backgroundColor: '#dc3545', 
              padding: 6, 
              borderRadius: 4,
              marginTop: 8
            }}
            onPress={() => setVisible(false)}
          >
            <Text style={{ color: 'white', fontSize: 10, textAlign: 'center', fontWeight: 'bold' }}>
              Close Debug
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
});

// Connection banner
const ConnectionBanner = React.memo(function ConnectionBanner({ isConnected }) {
  const { colors, spacing } = useTheme();
  
  if (isConnected) return null;

  return (
    <View style={{
      backgroundColor: '#FFF3CD',
      borderBottomWidth: 1,
      borderBottomColor: '#FFEAA7',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Ionicons name="wifi-outline" size={16} color="#856404" />
      <Text style={{ color: '#856404', fontSize: 14, marginLeft: spacing.sm, flex: 1 }}>
        Connecting to real-time chat... Messages will sync when connected.
      </Text>
    </View>
  );
});

// FIXED Chat item component with proper navigation
const ChatItem = React.memo(function ChatItem({ chat, onPress, currentUserId }) {
  const { colors, spacing } = useTheme();
  
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
    if (lastMessage.senderId === currentUserId) {
      prefix = 'You: ';
    } else if (chat.type === 'group' && lastMessage.sender) {
      prefix = `${lastMessage.sender.name}: `;
    }
    
    return `${prefix}${lastMessage.content}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return messageDate.toLocaleDateString([], { weekday: 'short' });
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const displayInfo = getDisplayInfo();
  const hasUnread = (chat.unreadCount || 0) > 0;

  const itemStyles = StyleSheet.create({
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
      fontWeight: hasUnread ? 'bold' : '600',
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
    },
    message: {
      fontSize: 14,
      color: hasUnread ? colors.text : colors.textSecondary,
      fontWeight: hasUnread ? '600' : 'normal',
      flex: 1,
      marginRight: 8,
    },
    unreadBadge: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    unreadText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
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
  });

  // FIXED: Enhanced onPress with proper navigation logging
  const handlePress = () => {
    console.log('🖱️ Chat item pressed:', {
      chatId: chat.id,
      chatName: displayInfo.name,
      chatType: chat.type,
      hasOtherParticipants: !!chat.otherParticipants?.length
    });
    
    onPress(chat);
  };

  return (
    <TouchableOpacity 
      style={itemStyles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={itemStyles.avatarContainer}>
        {displayInfo.avatar ? (
          <Image source={displayInfo.avatar} style={itemStyles.avatar} />
        ) : (
          <View style={[itemStyles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons 
              name={chat.type === 'group' ? 'people' : 'person'} 
              size={24} 
              color={colors.textSecondary} 
            />
          </View>
        )}
        
        {chat.type === 'one-on-one' && displayInfo.isOnline && (
          <View style={itemStyles.onlineIndicator} />
        )}
      </View>
      
      <View style={itemStyles.content}>
        <View style={itemStyles.nameRow}>
          <Text style={itemStyles.name} numberOfLines={1}>
            {displayInfo.name}
          </Text>
          <Text style={itemStyles.time}>
            {formatTime(chat.messages?.[0]?.createdAt || chat.updatedAt)}
          </Text>
        </View>
        
        <View style={itemStyles.messageContainer}>
          <Text style={itemStyles.message} numberOfLines={2}>
            {getLastMessage()}
          </Text>
          {hasUnread && (
            <View style={itemStyles.unreadBadge}>
              <Text style={itemStyles.unreadText}>
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
  
  // FIXED: Make router available globally for debug panel
  useEffect(() => {
    window.router = router;
    return () => {
      delete window.router;
    };
  }, [router]);
  
  // Redux selectors
  const rooms = useSelector(selectRooms);
  const totalUnreadCount = useSelector(selectTotalUnreadCount);
  const loading = useSelector(selectChatLoading);
  const errors = useSelector(selectChatErrors);
  const isConnected = useSelector(selectIsConnected);
  
  // User selection with token fallback
  const reduxUser = useSelector(state => state.auth?.user);
  const token = useSelector(state => state.auth?.token);
  
  const tokenUser = useMemo(() => {
    if (token) {
      return getUserFromToken(token);
    }
    return null;
  }, [token]);

  const effectiveUser = reduxUser || tokenUser;

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [socketAutoConnectAttempted, setSocketAutoConnectAttempted] = useState(false);

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
  });

  // FIXED: Room loading function
  const loadRooms = useCallback(async (showLoading = false, source = 'unknown') => {
    try {
      console.log(`📥 Loading user rooms... Source: ${source}`, { 
        showLoading, 
        hasEffectiveUser: !!effectiveUser,
        hasToken: !!token,
        effectiveUserName: effectiveUser?.name || effectiveUser?.email || `ID:${effectiveUser?.id}`,
        effectiveUserId: effectiveUser?.id
      });
      
      if (!effectiveUser || !token) {
        console.warn('⚠️ Cannot load rooms - missing user or token');
        return;
      }
      
      const result = await dispatch(fetchUserRooms()).unwrap();
      console.log('✅ Rooms loaded successfully:', {
        roomsCount: result.data?.rooms?.length || 0,
        source
      });
      
      setInitialLoadDone(true);
      return result;
    } catch (error) {
      console.error('❌ Failed to load rooms:', error, { source });
      throw error;
    }
  }, [dispatch, effectiveUser, token]);

  // FIXED: Auto socket connection
  useEffect(() => {
    if (effectiveUser && token && !socketAutoConnectAttempted) {
      console.log('🔌 Attempting auto socket connection...', {
        hasUser: !!effectiveUser,
        hasToken: !!token,
        userName: effectiveUser?.name || effectiveUser?.email || `ID:${effectiveUser?.id}`
      });
      
      // Set the flag immediately to prevent multiple attempts
      setSocketAutoConnectAttempted(true);
      
      // Auto-connect socket with delay
      const connectTimer = setTimeout(async () => {
        try {
          console.log('🚀 Starting socket auto-connect...');
          const connected = await socketService.connect(token, effectiveUser);
          
          if (connected) {
            console.log('✅ Socket auto-connected successfully');
          } else {
            console.warn('⚠️ Socket auto-connect failed');
          }
        } catch (error) {
          console.error('❌ Socket auto-connect error:', error);
        }
      }, 2000); // 2 second delay
      
      return () => clearTimeout(connectTimer);
    }
  }, [effectiveUser, token, socketAutoConnectAttempted]);

  // FIXED: Room initialization
  useEffect(() => {
    if (effectiveUser && token) {
      console.log('🔄 Chat screen initialization with effective user:', {
        userId: effectiveUser.id,
        userName: effectiveUser.name || effectiveUser.email || `ID:${effectiveUser.id}`,
        hasToken: !!token
      });
      
      dispatch(setCurrentUserId(effectiveUser.id));
      dispatch(clearAllErrors());
      loadRooms(false, 'initialization');
    }
  }, [effectiveUser, token, dispatch, loadRooms]);

  // FIXED: Enhanced chat press handler with proper navigation
  const handleChatPress = useCallback((chat) => {
    console.log('💬 Opening chat - Raw data:', chat);
    
    const chatId = chat.id;
    const chatName = chat.type === 'group' 
      ? chat.name 
      : chat.otherParticipants?.[0]?.name || chat.name || 'Chat';
    const chatType = chat.type;
    
    console.log('💬 Navigation details:', {
      chatId,
      chatName,
      chatType,
      routerAvailable: !!router
    });
    
    try {
      // FIXED: Use proper navigation format
      router.push({
        pathname: `/chat/[id]`,
        params: { 
          id: chatId,
          name: chatName,
          type: chatType
        }
      });
      
      console.log('✅ Navigation initiated successfully');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Navigation Error', 'Failed to open chat. Please try again.');
    }
  }, [router]);

  const handleNewChat = useCallback(() => {
    console.log('➕ Opening new chat screen');
    router.push('/chat/new');
  }, [router]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    try {
      await loadRooms(false, 'manual-refresh');
    } finally {
      setRefreshing(false);
    }
  }, [loadRooms]);

  // FIXED: Render functions
  const renderChatItem = useCallback(({ item }) => (
    <ChatItem 
      chat={item} 
      onPress={handleChatPress} 
      currentUserId={effectiveUser?.id}
    />
  ), [handleChatPress, effectiveUser]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={70} color={colors.primary} />
      <Text style={styles.emptyText}>
        You do not have any conversations yet.{'\n\n'}
        Start a new chat to connect with others.
      </Text>
    </View>
  ), [styles, colors]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Debug Panel */}
      <DebugPanel effectiveUser={effectiveUser} />
      
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
          {/* Connection status indicator */}
          <View style={[
            styles.connectionStatus, 
            { backgroundColor: isConnected ? '#4CAF50' : '#FFC107' }
          ]}>
            <Ionicons 
              name={isConnected ? 'wifi' : 'wifi-outline'} 
              size={10} 
              color="white" 
            />
          </View>
          
          {/* New chat button */}
          <TouchableOpacity 
            style={styles.newChatButton} 
            onPress={handleNewChat}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection banner */}
      <ConnectionBanner isConnected={isConnected} />

      {/* Content */}
      <FlatList
        data={rooms}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        contentContainerStyle={rooms.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}