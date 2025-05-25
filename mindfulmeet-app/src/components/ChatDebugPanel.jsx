// src/components/ChatDebugPanel.jsx - CREATE THIS NEW FILE
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import socketService from '../services/socketService';

const ChatDebugPanel = ({ roomId = null }) => {
  const [debugInfo, setDebugInfo] = useState({});
  const [logs, setLogs] = useState([]);
  const [testResults, setTestResults] = useState({});
  
  const chatState = useSelector(state => state.chat);
  const authState = useSelector(state => state.auth);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      time: timestamp,
      message,
      type
    };
    setLogs(prev => [logEntry, ...prev.slice(0, 30)]);
    console.log(`[DEBUG] ${message}`);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo(socketService.getDebugInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const testConnection = async () => {
    addLog('🔧 Testing connection...', 'test');
    
    try {
      const token = authState?.token;
      if (!token) {
        addLog('❌ No token available', 'error');
        setTestResults(prev => ({ ...prev, connection: 'FAIL - No token' }));
        return;
      }
      
      addLog(`🔑 Token available: ${token.substring(0, 20)}...`, 'success');
      
      const success = socketService.connect(token);
      addLog(`🔌 Connect attempt: ${success ? 'Success' : 'Failed'}`, success ? 'success' : 'error');
      
      // Wait and check status
      setTimeout(() => {
        const status = socketService.getConnectionStatus();
        const info = socketService.getDebugInfo();
        
        addLog(`📊 Connection status: ${status}`, status ? 'success' : 'error');
        addLog(`🆔 Socket ID: ${info.socketId || 'None'}`, info.socketId ? 'success' : 'error');
        
        setTestResults(prev => ({ 
          ...prev, 
          connection: status ? 'SUCCESS' : 'FAIL - Check console for errors' 
        }));
      }, 3000);
      
    } catch (error) {
      addLog(`❌ Connection test error: ${error.message}`, 'error');
      setTestResults(prev => ({ ...prev, connection: 'FAIL - Exception' }));
    }
  };

  const testJoinRoom = async () => {
    if (!roomId) {
      addLog('❌ No room ID provided', 'error');
      return;
    }
    
    addLog(`🚪 Testing room join: ${roomId}`, 'test');
    
    const isConnected = socketService.getConnectionStatus();
    if (!isConnected) {
      addLog('❌ Socket not connected', 'error');
      setTestResults(prev => ({ ...prev, joinRoom: 'FAIL - Not connected' }));
      return;
    }
    
    const success = socketService.joinRoom(roomId);
    addLog(`🚪 Join room attempt: ${success}`, success ? 'success' : 'error');
    
    setTimeout(() => {
      const rooms = socketService.getCurrentRooms();
      const inRoom = rooms.includes(roomId);
      addLog(`🏠 In room check: ${inRoom}`, inRoom ? 'success' : 'error');
      addLog(`🏠 All joined rooms: [${rooms.join(', ')}]`, 'info');
      
      setTestResults(prev => ({ 
        ...prev, 
        joinRoom: inRoom ? 'SUCCESS' : 'FAIL - Not in room list' 
      }));
    }, 2000);
  };

  const testSendMessage = async () => {
    if (!roomId) {
      addLog('❌ No room ID provided', 'error');
      return;
    }
    
    const testMessage = `🧪 Test message at ${new Date().toLocaleTimeString()}`;
    addLog(`📤 Testing message send: ${testMessage}`, 'test');
    
    const isConnected = socketService.getConnectionStatus();
    if (!isConnected) {
      addLog('❌ Socket not connected', 'error');
      setTestResults(prev => ({ ...prev, sendMessage: 'FAIL - Not connected' }));
      return;
    }
    
    const success = socketService.sendMessage(roomId, testMessage);
    addLog(`📤 Send message attempt: ${success}`, success ? 'success' : 'error');
    
    setTestResults(prev => ({ 
      ...prev, 
      sendMessage: success ? 'SUCCESS - Check for new message' : 'FAIL' 
    }));
  };

  const testAPI = async () => {
    addLog('🌐 Testing API connection...', 'test');
    
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
      addLog(`🌐 Testing API at: ${apiUrl}`, 'info');
      
      const response = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState?.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      addLog(`📡 API Response status: ${response.status}`, response.ok ? 'success' : 'error');
      
      if (response.ok) {
        addLog('✅ API connection successful', 'success');
        setTestResults(prev => ({ ...prev, api: 'SUCCESS' }));
      } else {
        const errorText = await response.text();
        addLog(`❌ API error: ${response.status} - ${errorText}`, 'error');
        setTestResults(prev => ({ ...prev, api: `FAIL - ${response.status}` }));
      }
    } catch (error) {
      addLog(`❌ API test error: ${error.message}`, 'error');
      setTestResults(prev => ({ ...prev, api: 'FAIL - Network error' }));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setTestResults({});
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'test': return '#2196F3';
      default: return '#333';
    }
  };

  const getCurrentEnv = () => {
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Chat Debug Panel</Text>
      
      {/* Environment Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌍 Environment</Text>
        <Text style={styles.detail}>API URL: {getCurrentEnv()}</Text>
        <Text style={styles.detail}>DEV Mode: {__DEV__ ? '✅' : '❌'}</Text>
      </View>

      {/* Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Status Overview</Text>
        <Text style={[styles.status, { color: debugInfo.isConnected ? '#4CAF50' : '#F44336' }]}>
          Socket: {debugInfo.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
        <Text style={styles.detail}>Socket ID: {debugInfo.socketId || 'None'}</Text>
        <Text style={styles.detail}>Has Socket: {debugInfo.hasSocket ? '✅' : '❌'}</Text>
        <Text style={styles.detail}>Current Room: {roomId || 'None'}</Text>
        <Text style={styles.detail}>Joined Rooms: [{debugInfo.currentRooms?.join(', ') || 'None'}]</Text>
        <Text style={styles.detail}>User ID: {authState.user?.id || 'None'}</Text>
        <Text style={styles.detail}>Token: {authState.token ? '✅ Available' : '❌ Missing'}</Text>
        <Text style={styles.detail}>Messages in Room: {chatState.messagesByRoom[roomId]?.length || 0}</Text>
        <Text style={styles.detail}>Redux Connected: {chatState.isConnected ? '✅' : '❌'}</Text>
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Results</Text>
        {Object.entries(testResults).map(([test, result]) => (
          <Text key={test} style={[styles.detail, { color: result.includes('SUCCESS') ? '#4CAF50' : '#F44336' }]}>
            {test}: {result}
          </Text>
        ))}
      </View>

      {/* Test Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testAPI}>
          <Text style={styles.buttonText}>Test API</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testConnection}>
          <Text style={styles.buttonText}>Test Socket</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, !roomId && styles.buttonDisabled]} 
          onPress={testJoinRoom}
          disabled={!roomId}
        >
          <Text style={styles.buttonText}>Test Join</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, !roomId && styles.buttonDisabled]} 
          onPress={testSendMessage}
          disabled={!roomId}
        >
          <Text style={styles.buttonText}>Test Send</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Logs */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>📝 Debug Logs</Text>
          <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logContainer} showsVerticalScrollIndicator={false}>
          {logs.map((log, index) => (
            <Text key={index} style={[styles.logText, { color: getLogColor(log.type) }]}>
              [{log.time}] {log.message}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 600,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    minWidth: '22%',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logContainer: {
    maxHeight: 150,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  logText: {
    fontSize: 10,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default ChatDebugPanel;