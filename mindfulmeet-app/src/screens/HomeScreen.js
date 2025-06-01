// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSelector } from 'react-redux';
import { format, isToday, isTomorrow } from 'date-fns';
import api from '../config/api';

// Category mapping for backend event types
const popularCategories = [
  {
    id: '1',
    title: 'Meditation',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#8BBBD9',
    eventType: 'meditation'
  },
  {
    id: '2',
    title: 'Support Groups',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#F4B9B2',
    eventType: 'support-group'
  },
  {
    id: '3',
    title: 'Therapy Sessions',
    image: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#C8D5B9',
    eventType: 'therapy-session'
  },
  {
    id: '4',
    title: 'Mindfulness',
    image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
    color: '#5B8E7D',
    eventType: 'mindfulness-retreat'
  },
];

// EventCard Component
const EventCard = ({ event, size = 'large' }) => {
  const { colors, spacing, effects } = useTheme();
  
  const formatEventDate = (startTime) => {
    const eventDate = new Date(startTime);
    if (isToday(eventDate)) {
      return `Today • ${format(eventDate, 'h:mm a')}`;
    } else if (isTomorrow(eventDate)) {
      return `Tomorrow • ${format(eventDate, 'h:mm a')}`;
    } else {
      return `${format(eventDate, 'EEE, MMM d')} • ${format(eventDate, 'h:mm a')}`;
    }
  };
  
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
    placeholderImage: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.lightGrey,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontWeight: '700',
      fontSize: size === 'large' ? 16 : 14,
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: size === 'large' ? 14 : 12,
    },
    date: {
      color: colors.grey,
      fontSize: size === 'large' ? 12 : 10,
      marginTop: 2,
    },
    rsvpCount: {
      color: colors.primary,
      fontSize: size === 'large' ? 11 : 9,
      marginTop: 1,
      fontWeight: '500',
    },
  });

  const handlePress = () => {
    router.push(`/events/${event.id}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.imageContainer}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={30} color={colors.grey} />
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>by {event.host?.name}</Text>
      <Text style={styles.date}>{formatEventDate(event.startTime)}</Text>
      {event.rsvpCount > 0 && (
        <Text style={styles.rsvpCount}>
          {event.rsvpCount} {event.rsvpCount === 1 ? 'person' : 'people'} going
        </Text>
      )}
    </TouchableOpacity>
  );
};

// CategoryCard Component
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

  const handlePress = () => {
    router.push({
      pathname: '/(tabs)/events',
      params: { eventType: category.eventType }
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Text style={styles.title}>{category.title}</Text>
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
  
  // Get user from Redux (for auth state)
  const { user } = useSelector(state => state.auth);
  
  // Local state for events
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [featuredEvent, setFeaturedEvent] = useState(null);
  
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
      color: colors.text,
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
      color: colors.text,
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
      backgroundColor: 'rgba(98, 20, 20, 0.69)',
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
      paddingBottom: 90,
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
    loadingContainer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    emptyContainer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: typography.fontSizes.md,
      textAlign: 'center',
    },
    errorContainer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    errorText: {
      color: colors.error,
      fontSize: typography.fontSizes.md,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: effects.borderRadius.md,
    },
    retryButtonText: {
      color: colors.white,
      fontWeight: typography.fontWeights.medium,
    },
  });

  // Get upcoming events (next 7 days)
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.startTime);
    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    return eventDate > now && eventDate <= nextWeek;
  }).slice(0, 10);

  // Get recommended events (based on user's past RSVPs or popular events)
  const recommendedEvents = events.filter(event => {
    const eventDate = new Date(event.startTime);
    return eventDate > new Date();
  }).slice(0, 10);

  // Fetch events function
  const fetchEvents = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      
      // Build query params
      let url = '/api/events?page=1&limit=20';
      if (selectedFilter !== 'all') {
        url += `&eventType=${selectedFilter}`;
      }
      
      const response = await api.get(url);
      setEvents(response.data.data.events);
      
      if (!isRefresh) setLoading(false);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load events. Please try again later.');
      if (!isRefresh) setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchEvents();
  }, [selectedFilter]);

  // Set featured event when events are loaded
  useEffect(() => {
    if (events.length > 0 && !featuredEvent) {
      // Find an event with high RSVP count or recent event
      const featured = events.find(event => 
        event.rsvpCount > 5 || 
        event.eventType === 'wellness-workshop'
      ) || events[0];
      setFeaturedEvent(featured);
    }
  }, [events]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(true);
    setRefreshing(false);
  }, [selectedFilter]);

  const handleFilterChange = async (filter) => {
    setSelectedFilter(filter);
  };

  const handleSearch = () => {
    router.push('/events/search');
  };

  const handleSeeAllEvents = () => {
    router.push('/(tabs)/events');
  };

  const renderTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name?.split(' ')[0] || 'there';
    
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    
    return `${greeting}, ${name}`;
  };

  const renderFeaturedEvent = () => {
    if (!featuredEvent) return null;

    return (
      <TouchableOpacity 
        style={styles.featuredEvent}
        onPress={() => router.push(`/events/${featuredEvent.id}`)}
      >
        {featuredEvent.imageUrl ? (
          <Image 
            source={{ uri: featuredEvent.imageUrl }} 
            style={styles.featuredImage} 
          />
        ) : (
          <View style={[styles.featuredImage, { backgroundColor: colors.primary }]} />
        )}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>{featuredEvent.title}</Text>
          <Text style={styles.featuredSubtitle}>
            {format(new Date(featuredEvent.startTime), 'MMM d')} • {featuredEvent.host?.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventList = (eventList, emptyMessage) => {
    if (loading && eventList.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    if (eventList.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={eventList}
        renderItem={({ item }) => <EventCard event={item} />}
        keyExtractor={item => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.eventList}
      />
    );
  };

  const filterChips = [
    { key: 'all', label: 'All' },
    { key: 'meditation', label: 'Meditation' },
    { key: 'support-group', label: 'Support Groups' },
    { key: 'therapy-session', label: 'Therapy' },
    { key: 'nature-therapy', label: 'Nature' },
  ];

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
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.profileInitial}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Search Bar */}
        <TouchableOpacity style={styles.searchBar} onPress={handleSearch}>
          <Ionicons name="search" size={20} color={colors.darkGrey} style={styles.searchIcon} />
          <Text style={styles.searchInput}>Search for events, groups...</Text>
        </TouchableOpacity>
        
        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterChips}
        >
          {filterChips.map(filter => (
            <TouchableOpacity 
              key={filter.key}
              style={[styles.chip, selectedFilter === filter.key && styles.activeChip]}
              onPress={() => handleFilterChange(filter.key)}
            >
              <Text style={[
                styles.chipText, 
                selectedFilter === filter.key && styles.activeChipText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Featured Event */}
        {renderFeaturedEvent()}
        
        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => fetchEvents()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Upcoming Events Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={handleSeeAllEvents}>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {renderEventList(upcomingEvents, "No upcoming events found. Try adjusting your filters.")}
        
        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={handleSeeAllEvents}>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
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
          <TouchableOpacity onPress={handleSeeAllEvents}>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {renderEventList(recommendedEvents, "No recommendations available yet.")}
      </ScrollView>
    </SafeAreaView>
  );
}