// Jey: A new modal for managing company subscription plans.
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Alert, TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const UpgradeModal = ({ visible, onClose, onUpgrade }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('Trial');
  const [customDays, setCustomDays] = useState('');

  const handleUpgradePress = () => {
    if (!selectedPlan) {
      Alert.alert("Selection Required", "Please select a plan to upgrade.");
      return;
    }

    let days = 0;
    if (selectedPlan !== 'Essentials') {
      if (selectedDuration === 'Trial') {
        days = 15;
      } else if (selectedDuration === 'Full') {
        days = 30;
      } else if (selectedDuration === 'Other') {
        const parsedDays = parseInt(customDays, 10);
        if (isNaN(parsedDays) || parsedDays <= 0) {
          Alert.alert("Invalid Input", "Please enter a valid number of days.");
          return;
        }
        days = parsedDays;
      }
    }

    onUpgrade(selectedPlan, days);
    onClose();
    resetState();
  };
  
  const resetState = () => {
    setSelectedPlan(null);
    setSelectedDuration('Trial');
    setCustomDays('');
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        resetState();
        onClose();
      }}
    >
      <View style={upgradeStyles.centeredView}>
        <View style={upgradeStyles.modalView}>
          <Text style={upgradeStyles.modalTitle}>Upgrade Company Plan</Text>
          <Text style={upgradeStyles.modalSubtitle}>Select a plan and duration.</Text>

          {/* Plan Selection */}
          <View style={upgradeStyles.planContainer}>
            <TouchableOpacity
              style={[
                upgradeStyles.planButton,
                upgradeStyles.essentialsPlan,
                selectedPlan === 'Essentials' && upgradeStyles.planButtonSelected
              ]}
              onPress={() => {
                setSelectedPlan('Essentials');
                setSelectedDuration(null); // No duration for Essentials
              }}
            >
              <MaterialIcons name="local-fire-department" size={24} color="#fff" />
              <Text style={upgradeStyles.planButtonText}>Essentials</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                upgradeStyles.planButton,
                upgradeStyles.professionalPlan,
                selectedPlan === 'Professional' && upgradeStyles.planButtonSelected
              ]}
              onPress={() => setSelectedPlan('Professional')}
            >
              <MaterialIcons name="person-pin" size={24} color="#fff" />
              <Text style={upgradeStyles.planButtonText}>Professional</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                upgradeStyles.planButton,
                upgradeStyles.executivePlan,
                selectedPlan === 'Executive' && upgradeStyles.planButtonSelected
              ]}
              onPress={() => setSelectedPlan('Executive')}
            >
              <MaterialIcons name="corporate-fare" size={24} color="#fff" />
              <Text style={upgradeStyles.planButtonText}>Executive</Text>
            </TouchableOpacity>
          </View>
          
          {/* Jey: New duration selection section - only visible for paid plans */}
          {selectedPlan && selectedPlan !== 'Essentials' && (
            <View style={upgradeStyles.durationContainer}>
              <Text style={upgradeStyles.durationTitle}>Select Duration</Text>
              <View style={upgradeStyles.durationOptions}>
                <TouchableOpacity
                  style={[
                    upgradeStyles.durationButton,
                    selectedDuration === 'Trial' && upgradeStyles.durationButtonSelected,
                  ]}
                  onPress={() => setSelectedDuration('Trial')}>
                  <Text style={upgradeStyles.durationText}>Trial (15 days)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    upgradeStyles.durationButton,
                    selectedDuration === 'Full' && upgradeStyles.durationButtonSelected,
                  ]}
                  onPress={() => setSelectedDuration('Full')}>
                  <Text style={upgradeStyles.durationText}>Full (30 days)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    upgradeStyles.durationButton,
                    selectedDuration === 'Other' && upgradeStyles.durationButtonSelected,
                  ]}
                  onPress={() => setSelectedDuration('Other')}>
                  <Text style={upgradeStyles.durationText}>Other</Text>
                </TouchableOpacity>
              </View>

              {selectedDuration === 'Other' && (
                <TextInput
                  style={upgradeStyles.customDaysInput}
                  placeholder="Enter number of days"
                  keyboardType="numeric"
                  value={customDays}
                  onChangeText={setCustomDays}
                />
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={upgradeStyles.actionButtonContainer}>
            <TouchableOpacity
              style={[upgradeStyles.actionButton, upgradeStyles.cancelButton]}
              onPress={() => {
                resetState();
                onClose();
              }}>
              <Text style={upgradeStyles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                upgradeStyles.actionButton,
                upgradeStyles.upgradeButton,
                (!selectedPlan || (selectedDuration === 'Other' && !customDays)) && upgradeStyles.actionButtonDisabled,
              ]}
              onPress={handleUpgradePress}
              disabled={!selectedPlan || (selectedDuration === 'Other' && !customDays)}
            >
              <Text style={upgradeStyles.actionButtonText}>{selectedPlan === 'Essentials' ? 'Downgrade' : 'Upgrade'}</Text>
            </TouchableOpacity>
          </View>
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
  planButtonSelected: {
    borderWidth: 3,
    borderColor: '#FFD700', // Gold color to highlight selection
  },
  durationContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  durationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  durationOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  durationButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    flex: 1,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  durationButtonSelected: {
    borderColor: '#3498db',
    backgroundColor: '#e6f3ff',
    borderWidth: 2,
  },
  durationText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  customDaysInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    width: '100%',
    marginTop: 15,
    paddingHorizontal: 15,
    textAlign: 'center',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    marginTop: 25,
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
  upgradeButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  actionButtonDisabled: {
    backgroundColor: '#ddd',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default UpgradeModal;