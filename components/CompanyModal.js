import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Image, Keyboard, Platform
} from 'react-native';
import { db, storage } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
// Jey: Import expo-image-picker
import * as ImagePicker from 'expo-image-picker';

const CompanyModal = ({ visible, onClose, companyToEdit, onCompanySaved }) => {
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [stationLocation, setStationLocation] = useState('');
  const [logoUri, setLogoUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (visible && companyToEdit) {
      setCompanyName(companyToEdit.name || '');
      setCompanyEmail(companyToEdit.email || '');
      setStationLocation(companyToEdit.stationLocation || '');
      setLogoUri(companyToEdit.logoUrl || null);
    } else if (visible && !companyToEdit) {
      // Jey: Reset state for new company creation
      setCompanyName('');
      setCompanyEmail('');
      setStationLocation('');
      setLogoUri(null);
    }
  }, [visible, companyToEdit]);

  const pickImage = async () => {
    Alert.alert(
      "Choose Image Source",
      "Do you want to pick from gallery or take a photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Please grant media library permissions to select a photo.');
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled) {
              setLogoUri(result.assets[0].uri);
            }
          }
        },
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Please grant camera permissions to take a photo.');
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled) {
              setLogoUri(result.assets[0].uri);
            }
          }
        },
      ],
      { cancelable: true }
    );
  };
  
  const uploadImage = async (uri) => {
    setIsUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `company_logos/${uuidv4()}.jpg`;
      const imageRef = ref(storage, filename);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error) {
      console.error("Jey: Error uploading company logo:", error);
      Alert.alert("Upload Failed", "Could not upload company logo. Please try again.");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!companyName || !companyEmail) {
      Alert.alert("Missing Information", "Company name and email are required.");
      return;
    }

    setLoading(true);
    let newLogoUrl = companyToEdit?.logoUrl || null;

    try {
      if (logoUri && logoUri !== companyToEdit?.logoUrl) {
        newLogoUrl = await uploadImage(logoUri);
      }

      const companyData = {
        name: companyName,
        email: companyEmail,
        stationLocation: stationLocation,
        logoUrl: newLogoUrl,
      };

      if (companyToEdit) {
        await setDoc(doc(db, 'companies', companyToEdit.id), companyData, { merge: true });
        Alert.alert("Success", "Company updated successfully!");
      } else {
        // Jey: Create a new company document
        const newCompanyRef = doc(collection(db, 'companies'));
        await setDoc(newCompanyRef, companyData);
        Alert.alert("Success", "New company created successfully!");
      }
      onCompanySaved();
      onClose();
    } catch (error) {
      console.error("Jey: Error saving company:", error);
      Alert.alert("Error", "Failed to save company. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {companyToEdit ? 'Edit Company' : 'Add New Company'}
          </Text>

          <TouchableOpacity style={styles.logoPicker} onPress={pickImage}>
            {isUploadingImage ? (
              <ActivityIndicator size="small" color="#6BB9F0" />
            ) : logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} />
            ) : (
              <>
                <MaterialIcons name="business" size={60} color="#ccc" />
                <Text style={styles.logoPickerText}>Add Company Logo</Text>
              </>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <TextInput
            style={styles.input}
            placeholder="Company Email *"
            value={companyEmail}
            onChangeText={setCompanyEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Station/Location"
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
              disabled={loading || isUploadingImage}
            >
              {loading || isUploadingImage ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    marginBottom: 20,
    color: '#6BB9F0',
  },
  logoPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPickerText: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#6BB9F0',
    padding: 13,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 13,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CompanyModal;