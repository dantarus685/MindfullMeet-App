import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity,
  Image 
} from 'react-native';
import { useTheme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Mock data for chats
const chats = [
  {
    id: '1',
    name: 'Mindfulness Group',
    avatar: 'https://images.unsplash.com/photo-1545389336-cf090694435e?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80',
    lastMessage: 'Sarah: Is anyone joining the meditation session tonight?',
    time: '10:30 AM',
    unread: 3,
    isGroup: true,
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80',
    lastMessage: 'Looking forward to our session tomorrow',
    time: 'Yesterday',
    unread: 0,
    isGroup: false,
  },
  {
    id: '3',
    name: 'Anxiety Support',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80',
    lastMessage: 'Emma: Thank you all for sharing your experiences',
    time: 'Monday',
    unread: 1,
    isGroup: true,
  },
  {
    id: '4',
    name: 'Wellness Buddies',
    avatar: 'https://images.unsplash.com/photo-1532635241-17e820acc59f?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80',
    lastMessage: 'Jason: I found a great new yoga studio!',
    time: 'Sunday',
    unread: 0,
    isGroup: true,
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80',
    lastMessage: 'Can you send me the sleep meditation link?',
    time: 'May 12',
    unread: 0,
    isGroup: false,
  },
];

const ChatItem = ({ chat }) => {
  const { colors, spacing, effects } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    avatar: {
      width: 55,
      height: 55,
      borderRadius: 27.5,
      marginRight: spacing.md,
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
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
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
  });
  
  return (
    <TouchableOpacity style={styles.container}>
      <Image source={{ uri: chat.avatar }} style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {chat.name}
            {chat.isGroup && ' '}
            {chat.isGroup && <Ionicons name="people" size={14} color={colors.primary} />}
          </Text>
          <Text style={styles.time}>{chat.time}</Text>
        </View>
        <View style={styles.messageContainer}>
          <Text style={styles.message} numberOfLines={1}>{chat.lastMessage}</Text>
          {chat.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{chat.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatScreen() {
  const { colors, spacing, isDark } = useTheme();
  
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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
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
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newChatButton}>
          <Ionicons name="create-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
      
      {chats.length > 0 ? (
        <FlatList
          data={chats}
          renderItem={({ item }) => <ChatItem chat={item} />}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={70} color={colors.primary} />
          <Text style={styles.emptyText}>
            You dont have any conversations yet. Start a new chat to connect with support groups and wellness coaches.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}