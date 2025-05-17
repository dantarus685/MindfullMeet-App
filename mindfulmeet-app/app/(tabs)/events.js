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

// Mock data for events
const events = [
  {
    id: '1',
    title: 'Community Meditation',
    date: 'Today at 7:00 PM',
    location: 'Central Park, NY',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '2',
    title: 'Anxiety Management Workshop',
    date: 'Tomorrow at 6:30 PM',
    location: 'Virtual Event',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '3',
    title: 'Mindfulness for Beginners',
    date: 'Wed, May 20 at 5:00 PM',
    location: 'Wellness Center, Brooklyn',
    image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '4',
    title: 'Stress Relief Yoga Session',
    date: 'Thu, May 21 at 8:00 AM',
    location: 'Harmony Yoga Studio',
    image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '5',
    title: 'Sleep Improvement Techniques',
    date: 'Fri, May 22 at 7:00 PM',
    location: 'Community Health Center',
    image: 'https://images.unsplash.com/photo-1455218873509-8097305ee378?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
  },
];

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
  
  return (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: event.image }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.dateRow}>
          <View style={styles.icon}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.detailText}>{event.date}</Text>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.icon}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.detailText}>{event.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function EventsScreen() {
  const { colors, spacing, isDark } = useTheme();
  
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
    }
  });

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
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}