// app/(tabs)/chat.js - Simplified version that works with auto-connection
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

// Debug panel
const DebugPanel = React.memo(function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState({});
  const isConnected = useSelector(state => state.chat.isConnected);
  
  useEffect(() => {
    if (visible) {
      const updateInfo = () => {
        const debugInfo = socketService.getDebugInfo();
        setInfo(debugInfo);
      };
      
      updateInfo();
      const interval = setInterval(updateInfo, 2000);
      return () => clearInterval(interval);
    }
  }, [visible]);

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

  const manualConnect = async () => {
    try {
      const state = socketService.store?.getState() || {};
      const token = state.auth?.token;
      if (token) {
        const success = await socketService.connect(token);
        Alert.alert('Manual Connect', success ? '✅ Connected!' : '❌ Connection failed');
      } else {
        Alert.alert('Manual Connect', '❌ No token available');
      }
    } catch (error) {
      Alert.alert('Manual Connect', `❌ Error: ${error.message}`);
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
          {visible ? '✕' : isConnected ? '🟢' : '🔴'}
        </Text>
      </TouchableOpacity>

      {visible && (
        <View style={{
          position: 'absolute',
          top: 90,
          right: 10,
          width: 300,
          backgroundColor: 'rgba(0,0,0,0.95)',
          padding: 12,
          borderRadius: 8,
          zIndex: 999,
        }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
            Socket Debug Panel
          </Text>
          
          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 2 }}>
            Status: <Text style={{ color: isConnected ? 'green' : 'red' }}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </Text>
          </Text>
          
          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 2 }}>
            Socket ID: <Text style={{ color: 'white' }}>{info.socketId || 'None'}</Text>
          </Text>
          
          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 2 }}>
            Auto-Init: <Text style={{ color: 'white' }}>Enabled</Text>
          </Text>
          
          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 2 }}>
            Rooms: <Text style={{ color: 'white' }}>{info.currentRooms?.length || 0}</Text>
          </Text>

          <Text style={{ color: 'yellow', fontSize: 11, marginBottom: 8 }}>
            Pending: <Text style={{ color: 'white' }}>{info.pendingMessages || 0}</Text>
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginBottom: 8 
          }}>
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#007bff', 
                padding: 6, 
                borderRadius: 4, 
                width: '48%'
              }}
              onPress={testConnection}
            >
              <Text style={{ color: 'white', fontSize: 10, textAlign: 'center', fontWeight: 'bold' }}>
                Test Server
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#28a745', 
                padding: 6, 
                borderRadius: 4, 
                width: '48%'
              }}
              onPress={manualConnect}
            >
              <Text style={{ color: 'white', fontSize: 10, textAlign: 'center', fontWeight: 'bold' }}>
                Manual Connect
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={{ 
              backgroundColor: '#dc3545', 
              padding: 6, 
              borderRadius: 4
            }}
            onPress={() => setVisible(false)}
          >
            <Text style={{ color: 'white', fontSize: 10, textAlign: 'center', fontWeight: 'bold' }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
});

// Connection banner
const ConnectionBanner = React.memo(function ConnectionBanner({ isConnected, onReconnect }) {
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
      <Ionicons name="warning" size={16} color="#856404" />
      <Text style={{ color: '#856404', fontSize: 14, marginLeft: spacing.sm, flex: 1 }}>
        Connection lost. Some features may not work.
      </Text>
      <TouchableOpacity 
        style={{ backgroundColor: '#856404', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
        onPress={onReconnect}
      >
        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Reconnect</Text>
      </TouchableOpacity>
    </View>
  );
});

// Chat item component (same implementation as before)
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
        
        {chat.type === 'one-on-one' && displayInfo.isOnline && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayInfo.name}
          </Text>
          <Text style={styles.time}>
            {formatTime(chat.messages?.[0]?.createdAt || chat.updatedAt)}
          </Text>
        </View>
        
        <View style={styles.messageContainer}>
          <Text style={styles.message} numberOfLines={2}>
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
  const token = useSelector(state => state.auth.token);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);

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
      marginHorizontal: spacing.xs,
    },
    retryButtonText: {
      color: colors.white,
      fontWeight: 'bold',
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    }
  });

  // Load rooms
  const loadRooms = useCallback(async () => {
    try {
      console.log('📥 Loading user rooms...');
      await dispatch(fetchUserRooms()).unwrap();
      console.log('✅ Rooms loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load rooms:', error);
      Alert.alert('Error', 'Failed to load conversations. Please check your connection and try again.');
    }
  }, [dispatch]);

  // SIMPLIFIED: Just set user ID and let socketService handle auto-connection
  useEffect(() => {
    if (currentUser && token) {
      console.log('🔄 Setting current user ID for auto-connection');
      dispatch(setCurrentUserId(currentUser.id));
      
      // Clear errors and load rooms
      dispatch(clearAllErrors());
      loadRooms();
    }
  }, [currentUser, token, dispatch, loadRooms]);

  // Screen focus effect
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Chat screen focused');
      
      if (currentUser && !loading.rooms) {
        loadRooms();
      }
    }, [currentUser, loading.rooms, loadRooms])
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh');
    setRefreshing(true);
    try {
      await loadRooms();
    } finally {
      setRefreshing(false);
    }
  }, [loadRooms]);

  const handleChatPress = useCallback((chat) => {
    console.log('💬 Opening chat:', chat.id, chat.name);
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
    console.log('➕ Opening new chat screen');
    router.push('/chat/new');
  }, [router]);

  const handleReconnect = useCallback(async () => {
    console.log('🔄 Manual reconnect');
    try {
      const success = await socketService.forceReconnect();
      if (!success) {
        Alert.alert('Reconnect Failed', 'Unable to reconnect. Please check your connection.');
      }
    } catch (error) {
      Alert.alert('Reconnect Error', error.message);
    }
  }, []);

  const handleRetry = useCallback(() => {
    console.log('🔄 Retry loading');
    dispatch(clearAllErrors());
    loadRooms();
  }, [dispatch, loadRooms]);

  const testServerConnection = useCallback(async () => {
    try {
      const response = await fetch('http://192.168.56.1:5000/health');
      const data = await response.json();
      Alert.alert(
        'Server Test Result', 
        `✅ Server is reachable!\n\nStatus: ${data.status}\nConnections: ${data.connections?.active || 0}\nUptime: ${data.uptime || 'unknown'}`
      );
    } catch (error) {
      Alert.alert(
        'Server Test Result', 
        `❌ Cannot reach server\n\nError: ${error.message}\n\nCheck if:\n- Server is running on 192.168.56.1:5000\n- Your device is on the same network\n- No firewall blocking the connection`
      );
    }
  }, []);

  // Render functions
  const renderChatItem = useCallback(({ item }) => (
    <ChatItem 
      chat={item} 
      onPress={handleChatPress} 
      currentUserId={currentUser?.id}
    />
  ), [handleChatPress, currentUser]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={70} color={colors.primary} />
      <Text style={styles.emptyText}>
        You don not have any conversations yet.{'\n\n'}
        Start a new chat to connect with others.
      </Text>
      {__DEV__ && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.retryButton} onPress={testServerConnection}>
            <Text style={styles.retryButtonText}>Test Server</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryButton} onPress={handleReconnect}>
            <Text style={styles.retryButtonText}>Connect Socket</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [styles, colors, testServerConnection, handleReconnect]);

  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error || '#F44336'} />
      <Text style={styles.errorText}>
        {errors.rooms || 'Failed to load conversations'}
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <TouchableOpacity style={styles.retryButton} onPress={testServerConnection}>
            <Text style={styles.retryButtonText}>Test Server</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [styles, colors, errors.rooms, handleRetry, testServerConnection]);

  // Loading state
  if (loading.rooms && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <DebugPanel />
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Messages</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { marginTop: spacing.md }]}>
            Loading conversations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Debug Panel */}
      <DebugPanel />
      
      {/* Connection Banner */}
      <ConnectionBanner isConnected={isConnected} onReconnect={handleReconnect} />
      
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
          <View style={[
            styles.connectionStatus, 
            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
          ]}>
            <Ionicons 
              name={isConnected ? 'checkmark' : 'close'} 
              size={10} 
              color="white" 
            />
          </View>
          
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      ) : (
        renderEmpty()
      )}
    </SafeAreaView>
  );
}