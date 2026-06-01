import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io } from "socket.io-client";
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Monitor, XCircle, AlertCircle } from 'lucide-react-native';

export default function App() {
  const [hasPermission, setHasPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const flatListRef = useRef();

  if (!hasPermission) return <View style={styles.centered}><Text>Requesting camera...</Text></View>;
  if (!hasPermission.granted) return <View style={styles.centered}><Text>No camera access</Text></View>;

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    setError(null);
    console.log("Attempting to connect to:", data);

    const newSocket = io(data, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
      extraHeaders: {
        "bypass-tunnel-reminder": "true" // Required for localtunnel
      }
    });

    newSocket.on("connect", () => {
      setSocket(newSocket);
      setError(null);
    });

    newSocket.on("connect_error", (err) => {
      setError("Connection Failed: " + err.message);
      setScanned(false);
      newSocket.close();
    });

    newSocket.on("message", (msg) => {
      setChat(prev => [...prev, { id: Date.now().toString(), text: msg, me: false }]);
    });
  };

  const sendMessage = () => {
    if (message.trim() && socket) {
      socket.emit("message", message);
      setChat(prev => [...prev, { id: Date.now().toString(), text: message, me: true }]);
      setMessage('');
    }
  };

  if (!socket) {
    return (
      <View style={styles.container}>
        <View style={styles.qrHeader}>
          <Text style={styles.qrTitle}>Connect Linconnect</Text>
          <Text style={styles.qrSub}>Scan the QR code in your Linux terminal</Text>
        </View>
        <View style={styles.cameraContainer}>
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
        {scanned && !error && <Text style={styles.connecting}>Connecting...</Text>}
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle color="#EF4444" size={24} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => { setScanned(false); setError(null); }} style={styles.retryBtn}>
              <Text style={{color: 'white', fontWeight: 'bold'}}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.safe}>
        <LinearGradient colors={['#3B82F6', '#4338CA']} style={styles.header}>
          <View style={styles.headerRow}>
            <Monitor color="white" size={24} />
            <Text style={styles.headerText}>Terminal Connected</Text>
            <TouchableOpacity onPress={() => { socket.disconnect(); setSocket(null); setScanned(false); }}>
              <XCircle color="white" size={24} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <FlatList
          ref={flatListRef}
          data={chat}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.me ? styles.myBubble : styles.otherBubble]}>
              <Text style={[styles.msgText, item.me ? styles.myText : styles.otherText]}>{item.text}</Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            style={styles.input}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrHeader: { position: 'absolute', top: 80, alignItems: 'center', zIndex: 10 },
  qrTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  qrSub: { color: '#BFDBFE', fontSize: 14, marginTop: 8 },
  cameraContainer: { width: 280, height: 280, borderRadius: 24, overflow: 'hidden', borderWidth: 4, borderColor: 'white' },
  connecting: { color: 'white', marginTop: 20, fontWeight: 'bold' },
  errorBox: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginTop: 20, alignItems: 'center', marginHorizontal: 30 },
  errorText: { color: '#1F2937', marginTop: 10, textAlign: 'center' },
  retryBtn: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 10, marginTop: 15 },
  header: { paddingVertical: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 12, flex: 1 },
  chatList: { padding: 16, paddingBottom: 32 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginVertical: 4 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#3B82F6', borderBottomRightRadius: 2 },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 2, elevation: 2 },
  msgText: { fontSize: 16 },
  myText: { color: 'white' },
  otherText: { color: '#1F2937' },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, height: 44, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }
});
