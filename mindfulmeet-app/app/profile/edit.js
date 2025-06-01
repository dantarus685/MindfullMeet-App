// app/profile/edit.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import TextInput from '../../src/components/common/TextInput';
import Button from '../../src/components/common/Button';
import api from '../../src/config/api';
import {
  updateUserProfile,
  selectProfile,
  selectProfileUpdating,
  selectProfileErrors,
  clearErrors,
} from '../../src/redux/profileSlice';

export default function EditProfileScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const dispatch = useDispatch();
  
  // Redux state
  const profile = useSelector(selectProfile);
  const isUpdating = useSelector(selectProfileUpdating);
  const errors = useSelector(selectProfileErrors);

  // Local form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    interests: '',
    skills: '',
    phoneNumber: '',
    location: '',
    website: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      // Parse interests and skills if they're arrays
      const parseArrayField = (field) => {
        if (!field) return '';
        if (Array.isArray(field)) {
          return field.join(', ');
        }
        if (typeof field === 'string') {
          try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed.join(', ') : field;
          } catch {
            return field.split(',').map(item => item.trim()).filter(Boolean).join(', ');
          }
        }
        return '';
      };

      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        interests: parseArrayField(profile.interests),
        skills: parseArrayField(profile.wellnessGoals?.skills || profile.skills),
        phoneNumber: profile.phoneNumber || '',
        location: profile.location || '',
        website: profile.website || '',
      });
    }
  }, [profile]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // Request permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Sorry, we need camera roll permissions to change your profile picture.');
        }
      }
    })();
  }, []);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Handle image selection
  const handleImagePicker = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => pickImage('camera')
        },
        {
          text: 'Gallery',
          onPress: () => pickImage('library')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const pickImage = async (source) => {
    try {
      let result;
      
      if (source === 'camera') {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Sorry, we need camera permissions to take photos.');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset);
        await uploadImage(asset);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Upload image to server
  const uploadImage = async (imageAsset) => {
    try {
      setUploadingImage(true);

      // Create FormData for file upload
      const formData = new FormData();
      
      // For web, we need to handle File objects differently
      if (Platform.OS === 'web') {
        // Web implementation would need a different approach
        // For now, we'll just set the image URI and handle it differently
        console.log('Web image upload not implemented in this example');
        setUploadingImage(false);
        return;
      }

      // Mobile implementation
      formData.append('profileImage', {
        uri: imageAsset.uri,
        type: imageAsset.type || 'image/jpeg',
        name: imageAsset.fileName || 'profile.jpg',
      });

      console.log('Uploading image:', imageAsset.uri);

      const response = await api.post('/api/users/upload-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        Alert.alert('Success', 'Profile picture updated successfully!');
        // Update the profile in Redux store
        dispatch(updateUserProfile({ profileImage: response.data.data.imageUrl }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle form submission
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Parse comma-separated interests and skills back to arrays
      const parseToArray = (str) => {
        if (!str.trim()) return [];
        return str.split(',').map(item => item.trim()).filter(Boolean);
      };

      const updateData = {
        ...formData,
        interests: parseToArray(formData.interests),
        skills: parseToArray(formData.skills),
      };

      // Remove empty fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '' || (Array.isArray(updateData[key]) && updateData[key].length === 0)) {
          delete updateData[key];
        }
      });

      console.log('🔄 Saving profile with data:', updateData);

      const result = await dispatch(updateUserProfile(updateData));
      
      if (updateUserProfile.fulfilled.match(result)) {
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        throw new Error(result.payload || 'Failed to update profile');
      }
    } catch (error) {
      console.error('❌ Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const getProfileImageUri = () => {
    if (selectedImage) {
      return selectedImage.uri;
    }
    return profile?.profileImage || profile?.profilePicture || profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerButton: {
      padding: spacing.sm,
    },
    headerButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelText: {
      color: colors.textSecondary,
    },
    saveText: {
      color: colors.primary,
    },
    content: {
      flex: 1,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGrey,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    editAvatarButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.background,
    },
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      marginTop: spacing.md,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    formSection: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.lg,
    },
    inputGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
      paddingTop: spacing.md,
    },
    helperText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: spacing.xs,
    },
    buttonContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    saveButton: {
      marginBottom: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCancel}
        >
          <Text style={[styles.headerButtonText, styles.cancelText]}>Cancel</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Edit Profile</Text>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSave}
          disabled={isUpdating || uploadingImage}
        >
          <Text style={[styles.headerButtonText, styles.saveText]}>
            {isUpdating ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: getProfileImageUri() }}
                style={styles.avatar}
              />
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color={colors.white} size="small" />
                </View>
              )}
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={handleImagePicker}
                disabled={uploadingImage}
              >
                <Ionicons 
                  name={uploadingImage ? "hourglass" : "camera"} 
                  size={20} 
                  color={colors.white} 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarText}>
              {uploadingImage ? 'Uploading...' : 'Tap to change profile picture'}
            </Text>
          </View>

          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
                error={validationErrors.name}
              />
              {validationErrors.name && (
                <Text style={styles.errorText}>{validationErrors.name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={validationErrors.email}
              />
              {validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={formData.phoneNumber}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                value={formData.location}
                onChangeText={(value) => handleInputChange('location', value)}
                placeholder="City, Country"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                value={formData.website}
                onChangeText={(value) => handleInputChange('website', value)}
                placeholder="https://yourwebsite.com"
                keyboardType="url"
                autoCapitalize="none"
                error={validationErrors.website}
              />
              {validationErrors.website && (
                <Text style={styles.errorText}>{validationErrors.website}</Text>
              )}
            </View>
          </View>

          {/* About Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>About</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                value={formData.bio}
                onChangeText={(value) => handleInputChange('bio', value)}
                placeholder="Tell us about yourself..."
                multiline
                style={styles.textArea}
              />
              <Text style={styles.helperText}>
                Write a brief description about yourself and your interests.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Interests</Text>
              <TextInput
                value={formData.interests}
                onChangeText={(value) => handleInputChange('interests', value)}
                placeholder="meditation, yoga, mindfulness, nature therapy"
              />
              <Text style={styles.helperText}>
                Separate interests with commas (e.g., meditation, yoga, reading)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Skills</Text>
              <TextInput
                value={formData.skills}
                onChangeText={(value) => handleInputChange('skills', value)}
                placeholder="guided meditation, stress counseling, group facilitation"
              />
              <Text style={styles.helperText}>
                Separate skills with commas (e.g., public speaking, counseling)
              </Text>
            </View>
          </View>

          {/* Error Display */}
          {errors.update && (
            <View style={styles.formSection}>
              <Text style={styles.errorText}>{errors.update}</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={isUpdating ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={isUpdating || uploadingImage}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}