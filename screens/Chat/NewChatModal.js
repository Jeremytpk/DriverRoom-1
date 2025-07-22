import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

// Define your color palette (or import it from a central theme file)
const Colors = {
  primaryTeal: '#008080',
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
};

const NewChatModal = ({ visible, onClose, navigation }) => {
  const handleNavigateAndClose = (screenName) => {
    navigation.navigate(screenName);
    onClose(); // Close the modal after navigating
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Start New Chat</Text>
          <TouchableOpacity
            style={modalStyles.modalButton}
            onPress={() => handleNavigateAndClose('GroupChat')}
          >
            <Text style={modalStyles.modalButtonText}>New Group Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={modalStyles.modalButton}
            onPress={() => handleNavigateAndClose('OneChat')}
          >
            <Text style={modalStyles.modalButtonText}>New Direct Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.modalButton, modalStyles.closeButton]}
            onPress={onClose}
          >
            <Text style={modalStyles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Define modal-specific styles here
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.darkText,
  },
  modalButton: {
    backgroundColor: Colors.primaryTeal,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    elevation: 2,
    marginTop: 10,
    width: '90%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: Colors.accentSalmon,
    marginTop: 20,
  },
});

export default NewChatModal;