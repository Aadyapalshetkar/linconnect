import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io } from "socket.io-client";

export default function App() {
  const [hasPermission, setHasPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  if (!hasPermission) {
    return <View style={styles.container}><Text>Requesting for camera permission</Text><Button title="Grant Permission" onPress={setHasPermission} /></View>;
  }

  if (!hasPermission.granted) {
      return <View style={styles.container}><Text>No access to camera</Text><Button title="Grant Permission" onPress={setHasPermission} /></View>;
  }

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    const newSocket = io(data);
    setSocket(newSocket);
    newSocket.on("connect", () => console.log("Connected to Linux!"));
  };

  const sendMessage = () => {
    if (socket) {
      socket.emit("message", message);
      setChat([...chat, { id: Date.now().toString(), text: message, me: true }]);
      setMessage('');
    }
  };

  if (!socket) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scan QR to Connect</Text>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={StyleSheet.absoluteFillObject}
        />
        {scanned && <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connected to Linux</Text>
      <FlatList
        data={chat}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.me ? styles.myMsg : styles.otherMsg]}>
            <Text>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputArea}>
        <TextInput value={message} onChangeText={setMessage} style={styles.input} placeholder="Type message..." />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, marginBottom: 20, fontWeight: 'bold' },
  inputArea: { flexDirection: 'row', marginTop: 20 },
  input: { borderBottomWidth: 1, flex: 1, marginRight: 10 },
  msg: { padding: 10, marginVertical: 5, borderRadius: 10 },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#DCF8C6' },
  otherMsg: { alignSelf: 'flex-start', backgroundColor: '#ECECEC' }
});
