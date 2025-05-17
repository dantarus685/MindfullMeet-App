import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  FlatList,
  useColorScheme
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Mock data for events
const upcomingEvents = [
  {
    id: '1',
    title: 'Morning Meditation',
    host: 'Sarah Johnson',
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    date: 'Today • 8:00 AM',
    type: 'meditation'
  },
  {
    id: '2',
    title: 'Anxiety Support Group',
    host: 'Dr. Michael Chen',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    date: 'Tomorrow • 5:30 PM',
    type: 'support-group'
  },
  {
    id: '3',
    title: 'Nature Therapy Walk',
    host: 'Emma Roberts',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    date: 'Wed, May 20 • 10:00 AM',
    type: 'nature-therapy'
  }
];

const popularCategories = [
  {
    id: '1',
    title: 'Meditation',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#8BBBD9'
  },
  {
    id: '2',
    title: 'Support Groups',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#F4B9B2'
  },
  {
    id: '3',
    title: 'Therapy Sessions',
    image: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#C8D5B9'
  },
  {
    id: '4',
    title: 'Mindfulness',
    image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#5B8E7D'
  },
];

const forYou = [
  {
    id: '1',
    title: 'Stress Relief Workshop',
    host: 'Dr. Amanda Lee',
    image: 'https://images.unsplash.com/photo-1516383607781-913a19294fd1?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    date: 'Thu, May 21 • 6:00 PM',
    type: 'workshop'
  },
  {
    id: '2',
    title: 'Mindful Breathing',
    host: 'Jason Morris',
    image: 'https://images.unsplash.com/photo-1497561813398-8fcc7a37b567?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    date: 'Fri, May 22 • 7:30 AM',
    type: 'meditation'
  },
  {
    id: '3',
    title: 'Sleep Improvement Seminar',
    host: 'Lisa Thompson',
    image: 'https://images.unsplash.com/photo-1530786599993-b2fdb8aedd73?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    date: 'Sat, May 23 • 8:00 PM',
    type: 'seminar'
  }
];
// Event Card Component// Fixed EventCard Component
// Fixed EventCard Component
const EventCard = ({ event, size = 'large' }) => {
  const { colors, spacing, effects, isDark } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      marginRight: spacing.md,
      width: size === 'large' ? 200 : 160,
      marginBottom: spacing.sm,
    },
    imageContainer: {
      width: '100%',
      height: size === 'large' ? 160 : 120,
      borderRadius: effects.borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.xs,
      ...effects.shadows.light,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    title: {
      fontWeight: '700',
      fontSize: size === 'large' ? 16 : 14,
      color: colors.text, // Use the theme's text color instead of hardcoded 'white'
      marginBottom: 2,
    },
    subtitle: {
      color: colors.textSecondary, // Use the theme's secondary text color
      fontSize: size === 'large' ? 14 : 12,
    },
    date: {
      color: colors.grey,
      fontSize: size === 'large' ? 12 : 10,
      marginTop: 2,
    },
    
  });

  return (
    <TouchableOpacity style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.image }} style={styles.image} />
      </View>
      <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>by {event.host}</Text>
      <Text style={styles.date}>{event.date}</Text>
    </TouchableOpacity>
  );
};


// Category Card Component
const CategoryCard = ({ category }) => {
  const { spacing, effects, typography } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      width: 160,
      height: 100,
      borderRadius: effects.borderRadius.md,
      overflow: 'hidden',
      marginRight: spacing.md,
      backgroundColor: category.color,
      justifyContent: 'center',
      padding: spacing.sm,
      ...effects.shadows.light,
    },
    title: {
      color: 'white',
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
    }
  });

  return (
    <TouchableOpacity style={styles.container}>
      <Text style={styles.title}>{category.title}</Text>
    </TouchableOpacity>
  );
};

// Bottom Navigation Item
const NavItem = ({ icon, label, active, onPress }) => {
  const { colors, spacing } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    icon: {
      marginBottom: 4,
    },
    label: {
      color: active ? colors.primary : colors.darkGrey,
      fontSize: 12,
      fontWeight: active ? '500' : 'normal',
    }
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Ionicons 
        name={icon} 
        size={24} 
        color={active ? colors.primary : colors.darkGrey} 
        style={styles.icon} 
      />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const { 
    colors, 
    typography, 
    spacing, 
    effects, 
    isDark, 
    toggleTheme 
  } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    greeting: {
      fontSize: typography.fontSizes.xl,
      fontWeight: typography.fontWeights.bold,
      color: isDark ? colors.black : colors.black, // Fixed for light mode visibility
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    themeToggle: {
      marginRight: spacing.md,
      padding: spacing.xs,
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInitial: {
      color: colors.white,
      fontWeight: typography.fontWeights.bold,
      fontSize: typography.fontSizes.md,
    },
    sectionHeader: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.black,
    },
    seeAllButton: {
      color: colors.primary,
      fontSize: typography.fontSizes.sm,
    },
    eventList: {
      paddingLeft: spacing.lg,
      marginBottom: spacing.lg,
    },
    featuredEvent: {
      height: 180,
      borderRadius: effects.borderRadius.md,
      overflow: 'hidden',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.xl,
      ...effects.shadows.medium,
    },
    featuredImage: {
      width: '100%',
      height: '100%',
    },
    featuredContent: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      padding: spacing.lg,
      justifyContent: 'flex-end',
    },
    featuredTitle: {
      color: colors.white,
      fontSize: typography.fontSizes.xl,
      fontWeight: typography.fontWeights.bold,
      marginBottom: spacing.xs,
    },
    featuredSubtitle: {
      color: colors.white,
      fontSize: typography.fontSizes.md,
    },
    contentContainer: {
      paddingBottom: 90, // Add padding to account for the tab bar
    },
    filterChips: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.lightGrey,
      borderRadius: effects.borderRadius.round,
      marginRight: spacing.sm,
    },
    activeChip: {
      backgroundColor: colors.primary,
    },
    chipText: {
      color: colors.darkGrey,
      fontSize: typography.fontSizes.sm,
    },
    activeChipText: {
      color: colors.white,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.lightGrey,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 70,
      ...effects.shadows.light,
    },
    categoryList: {
      paddingLeft: spacing.lg,
      marginBottom: spacing.lg,
    },
    searchBar: {
      flexDirection: 'row',
      backgroundColor: colors.lightGrey,
      borderRadius: effects.borderRadius.md,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      color: colors.darkGrey,
      fontSize: typography.fontSizes.md,
    },
  });

  const renderTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.greeting}>{renderTimeBasedGreeting()}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.themeToggle} 
            onPress={toggleTheme}
          >
            <Ionicons 
              name={isDark ? 'sunny-outline' : 'moon-outline'} 
              size={24} 
              color={colors.darkGrey} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.profileInitial}>J</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <TouchableOpacity style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.darkGrey} style={styles.searchIcon} />
          <Text style={styles.searchInput}>Search for events, groups...</Text>
        </TouchableOpacity>
        
        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterChips}
        >
          <TouchableOpacity style={[styles.chip, styles.activeChip]}>
            <Text style={[styles.chipText, styles.activeChipText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Meditation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Support Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Therapy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Nature</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Featured Event */}
        <TouchableOpacity style={styles.featuredEvent}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' }} 
            style={styles.featuredImage} 
          />
          <View style={styles.featuredContent}>
            <Text style={styles.featuredTitle}>Wellness Festival</Text>
            <Text style={styles.featuredSubtitle}>May 25-26 • Central Park</Text>
          </View>
        </TouchableOpacity>
        
        {/* Upcoming Events Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <Text style={styles.seeAllButton}>See All</Text>
        </View>
        
        <FlatList
          data={upcomingEvents}
          renderItem={({ item }) => <EventCard event={item} />}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.eventList}
        />
        
        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Text style={styles.seeAllButton}>See All</Text>
        </View>
        
        <FlatList
          data={popularCategories}
          renderItem={({ item }) => <CategoryCard category={item} />}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
        />
        
        {/* For You Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>For You</Text>
          <Text style={styles.seeAllButton}>See All</Text>
        </View>
        
        <FlatList
          data={forYou}
          renderItem={({ item }) => <EventCard event={item} size="medium" />}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.eventList}
        />
      </ScrollView>
      
      {/* Bottom Tab Bar
      <View style={styles.tabBar}>
        <NavItem 
          icon="home" 
          label="Home" 
          active={true} 
          onPress={() => {}} 
        />
        <NavItem 
          icon="calendar-outline" 
          label="Events" 
          onPress={() => {}} 
        />
        <NavItem 
          icon="chatbubbles-outline" 
          label="Chat" 
          onPress={() => {}} 
        />
        <NavItem 
          icon="add-circle-outline" 
          label="Create" 
          onPress={() => {}} 
        />
        <NavItem 
          icon="person-outline" 
          label="Profile" 
          onPress={() => router.push('/profile')} 
        />
      </View> */}
    </SafeAreaView>
  );
}