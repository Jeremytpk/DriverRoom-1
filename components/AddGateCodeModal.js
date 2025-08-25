// Add this import at the very top
import 'react-native-get-random-values';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
// Jey: Import encryption library
import CryptoJS from 'crypto-js';

// Jey: IMPORTANT: For this in-code encryption, the key is here. In a production
// environment, this key should be obfuscated or fetched from a secure source.
// Ensure this key is exactly 32 bytes long for AES-256 encryption.
const ENCRYPTION_KEY = "Jertopak-98-61-80"; // Jey: Use a 32-byte key

const AddGateCodeModal = ({
  visible,
  onClose,
  onSave,
  currentDspName,
  userDspId,
  dsps,
  isAdmin
}) => {
  const [location, setLocation] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const [selectedDspId, setSelectedDspId] = useState('');
  const [selectedDspName, setSelectedDspName] = useState('');
  const [isDspPickerVisible, setIsDspPickerVisible] = useState(false);
  const [dspSearchQuery, setDspSearchQuery] = useState('');
  const [filteredDsps, setFilteredDsps] = useState([]);

  useEffect(() => {
    if (visible) {
      if (!isAdmin) {
        setSelectedDspId(userDspId || '');
        setSelectedDspName(currentDspName || 'N/A');
      } else {
        setSelectedDspId('');
        setSelectedDspName('');
      }
      setLocation('');
      setCode('');
      setNotes('');
      setImageUri(null);
      setDspSearchQuery('');
      setFilteredDsps(dsps);
    }
  }, [visible, isAdmin, userDspId, currentDspName, dsps]);

  useEffect(() => {
    if (dsps) {
      const lowerCaseQuery = dspSearchQuery.toLowerCase();
      const filtered = dsps.filter(dsp =>
        dsp.name.toLowerCase().includes(lowerCaseQuery) ||
        (dsp.address && dsp.address.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredDsps(filtered);
    }
  }, [dspSearchQuery, dsps]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library access to pick an image.');
        return false;
      }
      return true;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    if (!uri) return null;

    const response = await fetch(uri);
    const blob = await response.blob();

    const filename = `gate_photos/${uuidv4()}.jpg`;
    const imageRef = ref(storage, filename);
    await uploadBytes(imageRef, blob);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  };

  const handleSave = async () => {
    setLoading(true);

    const dspToSaveName = isAdmin ? selectedDspName : currentDspName;
    const dspToSaveId = isAdmin ? selectedDspId : userDspId;

    // Jey: Step 1: Input Validation
    if (!location || !code) {
      Alert.alert('Missing Information', 'Please enter both Location/Complex Name and Gate Code.');
      setLoading(false);
      return;
    }
    
    if (isAdmin && !selectedDspId) {
      Alert.alert('Missing Information', 'Please select a DSP for this gate code.');
      setLoading(false);
      return;
    }
    
    if (!dspToSaveId || !dspToSaveName) {
      Alert.alert('Error', 'Could not determine DSP to associate the gate code with. Please try again or contact support.');
      setLoading(false);
      return;
    }

    let imageUrl = null;
    // Jey: Step 2: Handle Image Upload Safely
    if (imageUri) {
      try {
        imageUrl = await uploadImage(imageUri);
      } catch (e) {
        console.error("Jey: Image upload failed:", e);
        Alert.alert("Upload Error", "Failed to upload image. Please check your network and try again.");
        setLoading(false);
        return; // Stop the function on upload failure
      }
    }

    let encryptedCode = null;
    // Jey: Step 3: Handle Code Encryption Safely
    try {
      encryptedCode = CryptoJS.AES.encrypt(code, ENCRYPTION_KEY).toString();
    } catch (e) {
      console.error("Jey: Encryption failed:", e);
      Alert.alert("Encryption Error", "Failed to encrypt gate code. Please ensure the key is correct and the `react-native-get-random-values` library is installed.");
      setLoading(false);
      return; // Stop the function on encryption failure
    }

    // Jey: Step 4: Save to Firestore Safely
    try {
      await addDoc(collection(db, 'gateCodes'), {
        location: location,
        encryptedCode: encryptedCode,
        notes: notes,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        dspName: dspToSaveName,
        companyId: dspToSaveId,
      });

      Alert.alert('Success', 'Gate code added successfully!');
      onSave();
    } catch (e) {
      console.error("Jey: Firestore save failed:", e);
      Alert.alert('Error', 'Failed to add gate code. Please check your Firebase permissions and network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDsp = (dsp) => {
    setSelectedDspId(dsp.id);
    setSelectedDspName(dsp.name);
    setIsDspPickerVisible(false);
    Keyboard.dismiss();
  };

  const renderDspItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dspListItem}
      onPress={() => handleSelectDsp(item)}
    >
      <Text style={styles.dspListItemName}>{item.name}</Text>
      {item.address && <Text style={styles.dspListItemAddress}>{item.address}</Text>}
    </TouchableOpacity>
  );

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.centeredView}>
          <ScrollView contentContainerStyle={styles.modalView}>
            <Text style={styles.modalTitle}>Add New Gate Code</Text>

            {isAdmin ? (
              <View style={styles.dspSelectionContainer}>
                <Text style={styles.dspSelectionLabel}>Assign to DSP:</Text>
                <TouchableOpacity
                  style={styles.dspSelectButton}
                  onPress={() => setIsDspPickerVisible(true)}
                >
                  <Text style={styles.dspSelectButtonText}>
                    {selectedDspName || 'Select a DSP'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.assignedDspTextContainer}>
                <Text style={styles.assignedDspLabel}>Assigned to:</Text>
                <Text style={styles.assignedDspName}>{currentDspName}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.selectedImage} />
              ) : (
                <>
                  <Image source={require('../assets/gate.png')} style={styles.defaultImage} />
                  <Text style={styles.imagePickerText}>Tap to Add Photo (Optional)</Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Location/Complex Name *"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Gate Code *"
              value={code}
              onChangeText={setCode}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
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
                  <Text style={styles.buttonText}>Save Gate Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <Modal
            animationType="slide"
            transparent={true}
            visible={isDspPickerVisible}
            onRequestClose={() => setIsDspPickerVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsDspPickerVisible(false)}>
              <View style={styles.dspPickerOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.dspPickerModal}>
                    <Text style={styles.dspPickerTitle}>Select a DSP</Text>
                    <TextInput
                      style={styles.dspSearchInput}
                      placeholder="Search DSPs..."
                      value={dspSearchQuery}
                      onChangeText={setDspSearchQuery}
                      clearButtonMode="while-editing"
                    />
                    <FlatList
                      data={filteredDsps}
                      keyExtractor={(item) => item.id}
                      renderItem={renderDspItem}
                      ListEmptyComponent={<Text style={styles.emptyDspListText}>No DSPs found.</Text>}
                      style={styles.dspList}
                    />
                    <TouchableOpacity
                      style={styles.dspPickerCloseButton}
                      onPress={() => setIsDspPickerVisible(false)}
                    >
                      <Text style={styles.dspPickerCloseButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
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
    margin: 20,
    top: 0,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FF9AA2',
  },
  imagePickerButton: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultImage: {
    width: 200,
    height: 80,
    resizeMode: 'contain',
    tintColor: '#a0a0a0',
  },
  imagePickerText: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
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
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
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
  dspSelectionContainer: {
    width: '100%',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  dspSelectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  dspSelectButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dspSelectButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  assignedDspTextContainer: {
    width: '100%',
    backgroundColor: '#e9f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d0e0e8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  assignedDspLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6BB9F0',
    marginRight: 8,
  },
  assignedDspName: {
    fontSize: 16,
    color: '#333',
  },
  dspPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  dspPickerModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dspPickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6BB9F0',
    textAlign: 'center',
  },
  dspSearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  dspList: {
    flexGrow: 1,
    marginBottom: 15,
  },
  dspListItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dspListItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dspListItemAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyDspListText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  dspPickerCloseButton: {
    backgroundColor: '#FF9AA2',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dspPickerCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddGateCodeModal;