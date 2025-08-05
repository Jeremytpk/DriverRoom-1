import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { db } from '../firebase';
import { doc, setDoc, collection, updateDoc } from 'firebase/firestore';

// Jey: Helper function to generate a unique 16-character alphanumeric ID
const generateId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const CompanyModal = ({ visible, onClose, companyToEdit, onCompanySaved }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [stationLocation, setStationLocation] = useState(''); // Jey: ✨ New state for station/location
  const [loading, setLoading] = useState(false);

  // Jey: Populate form with data if in "edit" mode
  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.name || '');
      setEmail(companyToEdit.email || '');
      setStationLocation(companyToEdit.stationLocation || ''); // Jey: ✨ Set station/location on edit
    } else {
      setName('');
      setEmail('');
      setStationLocation(''); // Jey: ✨ Clear station/location on add
    }
  }, [companyToEdit]);

  const handleSave = async () => {
    // Jey: Validate all required fields, including the new one
    if (!name || !email || !stationLocation) {
      Alert.alert("Missing Information", "Please enter a company name, contact email, and station/location.");
      return;
    }

    setLoading(true);
    try {
      if (companyToEdit) {
        // Jey: Update existing company document with the new field
        await updateDoc(doc(db, 'companies', companyToEdit.id), {
          name,
          email,
          stationLocation, // Jey: ✨ Include new field
        });
        Alert.alert("Success", `Company '${name}' updated successfully!`);
      } else {
        // Jey: Generate a custom 16-character ID
        const newCompanyId = generateId();

        // Jey: Use setDoc to create the new company document with the custom ID
        await setDoc(doc(db, 'companies', newCompanyId), {
          name,
          email,
          stationLocation, // Jey: ✨ Include new field
          createdAt: new Date(),
          DspId: newCompanyId,
        });

        // Jey: Use the same custom ID to create the corresponding user document
        await setDoc(doc(db, 'users', newCompanyId), {
          name,
          email,
          stationLocation, // Jey: ✨ Include new field
          role: 'company',
          isDsp: false,
          activated: true,
          DspId: newCompanyId,
        });
        
        Alert.alert("Success", `New company '${name}' added successfully!`);
      }
      onCompanySaved(); // Refresh the list in AdminScreen
    } catch (error) {
      console.error("Jey: Error saving company:", error);
      Alert.alert("Error", `Failed to save company. ${error.message}`);
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
        style={styles.centeredView}
      >
        <ScrollView contentContainerStyle={styles.modalView}>
          <Text style={styles.modalTitle}>
            {companyToEdit ? 'Edit Company' : 'Add New Company'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Company Name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Contact Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          {/* Jey: ✨ New input for Station/Location */}
          <TextInput
            style={styles.input}
            placeholder="Station / Location"
            placeholderTextColor="#999"
            value={stationLocation}
            onChangeText={setStationLocation}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {companyToEdit ? 'Save Changes' : 'Add Company'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    top: 150,
    padding: 25,
    width: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#6BB9F0',
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#6BB9F0',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CompanyModal;