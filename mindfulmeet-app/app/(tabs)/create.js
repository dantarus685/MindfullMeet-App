import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import api from '../../src/config/api';
import DateTimePickerModal from 'react-native-modal-datetime-picker'; // You'll need to install this

export default function CreateScreen() {
  const { colors, spacing, typography, effects, isDark } = useTheme();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  const [activeTab, setActiveTab] = useState('event');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: '',
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
    isOnline: false,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    meetingLink: '',
    maxParticipants: '',
    imageUrl: '',
    tags: []
  });
  
  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Location type (online/in-person)
  const [locationType, setLocationType] = useState('in-person');
  
  const eventTypes = [
    { id: 'meditation', name: 'Meditation' },
    { id: 'support-group', name: 'Support Group' },
    { id: 'therapy-session', name: 'Therapy' },
    { id: 'wellness-workshop', name: 'Workshop' },
    { id: 'nature-therapy', name: 'Nature Therapy' },
    { id: 'mindfulness-retreat', name: 'Retreat' },
    { id: 'other', name: 'Other' }
  ];
  
  // Update form data
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle date selection
  const handleStartDateConfirm = (date) => {
    updateFormData('startTime', date);
    setShowStartPicker(false);
    
    // If end time is before new start time, update end time
    if (formData.endTime < date) {
      updateFormData('endTime', new Date(date.getTime() + 60 * 60 * 1000));
    }
  };
  
  const handleEndDateConfirm = (date) => {
    updateFormData('endTime', date);
    setShowEndPicker(false);
  };
  
  // Format date for display
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  // Handle create event
  const handleCreateEvent = async () => {
    // Form validation
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    
    if (!formData.eventType) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    
    if (locationType === 'in-person' && !formData.address.trim()) {
      Alert.alert('Error', 'Please enter an address for in-person events');
      return;
    }
    
    if (locationType === 'online' && !formData.meetingLink.trim()) {
      Alert.alert('Error', 'Please enter a meeting link for online events');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare data for API
      const eventData = {
        ...formData,
        isOnline: locationType === 'online',
        // Convert maxParticipants to number
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null
      };
      
      // Create event
      const response = await api.post('/api/events', eventData);
      
      setLoading(false);
      
      // Show success message and navigate back
      Alert.alert(
        'Success',
        'Event created successfully',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('Error creating event:', error);
      
      // Show error message
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create event. Please try again.'
      );
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
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginVertical: spacing.md,
    },
    tab: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginRight: spacing.md,
      borderRadius: 20,
      backgroundColor: colors.lightGrey,
    },
    activeTab: {
      backgroundColor: colors.primary,
    },
    tabText: {
      color: colors.darkGrey,
      fontWeight: '500',
    },
    activeTabText: {
      color: colors.white,
    },
    form: {
      paddingHorizontal: spacing.lg,
      flex: 1,
    },
    inputGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: spacing.md,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.lightGrey,
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
    buttonDisabled: {
      backgroundColor: colors.grey,
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    selectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.lightGrey,
    },
    selectText: {
      fontSize: 16,
      color: colors.text,
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.sm,
    },
    categoryChip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.lightGrey,
      borderRadius: 20,
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
    },
    activeCategoryChip: {
      backgroundColor: colors.primary,
    },
    categoryChipText: {
      color: colors.darkGrey,
      fontSize: 14,
    },
    activeCategoryChipText: {
      color: colors.white,
    },
    locationTypeContainer: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    locationTypeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      backgroundColor: colors.lightGrey,
    },
    locationTypeButtonLeft: {
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      borderRightWidth: 0.5,
      borderColor: colors.background,
    },
    locationTypeButtonRight: {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      borderLeftWidth: 0.5,
      borderColor: colors.background,
    },
    activeLocationType: {
      backgroundColor: colors.primary,
    },
    locationTypeText: {
      color: colors.darkGrey,
      fontWeight: '500',
    },
    activeLocationTypeText: {
      color: colors.white,
    },
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <Text style={styles.title}>Create</Text>
          <Text style={styles.subtitle}>Share with the community</Text>
        </View>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: 18, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
            You need to be logged in to create content
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Create</Text>
            <Text style={styles.subtitle}>Share with the community</Text>
          </View>
          
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'event' && styles.activeTab]}
              onPress={() => setActiveTab('event')}
            >
              <Text style={[styles.tabText, activeTab === 'event' && styles.activeTabText]}>
                Event
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'group' && styles.activeTab]}
              onPress={() => setActiveTab('group')}
            >
              <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>
                Support Group
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'post' && styles.activeTab]}
              onPress={() => setActiveTab('post')}
            >
              <Text style={[styles.tabText, activeTab === 'post' && styles.activeTabText]}>
                Post
              </Text>
            </TouchableOpacity>
          </View>
          
          {activeTab === 'event' && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter a title"
                  placeholderTextColor={colors.grey}
                  value={formData.title}
                  onChangeText={(text) => updateFormData('title', text)}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryRow}>
                  {eventTypes.map((category) => (
                    <TouchableOpacity 
                      key={category.id}
                      style={[
                        styles.categoryChip, 
                        formData.eventType === category.id && styles.activeCategoryChip
                      ]}
                      onPress={() => updateFormData('eventType', category.id)}
                    >
                      <Text 
                        style={[
                          styles.categoryChipText, 
                          formData.eventType === category.id && styles.activeCategoryChipText
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter a description"
                  placeholderTextColor={colors.grey}
                  multiline
                  numberOfLines={6}
                  value={formData.description}
                  onChangeText={(text) => updateFormData('description', text)}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date & Time</Text>
                
                <TouchableOpacity 
                  style={[styles.selectRow, { marginBottom: spacing.sm }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.selectText}>
                    {formatDate(formData.startTime)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.selectRow}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.selectText}>
                    {formatDate(formData.endTime)}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                
                <DateTimePickerModal
                  isVisible={showStartPicker}
                  mode="datetime"
                  onConfirm={handleStartDateConfirm}
                  onCancel={() => setShowStartPicker(false)}
                  date={formData.startTime}
                  minimumDate={new Date()}
                />
                
                <DateTimePickerModal
                  isVisible={showEndPicker}
                  mode="datetime"
                  onConfirm={handleEndDateConfirm}
                  onCancel={() => setShowEndPicker(false)}
                  date={formData.endTime}
                  minimumDate={formData.startTime}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location Type</Text>
                <View style={styles.locationTypeContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.locationTypeButton, 
                      styles.locationTypeButtonLeft,
                      locationType === 'in-person' && styles.activeLocationType
                    ]}
                    onPress={() => setLocationType('in-person')}
                  >
                    <Text style={[
                      styles.locationTypeText,
                      locationType === 'in-person' && styles.activeLocationTypeText
                    ]}>
                      In-Person
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.locationTypeButton, 
                      styles.locationTypeButtonRight,
                      locationType === 'online' && styles.activeLocationType
                    ]}
                    onPress={() => setLocationType('online')}
                  >
                    <Text style={[
                      styles.locationTypeText,
                      locationType === 'online' && styles.activeLocationTypeText
                    ]}>
                      Online
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {locationType === 'in-person' ? (
                  <>
                    <TextInput
                      style={[styles.input, { marginTop: spacing.sm }]}
                      placeholder="Address"
                      placeholderTextColor={colors.grey}
                      value={formData.address}
                      onChangeText={(text) => updateFormData('address', text)}
                    />
                    
                    <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                      <TextInput
                        style={[styles.input, { flex: 2, marginRight: spacing.sm }]}
                        placeholder="City"
                        placeholderTextColor={colors.grey}
                        value={formData.city}
                        onChangeText={(text) => updateFormData('city', text)}
                      />
                      
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="State"
                        placeholderTextColor={colors.grey}
                        value={formData.state}
                        onChangeText={(text) => updateFormData('state', text)}
                      />
                    </View>
                    
                    <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
                        placeholder="Zip"
                        placeholderTextColor={colors.grey}
                        value={formData.zipCode}
                        onChangeText={(text) => updateFormData('zipCode', text)}
                        keyboardType="numeric"
                      />
                      
                      <TextInput
                        style={[styles.input, { flex: 2 }]}
                        placeholder="Country"
                        placeholderTextColor={colors.grey}
                        value={formData.country}
                        onChangeText={(text) => updateFormData('country', text)}
                      />
                    </View>
                  </>
                ) : (
                  <TextInput
                    style={[styles.input, { marginTop: spacing.sm }]}
                    placeholder="Meeting Link"
                    placeholderTextColor={colors.grey}
                    value={formData.meetingLink}
                    onChangeText={(text) => updateFormData('meetingLink', text)}
                    keyboardType="url"
                  />
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Maximum Participants (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter a number (leave blank for unlimited)"
                  placeholderTextColor={colors.grey}
                  value={formData.maxParticipants}
                  onChangeText={(text) => updateFormData('maxParticipants', text)}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Image URL (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter an image URL"
                  placeholderTextColor={colors.grey}
                  value={formData.imageUrl}
                  onChangeText={(text) => updateFormData('imageUrl', text)}
                  keyboardType="url"
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCreateEvent}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Create Event</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {activeTab === 'group' && (
            <View style={[styles.form, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
                Support group creation is coming soon!
              </Text>
            </View>
          )}
          
          {activeTab === 'post' && (
            <View style={[styles.form, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
                Post creation is coming soon!
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}