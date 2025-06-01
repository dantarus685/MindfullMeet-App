// components/SocketDebug.jsx - Add this temporarily to debug
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import socketService from '../src/services/socketService';

export default function SocketDebug() {
  const [debugInfo, setDebugInfo] = useState({});
  const [logs, setLogs] = useState([]);
  const isConnected = useSelector(state => state.chat.isConnected);
  const currentUser = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = socketService.getDebugInfo();
      setDebugInfo(info);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    addLog(`Connection status changed: ${isConnected ? 'Connected' : 'Disconnected'}`);
  }, [isConnected]);

  const handleManualConnect = async () => {
    addLog('Manual connect triggered...');
    try {
      const result = await socketService.connect(token);
      addLog(`Manual connect result: ${result}`);
    } catch (error) {
      addLog(`Manual connect error: ${error.message}`);
    }
  };

  const handlePing = () => {
    addLog('Sending ping...');
    const result = socketService.ping({ test: 'debug' });
    addLog(`Ping result: ${result}`);
  };

  const handleHealthCheck = () => {
    addLog('Running health check...');
    socketService.healthCheck();
  };

  if (!__DEV__) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Socket.IO Debug</Text>
      
      <View style={styles.infoSection}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.value, { color: isConnected ? 'green' : 'red' }]}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.label}>Socket ID:</Text>
        <Text style={styles.value}>{debugInfo.socketId || 'None'}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.label}>Connection State:</Text>
        <Text style={styles.value}>{debugInfo.connectionState || 'Unknown'}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.label}>Has Token:</Text>
        <Text style={styles.value}>{token ? 'Yes' : 'No'}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.label}>Current User:</Text>
        <Text style={styles.value}>{currentUser?.name || 'None'}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.label}>Server URL:</Text>
        <Text style={styles.value}>{debugInfo.serverUrl}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleManualConnect}>
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handlePing}>
          <Text style={styles.buttonText}>Ping</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleHealthCheck}>
          <Text style={styles.buttonText}>Health Check</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logsSection}>
        <Text style={styles.logsTitle}>Recent Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logItem}>{log}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    width: 300,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    color: 'yellow',
    fontSize: 12,
    width: 100,
  },
  value: {
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 5,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  logsSection: {
    marginTop: 10,
  },
  logsTitle: {
    color: 'yellow',
    fontSize: 12,
    marginBottom: 5,
  },
  logItem: {
    color: 'white',
    fontSize: 10,
    marginBottom: 2,
  },
});