import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MapComponent = ({ location, title, style }) => {
  return (
    <View style={[styles.container, style, styles.placeholder]}>
      <Ionicons name="map-outline" size={40} color="#999" />
      <Text style={styles.placeholderText}>Map view not available on web</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#666',
  }
});

export default MapComponent;