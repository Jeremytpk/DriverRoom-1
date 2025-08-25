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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  const [stationLocation, setStationLocation] = useState('');
  const [logoUri, setLogoUri] = useState(null); // Jey: State to hold the logo URI for preview
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.name || '');
      setEmail(companyToEdit.email || '');
      setStationLocation(companyToEdit.stationLocation || '');
      setLogoUri(companyToEdit.logoUrl || null); // Jey: Set logo URL on edit
    } else {
      setName('');
      setEmail('');
      setStationLocation('');
      setLogoUri(null); // Jey: Clear logo on add
    }
  }, [companyToEdit]);

  // Jey: Handles the camera selection
  const handleCameraSelection = () => {
    Alert.alert("Camera Selected", "This would open your device's camera. For now, a placeholder logo will be used.");
    const dummyImage = 'https://placehold.co/100x100/A2D2FF/000000?text=Camera';
    setLogoUri(dummyImage);
  };

  // Jey: Handles the gallery selection
  const handleGallerySelection = () => {
    Alert.alert("Gallery Selected", "This would open your device's photo gallery. For now, a placeholder logo will be used.");
    const dummyImage = 'https://placehold.co/100x100/A2D2FF/000000?text=Gallery';
    setLogoUri(dummyImage);
  };

  // Jey: Presents the user with options to pick an image source
  const handleImagePicker = () => {
    Alert.alert(
      "Select Logo Source",
      "Choose a method to upload your company logo.",
      [
        { text: "Camera", onPress: handleCameraSelection },
        { text: "Gallery", onPress: handleGallerySelection },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const handleSave = async () => {
    if (!name || !email || !stationLocation) {
      Alert.alert("Missing Information", "Please enter a company name, contact email, and station/location.");
      return;
    }
    
    setLoading(true);
    try {
      if (companyToEdit) {
        await updateDoc(doc(db, 'companies', companyToEdit.id), {
          name,
          email,
          stationLocation,
          logoUrl: logoUri,
        });
        Alert.alert("Success", `Company '${name}' updated successfully!`);
      } else {
        const newCompanyId = generateId();
        await setDoc(doc(db, 'companies', newCompanyId), {
          name,
          email,
          stationLocation,
          logoUrl: logoUri,
          createdAt: new Date(),
          DspId: newCompanyId,
        });
        
        await setDoc(doc(db, 'users', newCompanyId), {
          name,
          email,
          stationLocation,
          role: 'company',
          isDsp: false,
          activated: true,
          DspId: newCompanyId,
        });
        
        Alert.alert("Success", `New company '${name}' added successfully!`);
      }
      onCompanySaved();
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

          <TouchableOpacity style={styles.logoContainer} onPress={handleImagePicker}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialIcons name="camera-alt" size={40} color="#6BB9F0" />
                <Text style={styles.logoText}>Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>
          
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6BB9F0',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#6BB9F0',
  },
  logoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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