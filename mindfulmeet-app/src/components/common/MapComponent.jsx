// src/components/common/MapComponent.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/theme';

const MapComponent = ({ location, title, style }) => {
  const { colors, spacing, typography } = useTheme();
  const [imageError, setImageError] = useState(false);
  
  const handlePress = () => {
    const { latitude, longitude } = location;
    
    if (Platform.OS === 'web') {
      // Open Google Maps in new tab for web
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      // Open native maps app
      const url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}`,
      });
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps web
          Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
      });
    }
  };

  // Generate static map image URL
  const getStaticMapUrl = () => {
    const { latitude, longitude } = location;
    const zoom = 15;
    const size = '400x200';
    
    // Using Mapbox static API (works without API key for basic usage)
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoom}/${size}@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA`;
  };

  const styles = {
    container: {
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.lightGrey,
      ...style,
    },
    mapImageContainer: {
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 200,
    },
    mapImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayContent: {
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 8,
    },
    overlayIcon: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    overlayText: {
      color: colors.white,
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.medium,
      textAlign: 'center',
    },
    overlaySubtext: {
      color: colors.white,
      fontSize: typography.fontSizes.xs,
      textAlign: 'center',
      opacity: 0.8,
      marginTop: 2,
    },
    fallbackContainer: {
      backgroundColor: colors.lightGrey,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
      minHeight: 200,
    },
    fallbackIconContainer: {
      backgroundColor: colors.primary,
      borderRadius: 30,
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    fallbackTitle: {
      color: colors.text,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    fallbackSubtitle: {
      color: colors.textSecondary,
      fontSize: typography.fontSizes.sm,
      textAlign: 'center',
    },
    fallbackCoordinates: {
      color: colors.grey,
      fontSize: typography.fontSizes.xs,
      textAlign: 'center',
      marginTop: spacing.xs,
    }
  };

  // Fallback component if image fails to load
  const FallbackMap = () => (
    <View style={styles.fallbackContainer}>
      <View style={styles.fallbackIconContainer}>
        <Ionicons name="location" size={28} color={colors.white} />
      </View>
      <Text style={styles.fallbackTitle}>View Location</Text>
      <Text style={styles.fallbackSubtitle}>
        {Platform.OS === 'web' ? 'Click to open in Google Maps' : 'Tap to open in Maps'}
      </Text>
      <Text style={styles.fallbackCoordinates}>
        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
      </Text>
    </View>
  );

  // Main map preview component
  if (imageError) {
    return (
      <TouchableOpacity style={styles.container} onPress={handlePress}>
        <FallbackMap />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.mapImageContainer}>
        <Image
          source={{ uri: getStaticMapUrl() }}
          style={styles.mapImage}
          onError={() => setImageError(true)}
          onLoad={() => console.log('Map image loaded successfully')}
        />
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <View style={styles.overlayIcon}>
              <Ionicons name="open-outline" size={20} color={colors.white} />
            </View>
            <Text style={styles.overlayText}>
              {Platform.OS === 'web' ? 'Click to open in Google Maps' : 'Tap to open in Maps'}
            </Text>
            <Text style={styles.overlaySubtext}>
              Get directions & full map view
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default MapComponent;