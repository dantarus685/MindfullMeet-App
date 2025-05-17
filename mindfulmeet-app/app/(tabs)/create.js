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
  Platform
} from 'react-native';
import { useTheme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function CreateScreen() {
  const { colors, spacing, typography, effects, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('event');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  
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
  });

  const categories = [
    'Meditation', 'Support Group', 'Therapy', 'Mindfulness',
    'Yoga', 'Stress Relief', 'Sleep Health', 'Nature Therapy'
  ];

  const [selectedCategory, setSelectedCategory] = useState(null);

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
          
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a title"
                placeholderTextColor={colors.grey}
                value={eventTitle}
                onChangeText={setEventTitle}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryRow}>
                {categories.map((category, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={[
                      styles.categoryChip, 
                      selectedCategory === category && styles.activeCategoryChip
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text 
                      style={[
                        styles.categoryChipText, 
                        selectedCategory === category && styles.activeCategoryChipText
                      ]}
                    >
                      {category}
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
                value={eventDescription}
                onChangeText={setEventDescription}
              />
            </View>
            
            {activeTab === 'event' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date & Time</Text>
                  <TouchableOpacity style={styles.selectRow}>
                    <Text style={styles.selectText}>Select date and time</Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TouchableOpacity style={styles.selectRow}>
                    <Text style={styles.selectText}>Select location</Text>
                    <Ionicons name="location-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>
                Create {activeTab === 'event' ? 'Event' : activeTab === 'group' ? 'Support Group' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}