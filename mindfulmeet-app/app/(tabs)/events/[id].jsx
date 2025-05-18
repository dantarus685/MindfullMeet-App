import React, { useState, useEffect, useCallback, useRef } from 'react';
// Add Platform and TextInput to your React Native imports
// import MapViewComponent from '../../../src/components/common/MapView';
import MapComponent from '../../../src/components/common/MapComponent';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons} from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/constants/theme';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchEventById,
  deleteEvent,
  clearCurrentEvent,
} from '../../../src/redux/eventSlice';
import {
  rsvpToEvent,
  fetchEventRSVPs,
  checkInToEvent,
  submitFeedback,
} from '../../../src/redux/rsvpSlice';
import RsvpStatusBadge from '../../../src/components/events/RsvpStatusBadge';
import UserAvatar from '../../../src/components/common/UserAvatar';
import { formatDistanceToNow, format, isPast, isFuture, isToday } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import BottomSheet from '@gorhom/bottom-sheet';
import { Rating } from 'react-native-ratings';
// // Platform-specific MapView
// let MapView, Marker;
// if (Platform.OS !== 'web') {
//   // Only import on native platforms
//   const ReactNativeMaps = require('react-native-maps');
//   MapView = ReactNativeMaps.default;
//   Marker = ReactNativeMaps.Marker;
// }
const EventDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const { colors, spacing, typography, isDark } = useTheme();
  const dispatch = useDispatch();
  
  // Redux state
  const { currentEvent, loading, error } = useSelector(state => state.events);
  const { userRSVPs, eventRSVPs, loading: rsvpLoading } = useSelector(state => state.rsvp);
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showAllDescription, setShowAllDescription] = useState(false);
  const [selectedTab, setSelectedTab] = useState('about');
  const [feedbackRating, setFeedbackRating] = useState(3);
  const [feedbackText, setFeedbackText] = useState('');
  
  // Refs
  const feedbackSheetRef = useRef(null);
  const mapRef = useRef(null);
    const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    headerImage: {
      width: '100%',
      height: 200,
      resizeMode: 'cover',
    },
    placeholderImage: {
      width: '100%',
      height: 200,
      backgroundColor: colors.lightGrey,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButton: {
      position: 'absolute',
      top: spacing.lg,
      left: spacing.md,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 20,
      padding: spacing.xs,
      zIndex: 10,
    },
    shareButton: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.md,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 20,
      padding: spacing.xs,
      zIndex: 10,
    },
    contentContainer: {
      padding: spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: typography.fontSizes.xl,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    eventType: {
      fontSize: typography.fontSizes.sm,
      color: colors.white,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 4,
      overflow: 'hidden',
      alignSelf: 'flex-start',
    },
    hostRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    hostInfo: {
      marginLeft: spacing.sm,
      flex: 1,
    },
    hostedBy: {
      fontSize: typography.fontSizes.sm,
      color: colors.textSecondary,
    },
    hostName: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
      color: colors.text,
    },
    sectionTitle: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      marginVertical: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    infoIcon: {
      width: 30,
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    infoText: {
      fontSize: typography.fontSizes.md,
      color: colors.text,
      flex: 1,
    },
    infoSecondary: {
      fontSize: typography.fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.md,
    },
    actionButtonText: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
      marginLeft: spacing.sm,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.lightGrey,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    disabledButton: {
      backgroundColor: colors.grey,
    },
    primaryButtonText: {
      color: colors.white,
    },
    secondaryButtonText: {
      color: colors.darkGrey,
    },
    dangerButtonText: {
      color: colors.white,
    },
    rsvpButtonGroup: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    rsvpButton: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.sm,
      marginHorizontal: spacing.xs,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.lightGrey,
    },
    rsvpButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    rsvpButtonText: {
      fontSize: typography.fontSizes.sm,
      marginLeft: spacing.xs,
      color: colors.darkGrey,
    },
    rsvpButtonTextActive: {
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
    },
    description: {
      fontSize: typography.fontSizes.md,
      color: colors.text,
      lineHeight: 22,
    },
    readMore: {
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
      marginTop: spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: colors.lightGrey,
      marginVertical: spacing.lg,
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
      marginBottom: spacing.md,
    },
    tabButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginRight: spacing.md,
    },
    tabButtonText: {
      fontSize: typography.fontSizes.md,
      color: colors.textSecondary,
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
    },
    mapContainer: {
      height: 200,
      marginBottom: spacing.md,
      borderRadius: 8,
      overflow: 'hidden',
    },
    participantList: {
      marginTop: spacing.sm,
    },
    participantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    participantInfo: {
      marginLeft: spacing.sm,
      flex: 1,
    },
    participantName: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
      color: colors.text,
    },
    participantStatus: {
      fontSize: typography.fontSizes.sm,
      color: colors.textSecondary,
    },
    feedbackContainer: {
      padding: spacing.lg,
    },
    feedbackTitle: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    feedbackInput: {
      borderWidth: 1,
      borderColor: colors.lightGrey,
      borderRadius: 8,
      padding: spacing.md,
      color: colors.text,
      height: 100,
      textAlignVertical: 'top',
      marginVertical: spacing.md,
    },
    eventStatusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
    },
    pastEvent: {
      backgroundColor: colors.grey,
    },
    todayEvent: {
      backgroundColor: colors.success,
    },
    upcomingEvent: {
      backgroundColor: colors.primaryLight,
    },
    eventStatusText: {
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.medium,
      color: colors.white,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: typography.fontSizes.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    errorText: {
      fontSize: typography.fontSizes.md,
      textAlign: 'center',
      marginVertical: spacing.lg,
    },
    button: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
    },
    counterRow: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    counterItem: {
      alignItems: 'center',
      marginRight: spacing.lg,
    },
    counterNumber: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    counterLabel: {
      fontSize: typography.fontSizes.sm,
      color: colors.textSecondary,
    },
    checkedIn: {
      backgroundColor: colors.success,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    checkedInText: {
      color: colors.white,
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.medium,
    },
  });
  // Event status calculations
  const isEventPast = currentEvent?.endTime ? isPast(new Date(currentEvent.endTime)) : false;
  const isEventToday = currentEvent?.startTime ? isToday(new Date(currentEvent.startTime)) : false;
  const _isEventUpcoming = currentEvent?.startTime ? isFuture(new Date(currentEvent.startTime)) : false;

  
  // Get user's RSVP status for this event
  const userRsvp = userRSVPs[id];
  const rsvpStatus = userRsvp?.status || 'none';
  
  // Get all RSVPs for this event
  const eventParticipants = eventRSVPs[id] || [];
  const goingCount = eventParticipants.filter(rsvp => rsvp.status === 'going').length;
  const interestedCount = eventParticipants.filter(rsvp => rsvp.status === 'interested').length;
  
  // Check if user is the host
  const isHost = currentEvent?.host?.id === user?.id;
  
  // Load event data
  useEffect(() => {
    if (id) {
      dispatch(fetchEventById(id));
      dispatch(fetchEventRSVPs({ eventId: id }));
    }
    
    // Cleanup on unmount
    return () => {
      dispatch(clearCurrentEvent());
    };
  }, [id, dispatch]);
  
  // Refresh data
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchEventById(id)),
      dispatch(fetchEventRSVPs({ eventId: id }))
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [id, dispatch]);
  
  // Handle RSVP
  const handleRSVP = async (status) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'You need to be logged in to RSVP to events',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    
    try {
      await dispatch(rsvpToEvent({ eventId: id, status })).unwrap();
      dispatch(fetchEventRSVPs({ eventId: id }));
    } catch (error) {
      Alert.alert('Error', error || 'Failed to RSVP. Please try again.');
    }
  };
  
  // Handle check-in
  const handleCheckIn = async () => {
    try {
      await dispatch(checkInToEvent(id)).unwrap();
      Alert.alert('Success', 'You have checked in to the event!');
    } catch (error) {
      Alert.alert('Error', error || 'Failed to check in. Please try again.');
    }
  };
  
  // Handle share
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me at ${currentEvent.title}! ${
          currentEvent.isOnline ? 'This is an online event.' : `Located at ${currentEvent.address}, ${currentEvent.city}`
        } on ${format(new Date(currentEvent.startTime), 'PPP')} at ${format(new Date(currentEvent.startTime), 'p')}`,
        title: currentEvent.title,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share event');
    }
  };
  
  // Handle copy meeting link (for online events)
  const handleCopyLink = async () => {
    if (currentEvent?.meetingLink) {
      await Clipboard.setStringAsync(currentEvent.meetingLink);
      Alert.alert('Success', 'Meeting link copied to clipboard');
    }
  };
  
  // Handle delete event
  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await dispatch(deleteEvent(id)).unwrap();
              Alert.alert('Success', 'Event deleted successfully');
              router.replace('/(tabs)');
            } catch (error) {
              Alert.alert('Error', error || 'Failed to delete event. Please try again.');
            }
          } 
        },
      ]
    );
  };
  
  // Handle edit event
  const handleEditEvent = () => {
    router.push(`/events/edit/${id}`);
  };
  
  // Show feedback bottom sheet
  const handleShowFeedback = () => {
    feedbackSheetRef.current?.expand();
  };
  
  // Submit feedback
  const handleSubmitFeedback = async () => {
    try {
      await dispatch(submitFeedback({
        eventId: id,
        rating: feedbackRating,
        feedback: feedbackText
      })).unwrap();
      
      feedbackSheetRef.current?.close();
      setFeedbackText('');
      Alert.alert('Success', 'Thank you for your feedback!');
    } catch (error) {
      Alert.alert('Error', error || 'Failed to submit feedback. Please try again.');
    }
  };
  
  // Open maps app for directions
  const handleGetDirections = () => {
    if (currentEvent?.address) {
      const address = `${currentEvent.address}, ${currentEvent.city}, ${currentEvent.state}, ${currentEvent.zipCode}`;
      const url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(address)}`,
        android: `geo:0,0?q=${encodeURIComponent(address)}`,
      });
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            'No Maps App',
            'Could not open maps application',
            [{ text: 'OK' }],
          );
        }
      });
    }
  };
  
  // Join online meeting
  const handleJoinMeeting = () => {
    if (currentEvent?.meetingLink) {
      Linking.openURL(currentEvent.meetingLink);
    }
  };
  
  if (loading && !currentEvent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading event details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!currentEvent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <Ionicons name="help-circle-outline" size={60} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Event not found
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* Event Image */}
        {currentEvent.imageUrl ? (
          <Image source={{ uri: currentEvent.imageUrl }} style={styles.headerImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={60} color={colors.grey} />
          </View>
        )}
        
        {/* Back and Share Buttons */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color={colors.white} />
        </TouchableOpacity>
        
        {/* Event Details */}
        <View style={styles.contentContainer}>
          {/* Event Status Badge */}
          <View style={[
            styles.eventStatusBadge,
            isEventPast ? styles.pastEvent : 
            isEventToday ? styles.todayEvent : 
            styles.upcomingEvent
          ]}>
            <Text style={styles.eventStatusText}>
              {isEventPast ? 'Past Event' : isEventToday ? 'Today' : 'Upcoming'}
            </Text>
          </View>
          
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{currentEvent.title}</Text>
          </View>
          
          {/* Event Type */}
          <Text style={styles.eventType}>
            {currentEvent.eventType.charAt(0).toUpperCase() + currentEvent.eventType.slice(1).replace('-', ' ')}
          </Text>
          
          {/* Host Info */}
          <View style={styles.hostRow}>
            <UserAvatar 
              size={40} 
              userId={currentEvent.host?.id}
              image={currentEvent.host?.profileImage}
              name={currentEvent.host?.name}
            />
            <View style={styles.hostInfo}>
              <Text style={styles.hostedBy}>Hosted by</Text>
              <Text style={styles.hostName}>{currentEvent.host?.name}</Text>
            </View>
          </View>
          
          {/* Quick Stats */}
          <View style={styles.counterRow}>
            <View style={styles.counterItem}>
              <Text style={styles.counterNumber}>{goingCount}</Text>
              <Text style={styles.counterLabel}>Going</Text>
            </View>
            <View style={styles.counterItem}>
              <Text style={styles.counterNumber}>{interestedCount}</Text>
              <Text style={styles.counterLabel}>Interested</Text>
            </View>
            {currentEvent.maxParticipants && (
              <View style={styles.counterItem}>
                <Text style={styles.counterNumber}>{currentEvent.maxParticipants}</Text>
                <Text style={styles.counterLabel}>Capacity</Text>
              </View>
            )}
          </View>
          
          {/* RSVP Buttons - Only show for upcoming events */}
          {!isEventPast && (
            <View style={styles.rsvpButtonGroup}>
              <TouchableOpacity 
                style={[
                  styles.rsvpButton, 
                  rsvpStatus === 'going' && styles.rsvpButtonActive
                ]}
                onPress={() => handleRSVP('going')}
              >
                <Ionicons 
                  name={rsvpStatus === 'going' ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={16} 
                  color={rsvpStatus === 'going' ? colors.primary : colors.darkGrey} 
                />
                <Text style={[
                  styles.rsvpButtonText,
                  rsvpStatus === 'going' && styles.rsvpButtonTextActive
                ]}>Going</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.rsvpButton, 
                  rsvpStatus === 'interested' && styles.rsvpButtonActive
                ]}
                onPress={() => handleRSVP('interested')}
              >
                <Ionicons 
                  name={rsvpStatus === 'interested' ? "star" : "star-outline"} 
                  size={16} 
                  color={rsvpStatus === 'interested' ? colors.primary : colors.darkGrey} 
                />
                <Text style={[
                  styles.rsvpButtonText,
                  rsvpStatus === 'interested' && styles.rsvpButtonTextActive
                ]}>Interested</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.rsvpButton, 
                  rsvpStatus === 'not-going' && styles.rsvpButtonActive
                ]}
                onPress={() => handleRSVP('not-going')}
              >
                <Ionicons 
                  name={rsvpStatus === 'not-going' ? "close-circle" : "close-circle-outline"} 
                  size={16} 
                  color={rsvpStatus === 'not-going' ? colors.primary : colors.darkGrey} 
                />
                <Text style={[
                  styles.rsvpButtonText,
                  rsvpStatus === 'not-going' && styles.rsvpButtonTextActive
                ]}>Not Going</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Primary Action Button - Different depending on event status and user role */}
          {isHost ? (
            // Host Controls
            <View>
              {!isEventPast && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleEditEvent}
                >
                  <Ionicons name="create-outline" size={20} color={colors.white} />
                  <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                    Edit Event
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleDeleteEvent}
              >
                <Ionicons name="trash-outline" size={20} color={colors.white} />
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                  Delete Event
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Attendee Actions
            <View>
              {isEventToday && rsvpStatus === 'going' && !userRsvp?.checkedIn && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleCheckIn}
                  disabled={rsvpLoading}
                >
                  {rsvpLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="enter-outline" size={20} color={colors.white} />
                      <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                        Check In Now
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {userRsvp?.checkedIn && (
                <View style={styles.checkedIn}>
                  <Text style={styles.checkedInText}>
                    You have checked in
                  </Text>
                </View>
              )}
              
              {isEventPast && rsvpStatus === 'going' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleShowFeedback}
                >
                  <Ionicons name="star-outline" size={20} color={colors.white} />
                  <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                    {userRsvp?.feedback ? 'Update Feedback' : 'Leave Feedback'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {currentEvent.isOnline && !isEventPast && rsvpStatus === 'going' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleJoinMeeting}
                >
                  <Ionicons name="videocam-outline" size={20} color={colors.white} />
                  <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                    Join Meeting
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <View style={styles.divider} />
          
          {/* Event Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, selectedTab === 'about' && styles.activeTab]}
              onPress={() => setSelectedTab('about')}
            >
              <Text style={[styles.tabButtonText, selectedTab === 'about' && styles.activeTabText]}>
                About
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, selectedTab === 'participants' && styles.activeTab]}
              onPress={() => setSelectedTab('participants')}
            >
              <Text style={[styles.tabButtonText, selectedTab === 'participants' && styles.activeTabText]}>
                Participants
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Tab Content */}
          {selectedTab === 'about' ? (
            // About Content
            <View>
              <Text style={styles.sectionTitle}>When</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoText}>
                    {format(new Date(currentEvent.startTime), 'EEEE, MMMM d, yyyy')}
                  </Text>
                  <Text style={styles.infoSecondary}>
                    {format(new Date(currentEvent.startTime), 'h:mm a')} - {format(new Date(currentEvent.endTime), 'h:mm a')}
                  </Text>
                  <Text style={styles.infoSecondary}>
                    {formatDistanceToNow(new Date(currentEvent.startTime), { addSuffix: true })}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.sectionTitle}>Where</Text>
              {currentEvent.isOnline ? (
                // Online event
                <View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="videocam-outline" size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoText}>Online Event</Text>
                      {currentEvent.meetingLink && (
                        <TouchableOpacity onPress={handleCopyLink}>
                          <Text style={[styles.infoSecondary, {color: colors.primary}]}>
                            Copy meeting link
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                // In-person event
                <View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="location-outline" size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoText}>{currentEvent.address}</Text>
                      <Text style={styles.infoSecondary}>
                        {currentEvent.city}, {currentEvent.state} {currentEvent.zipCode}
                      </Text>
                      <TouchableOpacity onPress={handleGetDirections}>
                        <Text style={[styles.infoSecondary, {color: colors.primary}]}>
                          Get directions
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {currentEvent.latitude && currentEvent.longitude && (
                    <View style={styles.mapContainer}>
                        <MapComponent
                        location={{
                            latitude: currentEvent.latitude,
                            longitude: currentEvent.longitude,
                        }}
                        title={currentEvent.title}
                        style={{flex: 1}}
                        mapRef={mapRef}
                        />
                    </View>
                    )}
                  
                </View>
              )}
              
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description} numberOfLines={showAllDescription ? undefined : 5}>
                {currentEvent.description}
              </Text>
              {currentEvent.description.length > 200 && (
                <TouchableOpacity onPress={() => setShowAllDescription(!showAllDescription)}>
                  <Text style={styles.readMore}>
                    {showAllDescription ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // Participants Content
            <View>
              <Text style={styles.sectionTitle}>
                Participants {goingCount > 0 ? `(${goingCount})` : ''}
              </Text>
              
              {eventParticipants.length > 0 ? (
                <FlatList
                  data={eventParticipants.filter(rsvp => rsvp.status === 'going')}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({item}) => (
                    <View style={styles.participantItem}>
                      <UserAvatar 
                        size={40}
                        userId={item.user?.id}
                        image={item.user?.profileImage}
                        name={item.user?.name}
                      />
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>{item.user?.name}</Text>
                        <Text style={styles.participantStatus}>
                          {item.checkedIn ? 'Checked In' : 'Going'}
                        </Text>
                      </View>
                      <RsvpStatusBadge status={item.status} />
                    </View>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
                      No participants yet. Be the first to RSVP!
                    </Text>
                  )}
                />
              ) : (
                <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
                  No participants yet. Be the first to RSVP!
                </Text>
              )}
              
              {interestedCount > 0 && (
                <>
                  <Text style={styles.sectionTitle}>
                    Interested {interestedCount > 0 ? `(${interestedCount})` : ''}
                  </Text>
                  <FlatList
                    data={eventParticipants.filter(rsvp => rsvp.status === 'interested')}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({item}) => (
                      <View style={styles.participantItem}>
                        <UserAvatar 
                          size={40}
                          userId={item.user?.id}
                          image={item.user?.profileImage}
                          name={item.user?.name}
                        />
                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName}>{item.user?.name}</Text>
                          <Text style={styles.participantStatus}>Interested</Text>
                        </View>
                        <RsvpStatusBadge status={item.status} />
                      </View>
                    )}
                  />
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Feedback Bottom Sheet */}
      <BottomSheet
        ref={feedbackSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.grey }}
      >
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>Rate Your Experience</Text>
          
          <Rating
            showRating
            type="star"
            startingValue={feedbackRating}
            imageSize={30}
            onFinishRating={setFeedbackRating}
            style={{ paddingVertical: spacing.md }}
          />
          
          <TextInput
            style={[styles.feedbackInput, { backgroundColor: colors.background }]}
            placeholder="Share your thoughts about the event"
            placeholderTextColor={colors.grey}
            multiline
            value={feedbackText}
            onChangeText={setFeedbackText}
          />
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleSubmitFeedback}
            disabled={rsvpLoading}
          >
            {rsvpLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                Submit Feedback
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

export default EventDetailScreen;