import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const GlobalNoticeModal = ({ visible, onClose, onNoticeSent }) => {
  const [noticeText, setNoticeText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Jey: Function to send the global notice to Firestore
  const handleSendNotice = async () => {
    // Jey: Validate that there is content to send
    if (!noticeText.trim()) {
      Alert.alert("Input Required", "Please enter a notice to send.");
      return;
    }

    setIsSending(true);

    try {
      // Jey: Create a new document in the 'globalNotices' collection
      await addDoc(collection(db, 'globalNotices'), {
        text: noticeText,
        timestamp: serverTimestamp(), // Jey: Use a Firestore server timestamp for accuracy
      });
      
      Alert.alert("Success", "Global notice sent successfully!");
      setNoticeText(''); // Jey: Clear the input field
      onNoticeSent(); // Jey: Call the callback to refresh the parent view
      onClose();
    } catch (error) {
      console.error("Jey: Error sending global notice:", error);
      Alert.alert("Error", "Failed to send notice. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={globalNoticeStyles.centeredView}>
        <View style={globalNoticeStyles.modalView}>
          <Text style={globalNoticeStyles.modalTitle}>Broadcast Global Notice</Text>
          <Text style={globalNoticeStyles.modalSubtitle}>
            This notice will be visible to all app users.
          </Text>
          
          <TextInput
            style={globalNoticeStyles.textInput}
            placeholder="Type your notice here..."
            placeholderTextColor="#999"
            multiline
            value={noticeText}
            onChangeText={setNoticeText}
          />

          <View style={globalNoticeStyles.buttonContainer}>
            <TouchableOpacity
              style={[globalNoticeStyles.actionButton, globalNoticeStyles.cancelButton]}
              onPress={onClose}
              disabled={isSending}
            >
              <Text style={globalNoticeStyles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                globalNoticeStyles.actionButton,
                globalNoticeStyles.sendButton,
                isSending && globalNoticeStyles.actionButtonDisabled,
              ]}
              onPress={handleSendNotice}
              disabled={isSending || !noticeText.trim()}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={globalNoticeStyles.actionButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const globalNoticeStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    height: 150,
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default GlobalNoticeModal;