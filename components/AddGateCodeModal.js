// AddGateCodeModal.js
import React, { useState, useEffect } from 'react'; // Jey: Added useEffect
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
  FlatList, // Jey: Added FlatList for DSP search results
  TouchableWithoutFeedback, // Jey: For dismissing keyboard
  Keyboard // Jey: For dismissing keyboard
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Jey: Props that should be passed from GateCodes.js
const AddGateCodeModal = ({
  visible,
  onClose,
  onSave,
  currentDspName,
  currentUserId,
  userDspId, // The actual DSP ID associated with the current user
  dsps,       // Array of all DSPs
  isAdmin     // Boolean flag if the current user is an admin
}) => {
  const [location, setLocation] = useState(''); // Renamed 'address' to 'location' for consistency with GateCodes.js
  const [code, setCode] = useState(''); // Renamed 'gateCode' to 'code' for consistency
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Jey: DSP Selection States
  const [selectedDspId, setSelectedDspId] = useState(''); // Stores the ID of the selected DSP
  const [selectedDspName, setSelectedDspName] = useState(''); // Stores the name of the selected DSP
  const [isDspPickerVisible, setIsDspPickerVisible] = useState(false); // Controls visibility of DSP search modal
  const [dspSearchQuery, setDspSearchQuery] = useState('');
  const [filteredDsps, setFilteredDsps] = useState([]);

  // Jey: Set default DSP values on mount or when props change
  useEffect(() => {
    if (visible) { // Only set defaults when modal becomes visible
      if (!isAdmin) {
        // For non-admins, default to their own DSP
        setSelectedDspId(userDspId || '');
        setSelectedDspName(currentDspName || 'N/A');
      } else {
        // For admins, clear selection initially for explicit choice, or set first DSP
        setSelectedDspId('');
        setSelectedDspName('');
        // Optional: If you want to default admin picker to the first DSP:
        // if (dsps && dsps.length > 0) {
        //   setSelectedDspId(dsps[0].id);
        //   setSelectedDspName(dsps[0].name);
        // }
      }
      // Reset other form fields when modal opens
      setLocation('');
      setCode('');
      setNotes('');
      setImageUri(null);
      setDspSearchQuery('');
      setFilteredDsps(dsps); // Initialize filtered list with all dsps
    }
  }, [visible, isAdmin, userDspId, currentDspName, dsps]);

  // Jey: Filter DSPs based on search query
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


  // Request media library permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library access to pick an image.');
        return false;
      }
      return true;
    }
    return true; // Web permissions are handled differently by the browser
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Reduce quality for faster uploads
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    if (!uri) return null;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `gate_photos/${uuidv4()}.jpg`;
      const imageRef = ref(storage, filename);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error) {
      console.error("Jey: Error uploading image: ", error);
      Alert.alert("Upload Error", "Failed to upload image. Please try again.");
      return null;
    }
  };

  const handleSave = async () => {
    if (!location || !code) {
      Alert.alert('Missing Information', 'Please enter both Location/Complex Name and Gate Code.');
      return;
    }

    // Jey: Validate DSP selection for admin
    if (isAdmin && !selectedDspId) {
      Alert.alert('Missing Information', 'Please select a DSP for this gate code.');
      return;
    }

    setLoading(true);
    let imageUrl = null;

    if (imageUri) {
      imageUrl = await uploadImage(imageUri);
    }

    try {
      // Jey: Determine which DSP's ID and Name to save
      const dspToSaveId = isAdmin ? selectedDspId : userDspId;
      const dspToSaveName = isAdmin ? selectedDspName : currentDspName;

      if (!dspToSaveId) {
        Alert.alert('Error', 'Could not determine DSP to associate the gate code with. Please try again or contact support.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'gateCodes'), {
        location: location, // Use 'location' for consistency
        code: code,         // Use 'code' for consistency
        notes: notes,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        addedBy: currentUserId, // User UID who physically added this
        dspName: dspToSaveName, // The name of the DSP this belongs to (for display/search)
        companyId: dspToSaveId, // The actual UID of the DSP document in 'dsps' collection (for filtering)
      });

      Alert.alert('Success', 'Gate code added successfully!');
      onSave(); // Callback to trigger re-fetch/close modal in parent
      // Reset is handled by useEffect when modal visibility changes
    } catch (e) {
      console.error("Jey: Error adding document: ", e);
      Alert.alert('Error', 'Failed to add gate code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDsp = (dsp) => {
    setSelectedDspId(dsp.id);
    setSelectedDspName(dsp.name);
    setIsDspPickerVisible(false); // Close the DSP selection modal
    setDspSearchQuery(''); // Clear search query
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
    onClose(); // Parent will handle setting visible to false, which triggers useEffect to reset
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

            {/* Jey: DSP Selection Section */}
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
                <Image source={require('../assets/gate.png')} style={styles.defaultImage} />
              )}
              <Text style={styles.imagePickerText}>Tap to Add Photo (Optional)</Text>
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

          {/* Jey: DSP Selection Modal (Searchable) */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isDspPickerVisible}
            onRequestClose={() => setIsDspPickerVisible(false)}
          >
            <View style={styles.dspPickerOverlay}>
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
            </View>
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
    top: 100, // Adjusted top for better visual centering on different screens
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25, // Slightly reduced padding for more content space
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '85%', // Adjusted maxHeight to give room for keyboard or fit screen
  },
  modalTitle: {
    fontSize: 24, // Slightly larger title
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FF9AA2',
  },
  imagePickerButton: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1, // Added border for clarity
    borderColor: '#ddd',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultImage: {
    width: 80, // Slightly smaller default icon
    height: 80,
    resizeMode: 'contain',
    tintColor: '#a0a0a0',
  },
  imagePickerText: {
    position: 'absolute',
    top: 10, // Positioned text higher up
    right: 10,
    color: '#333',
    fontSize: 12, // Smaller font for less obtrusiveness
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.8)', // More opaque background
    paddingHorizontal: 6, // Reduced padding
    paddingVertical: 3,
    borderRadius: 5,
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
    justifyContent: 'center', // Center content vertically
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 13,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Jey: New styles for DSP selection
  dspSelectionContainer: {
    width: '100%',
    marginBottom: 15,
    alignItems: 'flex-start', // Align label to start
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
  // Jey: Styles for the DSP search modal
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