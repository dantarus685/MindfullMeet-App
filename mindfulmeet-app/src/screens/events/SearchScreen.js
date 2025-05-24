// src/screens/events/SearchScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../constants/theme';
import { useSelector, useDispatch } from 'react-redux';
import { fetchEvents } from '../../redux/eventSlice';
import { format, isToday, isTomorrow } from 'date-fns';

const SearchScreen = () => {
  const { colors, spacing, typography, isDark } = useTheme();
  const dispatch = useDispatch();
  
  const { events, loading } = useSelector(state => state.events);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    backButton: {
      marginRight: spacing.md,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.lightGrey,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.fontSizes.md,
      color: colors.text,
    },
    searchResults: {
      flex: 1,
      padding: spacing.lg,
    },
    resultItem: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.md,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    eventImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: spacing.md,
    },
    placeholderImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: colors.lightGrey,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    eventInfo: {
      flex: 1,
    },
    eventTitle: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      marginBottom: 4,
    },
    eventHost: {
      fontSize: typography.fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    eventDate: {
      fontSize: typography.fontSizes.sm,
      color: colors.primary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: typography.fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const formatEventDate = (startTime) => {
    const eventDate = new Date(startTime);
    if (isToday(eventDate)) {
      return `Today • ${format(eventDate, 'h:mm a')}`;
    } else if (isTomorrow(eventDate)) {
      return `Tomorrow • ${format(eventDate, 'h:mm a')}`;
    } else {
      return `${format(eventDate, 'MMM d')} • ${format(eventDate, 'h:mm a')}`;
    }
  };

  const performSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setFilteredEvents([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      await dispatch(fetchEvents({ 
        page: 1, 
        limit: 50, 
        searchTerm: term 
      })).unwrap();
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [dispatch]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, performSearch]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.host?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents([]);
    }
  }, [events, searchTerm]);

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/events/${item.id}`)}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
      ) : (
        <View style={styles.placeholderImage}>
          <Ionicons name="image-outline" size={24} color={colors.grey} />
        </View>
      )}
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.eventHost} numberOfLines={1}>
          by {item.host?.name}
        </Text>
        <Text style={styles.eventDate}>
          {formatEventDate(item.startTime)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isSearching || loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (!searchTerm.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={60} color={colors.grey} />
          <Text style={styles.emptyText}>
            Search for events, groups, or hosts
          </Text>
        </View>
      );
    }

    if (filteredEvents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="help-circle-outline" size={60} color={colors.grey} />
          <Text style={styles.emptyText}>
            No events found for "{searchTerm}"
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={colors.grey}
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoFocus
          returnKeyType="search"
        />
      </View>
      
      <View style={styles.searchResults}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;