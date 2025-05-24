import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Linking,
  Platform
} from 'react-native';
import { useTheme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../src/config/api';

// Map Preview Modal Component
const MapPreviewModal = ({ visible, onClose, location, title, address }) => {
  const { colors, spacing, typography } = useTheme();
  const [imageError, setImageError] = useState(false);

  const getStaticMapUrl = () => {
    const { latitude, longitude } = location;
    const zoom = 15;
    const size = '400x300';
    
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoom}/${size}@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA`;
  };

  const openInMaps = () => {
    const { latitude, longitude } = location;
    
    if (Platform.OS === 'web') {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      const url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}`,
      });
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
      });
    }
    onClose();
  };

  const modalStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    modalTitle: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      flex: 1,
      marginRight: spacing.md,
    },
    closeButton: {
      padding: spacing.xs,
    },
    mapContainer: {
      height: 250,
      position: 'relative',
    },
    mapImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    mapOverlay: {
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
      right: spacing.md,
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderRadius: 8,
      padding: spacing.sm,
    },
    overlayText: {
      color: colors.white,
      fontSize: typography.fontSizes.sm,
      textAlign: 'center',
    },
    fallbackContainer: {
      height: 250,
      backgroundColor: colors.lightGrey,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackIcon: {
      backgroundColor: colors.primary,
      borderRadius: 30,
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    addressContainer: {
      padding: spacing.lg,
    },
    addressText: {
      fontSize: typography.fontSizes.md,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.lightGrey,
      paddingVertical: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          {/* Header */}
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle} numberOfLines={2}>{title}</Text>
            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Map Preview */}
          <View style={modalStyles.mapContainer}>
            {!imageError ? (
              <>
                <Image
                  source={{ uri: getStaticMapUrl() }}
                  style={modalStyles.mapImage}
                  onError={() => setImageError(true)}
                />
                <View style={modalStyles.mapOverlay}>
                  <Text style={modalStyles.overlayText}>
                    Tap "Get Directions" to open in your maps app
                  </Text>
                </View>
              </>
            ) : (
              <View style={modalStyles.fallbackContainer}>
                <View style={modalStyles.fallbackIcon}>
                  <Ionicons name="location" size={28} color={colors.white} />
                </View>
                <Text style={modalStyles.overlayText}>Map preview unavailable</Text>
              </View>
            )}
          </View>

          {/* Address */}
          <View style={modalStyles.addressContainer}>
            <Text style={modalStyles.addressText}>{address}</Text>
          </View>

          {/* Action Buttons */}
          <View style={modalStyles.actionButtons}>
            <TouchableOpacity style={modalStyles.secondaryButton} onPress={onClose}>
              <Text style={modalStyles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.primaryButton} onPress={openInMaps}>
              <Text style={modalStyles.primaryButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const EventCard = ({ event }) => {
  const { colors, spacing, effects } = useTheme();
  const [showMapModal, setShowMapModal] = useState(false);
  
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
    placeholderImage: {
      width: '100%',
      height: 150,
      backgroundColor: colors.lightGrey,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    eventType: {
      fontSize: 11,
      color: colors.white,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      overflow: 'hidden',
    },
    hostText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    locationTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      paddingVertical: 2,
    },
    rsvpRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 6,
    },
    locationText: {
      fontSize: 14,
      color: colors.primary, // Make it look clickable
      marginLeft: 6,
      textDecorationLine: 'underline',
    },
    rsvpText: {
      fontSize: 12,
      color: colors.primary,
      marginLeft: 6,
      fontWeight: '500',
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

  // Format event type for display
  const formatEventType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
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

  const getFullAddress = () => {
    if (event.isOnline) {
      return 'Virtual Event';
    }
    
    const parts = [];
    if (event.address) parts.push(event.address);
    if (event.city) parts.push(event.city);
    if (event.state) parts.push(event.state);
    if (event.zipCode) parts.push(event.zipCode);
    
    return parts.join(', ') || 'Location unavailable';
  };

  const handleLocationPress = () => {
    if (!event.isOnline && event.latitude && event.longitude) {
      setShowMapModal(true);
    }
  };
  
  return (
    <>
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/events/${event.id}`)}
      >
        {event.imageUrl ? (
          <Image 
            source={{ uri: event.imageUrl }} 
            style={styles.image} 
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={colors.grey} />
          </View>
        )}
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.eventType}>
              {formatEventType(event.eventType)}
            </Text>
          </View>
          
          <Text style={styles.hostText}>by {event.host?.name}</Text>
          
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
            {!event.isOnline && event.latitude && event.longitude ? (
              <TouchableOpacity 
                style={styles.locationTouchable}
                onPress={handleLocationPress}
              >
                <Text style={styles.locationText}>{getLocationText()}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.detailText}>{getLocationText()}</Text>
            )}
          </View>
          
          {event.rsvpCount > 0 && (
            <View style={styles.rsvpRow}>
              <View style={styles.icon}>
                <Ionicons name="people-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.rsvpText}>
                {event.rsvpCount} {event.rsvpCount === 1 ? 'person' : 'people'} going
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Map Preview Modal */}
      {!event.isOnline && event.latitude && event.longitude && (
        <MapPreviewModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          location={{ latitude: event.latitude, longitude: event.longitude }}
          title={event.title}
          address={getFullAddress()}
        />
      )}
    </>
  );
};

export default function EventsScreen() {
  const { colors, spacing, isDark } = useTheme();
  const params = useLocalSearchParams();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(params.eventType || 'all');
  
  // Filter options
  const filterOptions = [
    { key: 'all', label: 'All Events' },
    { key: 'meditation', label: 'Meditation' },
    { key: 'support-group', label: 'Support Groups' },
    { key: 'therapy-session', label: 'Therapy' },
    { key: 'wellness-workshop', label: 'Wellness' },
    { key: 'nature-therapy', label: 'Nature' },
    { key: 'mindfulness-retreat', label: 'Mindfulness' },
  ];
  
  // Fetch events when component mounts or filter changes
  useEffect(() => {
    fetchEvents();
  }, [selectedFilter]);

  const fetchEvents = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      
      // Build query params
      let url = '/api/events?page=1&limit=50';
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents(true);
    setRefreshing(false);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerContent: {
      flex: 1,
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
    searchButton: {
      padding: spacing.sm,
    },
    filterContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.lightGrey,
      borderRadius: 20,
      marginRight: spacing.sm,
    },
    activeFilterChip: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      fontSize: 14,
      color: colors.darkGrey,
    },
    activeFilterChipText: {
      color: colors.white,
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Events</Text>
            <Text style={styles.subtitle}>Find events that match your interests</Text>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => router.push('/events/search')}
          >
            <Ionicons name="search-outline" size={24} color={colors.text} />
          </TouchableOpacity>
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Events</Text>
            <Text style={styles.subtitle}>Find events that match your interests</Text>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => router.push('/events/search')}
          >
            <Ionicons name="search-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchEvents()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={60} color={colors.grey} />
      <Text style={styles.emptyText}>
        {selectedFilter === 'all' 
          ? "No events found. Check back later for upcoming events!"
          : `No ${filterOptions.find(f => f.key === selectedFilter)?.label.toLowerCase()} events found.`
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Events</Text>
          <Text style={styles.subtitle}>Find events that match your interests</Text>
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push('/events/search')}
        >
          <Ionicons name="search-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
        >
          {filterOptions.map(filter => (
            <TouchableOpacity 
              key={filter.key}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.activeFilterChip
              ]}
              onPress={() => handleFilterChange(filter.key)}
            >
              <Text style={[
                styles.filterChipText, 
                selectedFilter === filter.key && styles.activeFilterChipText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Events List */}
      <FlatList
        data={events}
        renderItem={({ item }) => <EventCard event={item} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}