import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { serverTimestamp, addDoc, collection } from 'firebase/firestore';

const RescueModal = ({ visible, onClose, onDispatch, allDrivers, rescuer }) => {
  const [selectedRescuee, setSelectedRescuee] = useState(null);
  const [rescueAddress, setRescueAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDispatchPress = async () => {
    // Jey: Added a safeguard to check if the 'rescuer' prop was passed correctly
    if (!rescuer || !rescuer.id) {
      console.error("Jey: RescueModal is missing the 'rescuer' prop or it's invalid.", rescuer);
      Alert.alert("Application Error", "The current user's information is missing. Could not dispatch rescue.");
      return;
    }

    if (!selectedRescuee) {
      Alert.alert("No Rescuee Selected", "Please select the driver who needs a rescue.");
      return;
    }
    if (!rescueAddress.trim()) {
      Alert.alert("Address Required", "Please enter the rescue location.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'rescues'), {
        rescuerId: rescuer.id,
        rescuerName: rescuer.name,
        rescueeId: selectedRescuee.id,
        rescueeName: selectedRescuee.name,
        rescueAddress,
        timestamp: serverTimestamp(),
        status: 'dispatched',
      });

      onDispatch(rescuer, selectedRescuee, rescueAddress);
      
      onClose();
      setSelectedRescuee(null);
      setRescueAddress('');
    } catch (error) {
      console.error("Jey: Error dispatching rescue:", error);
      Alert.alert("Error", "Failed to dispatch rescue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderDriverItem = ({ item }) => (
    <TouchableOpacity
      style={[
        rescueModalStyles.driverPill,
        selectedRescuee?.id === item.id && rescueModalStyles.selectedDriverPill
      ]}
      onPress={() => setSelectedRescuee(item)}
    >
      <Ionicons name="person-circle-outline" size={24} color={selectedRescuee?.id === item.id ? '#fff' : '#6BB9F0'} />
      <Text style={[
        rescueModalStyles.driverPillText,
        selectedRescuee?.id === item.id && rescueModalStyles.selectedDriverPillText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={rescueModalStyles.centeredView}>
        <View style={rescueModalStyles.modalView}>
          <Text style={rescueModalStyles.modalTitle}>Dispatch Rescue</Text>
          {rescuer && (
            <Text style={rescueModalStyles.modalSubtitle}>
              Rescuer: <Text style={{ fontWeight: 'bold' }}>{rescuer.name}</Text>
            </Text>
          )}

          <Text style={rescueModalStyles.label}>Select a Rescuee</Text>
          <FlatList
            horizontal
            data={allDrivers}
            renderItem={renderDriverItem}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            style={rescueModalStyles.driverList}
          />
          
          <Text style={rescueModalStyles.label}>Rescue Location</Text>
          <TextInput
            style={rescueModalStyles.input}
            placeholder="Enter rescue address"
            value={rescueAddress}
            onChangeText={setRescueAddress}
          />

          <View style={rescueModalStyles.buttonContainer}>
            <TouchableOpacity
              style={[rescueModalStyles.actionButton, rescueModalStyles.cancelButton]}
              onPress={onClose}
            >
              <Text style={rescueModalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rescueModalStyles.actionButton, rescueModalStyles.dispatchButton]}
              onPress={handleDispatchPress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={rescueModalStyles.buttonText}>Dispatch</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const rescueModalStyles = StyleSheet.create({
  // Styles remain the same
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  driverList: {
    marginBottom: 20,
  },
  driverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    backgroundColor: '#f1f1f1',
  },
  selectedDriverPill: {
    backgroundColor: '#6BB9F0',
    borderColor: '#6BB9F0',
  },
  driverPillText: {
    marginLeft: 8,
    color: '#333',
    fontWeight: '500',
  },
  selectedDriverPillText: {
    color: 'white',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingVertical: 15,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  dispatchButton: {
    backgroundColor: '#6BB9F0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RescueModal;