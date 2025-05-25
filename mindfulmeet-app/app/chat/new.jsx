// app/chat/new.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../../src/constants/theme';
import { createRoom } from '../../src/redux/chatSlice';
import UserAvatar from '../../src/components/common/UserAvatar';
import api from '../../src/config/api';

export default function NewChatScreen() {
  const { colors, spacing, isDark } = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chatType, setChatType] = useState('one-on-one'); // 'one-on-one' or 'group'
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const currentUser = useSelector(state => state.auth.user);

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
    },
    backButton: {
      padding: spacing.sm,
      marginRight: spacing.sm,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    createButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    createButtonDisabled: {
      backgroundColor: colors.textSecondary,
    },
    createButtonText: {
      color: colors.white,
      fontWeight: 'bold',
    },
    searchContainer: {
      padding: spacing.md,
    },
    searchInput: {
      backgroundColor: colors.lightGrey,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 16,
      color: colors.text,
    },
    typeToggle: {
      flexDirection: 'row',
      margin: spacing.md,
      backgroundColor: colors.lightGrey,
      borderRadius: 10,
      padding: 4,
    },
    typeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 6,
      alignItems: 'center',
    },
    typeButtonActive: {
      backgroundColor: colors.primary,
    },
    typeButtonText: {
      color: colors.textSecondary,
      fontWeight: 'bold',
    },
    typeButtonTextActive: {
      color: colors.white,
    },
    groupNameContainer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    groupNameInput: {
      backgroundColor: colors.lightGrey,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 16,
      color: colors.text,
    },
    selectedContainer: {
      paddingHorizontal: spacing.md,
    },
    selectedTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    selectedList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.md,
    },
    selectedUser: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginRight: spacing.sm,
      marginBottom: spacing.xs,
    },
    selectedUserText: {
      color: colors.white,
      marginLeft: spacing.xs,
      fontSize: 14,
    },
    removeButton: {
      marginLeft: spacing.xs,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    userInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    userName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    userRole: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    loadingContainer: {
      padding: spacing.lg,
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
    }
  });

  // Search for users
  useEffect(() => {
    if (searchQuery.length > 0) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    if (searching) return;
    
    setSearching(true);
    try {
      const response = await api.get(`/api/users?search=${encodeURIComponent(searchQuery)}&limit=20`);
      // Filter out current user
      const filteredUsers = response.data.data.users.filter(user => user.id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Search users error:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleUserSelect = (user) => {
    if (chatType === 'one-on-one') {
      // For one-on-one, replace selection
      setSelectedUsers([user]);
    } else {
      // For group, toggle selection
      const isSelected = selectedUsers.some(u => u.id === user.id);
      if (isSelected) {
        setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user to chat with.');
      return;
    }

    if (chatType === 'group' && !groupName.trim()) {
      Alert.alert('Error', 'Please enter a name for the group chat.');
      return;
    }

    setLoading(true);
    try {
      const roomData = {
        name: chatType === 'group' ? groupName.trim() : `Chat with ${selectedUsers[0].name}`,
        type: chatType,
        participantIds: selectedUsers.map(u => u.id)
      };

      const result = await dispatch(createRoom(roomData)).unwrap();
      
      // Navigate to the new chat room
      router.replace({
        pathname: '/chat/[id]',
        params: {
          id: result.data.room.id,
          name: roomData.name,
          type: chatType
        }
      });
    } catch (error) {
      console.error('Create chat error:', error);
      Alert.alert('Error', error || 'Failed to create chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = selectedUsers.length > 0 && 
    (chatType === 'one-on-one' || (chatType === 'group' && groupName.trim().length > 0));

  const renderSelectedUser = ({ item }) => (
    <View style={styles.selectedUser}>
      <UserAvatar user={item} size={20} />
      <Text style={styles.selectedUserText}>{item.name}</Text>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => handleRemoveUser(item.id)}
      >
        <Ionicons name="close" size={16} color={colors.white} />
      </TouchableOpacity>
    </View>
  );

  const renderUser = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.userItem, isSelected && { backgroundColor: colors.lightGrey }]}
        onPress={() => handleUserSelect(item)}
      >
        <UserAvatar user={item} size={40} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userRole}>
            {item.role === 'support-member' ? 'Support Member' : 'Member'}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
        <TouchableOpacity 
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreateChat}
          disabled={!canCreate || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Chat Type Toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity 
          style={[styles.typeButton, chatType === 'one-on-one' && styles.typeButtonActive]}
          onPress={() => {
            setChatType('one-on-one');
            setSelectedUsers(selectedUsers.slice(0, 1)); // Keep only first user
          }}
        >
          <Text style={[
            styles.typeButtonText, 
            chatType === 'one-on-one' && styles.typeButtonTextActive
          ]}>
            Direct Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeButton, chatType === 'group' && styles.typeButtonActive]}
          onPress={() => setChatType('group')}
        >
          <Text style={[
            styles.typeButtonText, 
            chatType === 'group' && styles.typeButtonTextActive
          ]}>
            Group Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Name Input */}
      {chatType === 'group' && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Enter group name..."
            placeholderTextColor={colors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
        </View>
      )}

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>
            Selected ({selectedUsers.length})
          </Text>
          <FlatList
            data={selectedUsers}
            renderItem={renderSelectedUser}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedList}
          />
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for users..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* User List */}
      {searching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Searching users...</Text>
        </View>
      ) : users.length > 0 ? (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={60} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            No users found for {searchQuery}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            Search for users to start a new chat
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}