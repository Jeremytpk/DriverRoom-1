// Jey: A new modal for managing company subscription plans.
import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const UpgradeModal = ({ visible, onClose, onUpgrade }) => {
  const handleUpgradeSelection = (plan) => {
    // Jey: Call the onUpgrade function from the parent with the selected plan
    onUpgrade(plan);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={upgradeStyles.centeredView}>
        <View style={upgradeStyles.modalView}>
          <Text style={upgradeStyles.modalTitle}>Upgrade Company Plan</Text>
          <Text style={upgradeStyles.modalSubtitle}>Select a new plan to upgrade or downgrade.</Text>

          <View style={upgradeStyles.planContainer}>
            <TouchableOpacity
              style={[upgradeStyles.planButton, upgradeStyles.essentialsPlan]}
              onPress={() => handleUpgradeSelection('Essentials')}
            >
              <MaterialIcons name="local-fire-department" size={24} color="#fff" />
              <Text style={upgradeStyles.planButtonText}>Essentials</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[upgradeStyles.planButton, upgradeStyles.professionalPlan]}
              onPress={() => handleUpgradeSelection('Professional')}
            >
              <MaterialIcons name="person-pin" size={24} color="#fff" />
              <Text style={upgradeStyles.planButtonText}>Professional</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[upgradeStyles.planButton, upgradeStyles.executivePlan]}
              onPress={() => handleUpgradeSelection('Executive')}
            >
              <MaterialIcons name="corporate-fare" size={24} color="#fff" />
              <Text style={upgradeStyles.planButtonText}>Executive</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={upgradeStyles.closeButton}
            onPress={onClose}
          >
            <Text style={upgradeStyles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const upgradeStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalView: {
    width: '80%',
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  planContainer: {
    width: '100%',
    marginBottom: 20,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  essentialsPlan: {
    backgroundColor: '#3498db',
  },
  professionalPlan: {
    backgroundColor: '#2ecc71',
  },
  executivePlan: {
    backgroundColor: '#9b59b6',
  },
  planButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
});

export default UpgradeModal;