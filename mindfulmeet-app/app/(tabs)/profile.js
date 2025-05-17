import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Image, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { useTheme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../src/redux/authSlice';
import { router } from 'expo-router';

// Stats data
const userStats = [
  {
    label: 'Events Attended',
    value: 12,
    icon: 'calendar'
  },
  {
    label: 'Active Groups',
    value: 3,
    icon: 'people'
  },
  {
    label: 'Posts',
    value: 8,
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
  },
  {
    id: '4',
    type: 'event',
    title: 'Nature Therapy Walk',
    date: 'May 8',
    icon: 'leaf-outline',
    iconColor: '#5B8E7D'
  },
];

const ProfileStatCard = ({ stat }) => {
  const { colors, spacing, typography } = useTheme();
  
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
      backgroundColor: colors.primary + '20', // 20% opacity
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
  const { colors, spacing, typography } = useTheme();
  
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
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  // If we have a real user from Redux, use their data, otherwise use placeholder
  const userData = user || {
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Mindfulness practitioner and mental health advocate. Enjoys meditation, yoga, and nature walks.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
  };
  
  const handleLogout = () => {
    dispatch(logout());
    router.replace('/auth/login');
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
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          <Text style={styles.bio}>{userData.bio}</Text>
        </View>
        
        <View style={styles.statsContainer}>
          {userStats.map((stat, index) => (
            <ProfileStatCard key={index} stat={stat} />
          ))}
        </View>
        
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
          <TouchableOpacity style={styles.settingItem}>
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