import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Switch, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, arrayUnion, addDoc, collection, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ReturnsModal = ({ visible, onClose, onLogReturns }) => {
  const [hasReturns, setHasReturns] = useState(false);
  const [returnCount, setReturnCount] = useState('');
  const [selectedReasons, setSelectedReasons] = useState(new Set());
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState(null);

  const reasons = ['Business Closed', 'Access Problem', 'Customer Unavailable', 'Other'];

  useEffect(() => {
    // Jey: Fetch the current driver's data to get the DSP ID
    const fetchDriverData = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setDriverData(userDoc.data());
                }
            }
        } catch (error) {
            console.error("Jey: Error fetching driver data:", error);
        }
    };
    fetchDriverData();
  }, [visible]);

  const handleToggleReason = (reason) => {
    setSelectedReasons(prev => {
      const newReasons = new Set(prev);
      if (newReasons.has(reason)) {
        newReasons.delete(reason);
      } else {
        newReasons.add(reason);
      }
      return newReasons;
    });
  };

  const handleSubmit = async () => {
    if (hasReturns) {
      if (!returnCount || parseInt(returnCount) <= 0) {
        Alert.alert('Missing Information', 'Please enter a valid number of returns.');
        return;
      }
      if (selectedReasons.size === 0) {
        Alert.alert('Missing Information', 'Please select at least one reason for the returns.');
        return;
      }
    }
    
    // Jey: Check if driver data is available and has a DSP assigned
    if (!driverData || !driverData.dspUserId) {
      Alert.alert('Error', 'No DSP is assigned to this driver. Cannot log returns.');
      onClose();
      return;
    }

    setLoading(true);
    let reasonsToLog = Array.from(selectedReasons);
    if (otherReason.trim() !== '') {
      reasonsToLog.push(otherReason.trim());
    }

    try {
        // Jey: Create a new document in the 'returns' collection to trigger a notification
        await addDoc(collection(db, 'returns'), {
            driverId: getAuth().currentUser.uid,
            driverName: driverData.name,
            dspId: driverData.dspUserId,
            hasReturns,
            returnCount: hasReturns ? parseInt(returnCount) : 0,
            reasons: hasReturns ? reasonsToLog : [],
            timestamp: serverTimestamp(),
            notified: false, // Jey: Add a flag for the cloud function to use
        });

        // Jey: Call the parent's onLogReturns function with the updated data
        await onLogReturns({
            hasReturns,
            returnCount: hasReturns ? parseInt(returnCount) : 0,
            reasons: hasReturns ? reasonsToLog : [],
        });
        
        setHasReturns(false);
        setReturnCount('');
        setSelectedReasons(new Set());
        setOtherReason('');
    } catch (error) {
        console.error("Jey: Error logging returns:", error);
        Alert.alert("Error", "Failed to log returns. Please try again.");
    } finally {
        setLoading(false);
        onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={returnsModalStyles.centeredView}
      >
        <View style={returnsModalStyles.modalView}>
          <Text style={returnsModalStyles.modalTitle}>Route Completion</Text>
          <Text style={returnsModalStyles.modalSubtitle}>Log your returns for today's route.</Text>

          <View style={returnsModalStyles.switchContainer}>
            <Text style={returnsModalStyles.switchLabel}>Did you have any returns?</Text>
            <Switch
              onValueChange={setHasReturns}
              value={hasReturns}
              trackColor={{ false: '#767577', true: '#FA8072' }}
              thumbColor={hasReturns ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>

          {hasReturns && (
            <>
              <TextInput
                style={returnsModalStyles.input}
                placeholder="Number of returns"
                keyboardType="numeric"
                value={returnCount}
                onChangeText={setReturnCount}
              />
              <Text style={returnsModalStyles.reasonTitle}>Reasons for Return</Text>
              <View style={returnsModalStyles.reasonsContainer}>
                {reasons.map((reason, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      returnsModalStyles.reasonPill,
                      selectedReasons.has(reason) && returnsModalStyles.selectedReasonPill
                    ]}
                    onPress={() => handleToggleReason(reason)}
                  >
                    <Text style={[
                      returnsModalStyles.reasonPillText,
                      selectedReasons.has(reason) && returnsModalStyles.selectedReasonPillText
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedReasons.has('Other') && (
                <TextInput
                  style={returnsModalStyles.input}
                  placeholder="Enter other reason"
                  value={otherReason}
                  onChangeText={setOtherReason}
                />
              )}
            </>
          )}

          <View style={returnsModalStyles.buttonContainer}>
            <TouchableOpacity style={returnsModalStyles.cancelButton} onPress={onClose}>
              <Text style={returnsModalStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[returnsModalStyles.submitButton, { backgroundColor: hasReturns ? '#FA8072' : '#008080' }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={returnsModalStyles.buttonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const returnsModalStyles = StyleSheet.create({
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  reasonPill: {
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    marginBottom: 10,
  },
  selectedReasonPill: {
    backgroundColor: '#FA8072',
  },
  reasonPillText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedReasonPillText: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#008080',
    paddingVertical: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ReturnsModal;