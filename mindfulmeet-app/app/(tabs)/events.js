import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import api from '../../src/config/api';

const EventCard = ({ event }) => {
  const { colors, spacing, effects } = useTheme();
  
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...effects.shadows.medium,
    },
    image: {
      width: '100%',
      height: 150,
    },
    content: {
      padding: spacing.md,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 6,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 6,
    },
    icon: {
      width: 16,
      alignItems: 'center',
    }
  });

  // Format the date from the API
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Determine location text based on event data
  const getLocationText = () => {
    if (event.isOnline) {
      return 'Virtual Event';
    } else if (event.city && event.state) {
      return `${event.city}, ${event.state}`;
    } else {
      return event.address || 'Location unavailable';
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/events/${event.id}`)}
    >
      <Image 
        source={{ uri: event.imageUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' }} 
        style={styles.image} 
      />
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.dateRow}>
          <View style={styles.icon}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.detailText}>{formatDate(event.startTime)}</Text>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.icon}>
            <Ionicons 
              name={event.isOnline ? "globe-outline" : "location-outline"} 
              size={16} 
              color={colors.primary} 
            />
          </View>
          <Text style={styles.detailText}>{getLocationText()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function EventsScreen() {
  const { colors, spacing, isDark } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch events when component mounts
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/events');
      setEvents(response.data.data.events);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load events. Please try again later.');
      setLoading(false);
    }
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.white,
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 16,
      textAlign: 'center',
    }
  });

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Events</Text>
          <Text style={styles.subtitle}>Find events that match your interests</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Events</Text>
          <Text style={styles.subtitle}>Find events that match your interests</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchEvents}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No events found. Check back later for upcoming events!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Events</Text>
        <Text style={styles.subtitle}>Find events that match your interests</Text>
      </View>
      
      <FlatList
        data={events}
        renderItem={({ item }) => <EventCard event={item} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}