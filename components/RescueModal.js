// Jey: A modal to dispatch a rescue for a driver.
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Keyboard
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const RescueModal = ({ visible, onClose, onDispatch, allDrivers, rescueInitiator }) => {
  const [rescuee, setRescuee] = useState(null);
  const [rescueAddress, setRescueAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDrivers = allDrivers.filter(driver => 
    driver.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDriver = (driver) => {
    setRescuee(driver);
    setSearchQuery(''); // Clear search after selection
    Keyboard.dismiss();
  };
  
  const handleDispatch = () => {
    if (!rescuee || !rescueAddress) {
      Alert.alert('Missing Information', 'Please select a driver to rescue and enter an address.');
      return;
    }
    
    // Jey: Call the parent function to handle the dispatch logic
    onDispatch(rescueInitiator, rescuee, rescueAddress);
    // Reset state and close modal
    setRescuee(null);
    setRescueAddress('');
    onClose();
  };

  const renderDriverItem = ({ item }) => (
    <TouchableOpacity
      style={[
        rescueModalStyles.driverItem,
        rescuee?.id === item.id && rescueModalStyles.selectedDriverItem
      ]}
      onPress={() => handleSelectDriver(item)}
    >
      <Ionicons name="person-circle-outline" size={30} color="#6BB9F0" />
      <Text style={rescueModalStyles.driverName}>{item.name}</Text>
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
          <Text style={rescueModalStyles.modalSubtitle}>
            Rescue driver for <Text style={rescueModalStyles.initiatorName}>{rescueInitiator?.name}</Text>
          </Text>

          <TextInput
            style={rescueModalStyles.searchBar}
            placeholder="Search for a driver to rescue..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          {filteredDrivers.length > 0 && searchQuery !== '' && (
            <FlatList
              data={filteredDrivers}
              renderItem={renderDriverItem}
              keyExtractor={item => item.id}
              style={rescueModalStyles.driverList}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {rescuee && (
            <Text style={rescueModalStyles.selectedDriverText}>
              Rescuing: {rescuee.name}
            </Text>
          )}

          <TextInput
            style={rescueModalStyles.input}
            placeholder="Enter rescue address"
            placeholderTextColor="#999"
            value={rescueAddress}
            onChangeText={setRescueAddress}
          />

          <View style={rescueModalStyles.buttonContainer}>
            <TouchableOpacity style={rescueModalStyles.cancelButton} onPress={onClose}>
              <Text style={rescueModalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={rescueModalStyles.dispatchButton}
              onPress={handleDispatch}
              disabled={!rescuee || !rescueAddress}
            >
              <Text style={rescueModalStyles.buttonText}>Dispatch</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const rescueModalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  initiatorName: {
    fontWeight: 'bold',
    color: '#6BB9F0',
  },
  searchBar: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  driverList: {
    maxHeight: 150,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedDriverItem: {
    backgroundColor: '#e0f2f7',
    borderRadius: 8,
  },
  driverName: {
    marginLeft: 10,
    fontSize: 16,
  },
  selectedDriverText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6BB9F0',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  dispatchButton: {
    backgroundColor: '#FF9AA2',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default RescueModal;