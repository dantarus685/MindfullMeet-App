// src/screens/profile/ProfileScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  RefreshControl,
  Alert 
} from 'react-native';
import { useTheme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/authSlice';
import { router } from 'expo-router';

// Try to import profile actions, but don't break if they don't exist
let profileActions = {};
try {
  profileActions = require('../../redux/profileSlice');
} catch (error) {
  console.log('Profile slice not found, using basic profile data');
}

const ProfileStatCard = ({ stat }) => {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: spacing.md,
      alignItems: 'center',
      marginHorizontal: spacing.xs,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    value: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    label: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={stat.icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.value}>{stat.value}</Text>
      <Text style={styles.label}>{stat.label}</Text>
    </View>
  );
};

const ActivityItem = ({ activity }) => {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    date: {
      fontSize: 14,
      color: colors.textSecondary,
    }
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={activity.icon} size={20} color={activity.iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.date}>{activity.date}</Text>
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const { colors, spacing, typography, effects, isDark } = useTheme();
  const dispatch = useDispatch();
  
  // Redux state - safely access profile data
  const authState = useSelector(state => state.auth);
  const profileState = useSelector(state => state.profile || {});
  const [refreshing, setRefreshing] = useState(false);

  // Get user data with fallbacks
  const profile = profileState.data || profileState.profile;
  const userData = profile || authState.user || {
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Mindfulness practitioner and mental health advocate. Enjoys meditation, yoga, and nature walks.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  };

  // Console log data for debugging
  console.log('🔍 ProfileScreen Data Debug:');
  console.log('Auth User:', authState.user);
  console.log('Profile State:', profileState);
  console.log('Final User Data:', userData);

  // Safe data parsing functions
  const getInterests = () => {
    if (!userData?.interests) return [];
    
    if (Array.isArray(userData.interests)) {
      return userData.interests;
    }
    
    if (typeof userData.interests === 'string') {
      try {
        const parsed = JSON.parse(userData.interests);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return userData.interests.split(',').map(item => item.trim()).filter(Boolean);
      }
    }
    
    return [];
  };

  const getSkills = () => {
    if (!userData?.skills) return [];
    
    if (Array.isArray(userData.skills)) {
      return userData.skills;
    }
    
    if (typeof userData.skills === 'string') {
      try {
        const parsed = JSON.parse(userData.skills);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return userData.skills.split(',').map(item => item.trim()).filter(Boolean);
      }
    }
    
    return [];
  };

  // Create stats data
  const userStats = [
    {
      label: 'Events Attended',
      value: userData.eventsAttended || 12,
      icon: 'calendar'
    },
    {
      label: 'Active Groups',
      value: userData.groupsCount || 3,
      icon: 'people'
    },
    {
      label: 'Posts',
      value: userData.postsCount || 8,
      icon: 'document-text'
    }
  ];

  // Activity history data
  const activityHistory = [
    {
      id: '1',
      type: 'event',
      title: 'Morning Meditation',
      date: 'Yesterday',
      icon: 'sunny-outline',
      iconColor: '#8BBBD9'
    },
    {
      id: '2',
      type: 'group',
      title: 'Joined Anxiety Support Group',
      date: 'May 14',
      icon: 'people-outline',
      iconColor: '#F4B9B2'
    },
    {
      id: '3',
      type: 'post',
      title: 'Shared "My Mindfulness Journey"',
      date: 'May 10',
      icon: 'document-text-outline',
      iconColor: '#C8D5B9'
    }
  ];

  const interests = getInterests();
  const skills = getSkills();

  // Load profile data if available
  useEffect(() => {
    if (profileActions.getUserProfile && authState.isAuthenticated) {
      console.log('🔄 Loading profile data...');
      try {
        dispatch(profileActions.getUserProfile());
      } catch (error) {
        console.log('Profile loading not available:', error.message);
      }
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (profileActions.getUserProfile && authState.isAuthenticated) {
      try {
        await dispatch(profileActions.getUserProfile());
      } catch (error) {
        console.log('Refresh failed:', error.message);
      }
    }
    setRefreshing(false);
  };
  
  const handleLogout = () => {
    console.log('🔄 User logging out...');
    dispatch(logout());
    router.replace('/auth/login');
  };

  const handleEditProfile = () => {
    try {
      router.push('/profile/edit');
    } catch (error) {
      Alert.alert('Info', 'Edit profile feature will be available soon!');
    }
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: spacing.md,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    editButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    bio: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'center',
      marginHorizontal: spacing.xl,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    sectionHeader: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    activityContainer: {
      paddingHorizontal: spacing.lg,
    },
    interestsSection: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.sm,
    },
    tag: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      marginBottom: 8,
    },
    tagText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '500',
    },
    settingsSection: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    settingIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    settingText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    settingIcon: {
      color: colors.darkGrey,
    },
    logoutButton: {
      marginTop: spacing.lg,
      backgroundColor: colors.error,
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
    },
    logoutText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ 
                uri: userData.profilePicture || userData.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80'
              }} 
              style={styles.avatar} 
            />
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>
            {userData.name || userData.firstName || 'User'}
          </Text>
          <Text style={styles.email}>
            {userData.email || 'No email'}
          </Text>
          <Text style={styles.bio}>
            {userData.bio || 'Mindfulness practitioner and mental health advocate. Enjoys meditation, yoga, and nature walks.'}
          </Text>
        </View>
        
        <View style={styles.statsContainer}>
          {userStats.map((stat, index) => (
            <ProfileStatCard key={index} stat={stat} />
          ))}
        </View>

        {/* Interests Section */}
        {interests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Interests</Text>
            </View>
            <View style={styles.interestsSection}>
              <View style={styles.tagsContainer}>
                {interests.map((interest, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Skills Section */}
        {skills.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Skills</Text>
            </View>
            <View style={styles.interestsSection}>
              <View style={styles.tagsContainer}>
                {skills.map((skill, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                    <Text style={styles.tagText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        
        <View style={styles.activityContainer}>
          {activityHistory.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </View>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Settings</Text>
        </View>
        
        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.settingText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} style={styles.settingIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} style={styles.settingIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="shield-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.settingText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} style={styles.settingIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.primary} />
            </View>
            <Text style={styles.settingText}>Appearance</Text>
            <Ionicons name="chevron-forward" size={20} style={styles.settingIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}