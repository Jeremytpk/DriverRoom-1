import 'react-native-get-random-values';

import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard,
  Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = "Jertopak-98-61-80"; 

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

  const locationInputRef = useRef(null);
  const codeInputRef = useRef(null);
  const notesInputRef = useRef(null); // Jey: It's good practice to have a ref for all inputs

  // Test Firebase Storage access
  const testStorageAccess = async () => {
    try {
      console.log('🧪 Testing Firebase Storage access...');
      console.log('🧪 Storage instance:', {
        bucket: storage._location?.bucket,
        app: storage.app?.name
      });
      
      const currentUser = auth.currentUser;
      console.log('🧪 Current user:', currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified
      } : 'No user');
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }
      
      // Test creating a reference (this doesn't require permissions)
      const testRef = ref(storage, 'test-connection');
      console.log('🧪 Test reference created successfully');
      
      // Try to create a simple test upload to check permissions
      try {
        console.log('🧪 Testing write permissions...');
        const testData = new Blob(['test'], { type: 'text/plain' });
        const testUploadRef = ref(storage, `gate_photos/test_${Date.now()}.txt`);
        
        // Don't actually upload, just check if we can create the reference
        console.log('🧪 Write test reference created for path:', testUploadRef.fullPath);
      } catch (permError) {
        console.warn('🧪 Write permission test failed (this might be normal):', permError);
      }
      
      return true;
    } catch (error) {
      console.error('🧪 Storage access test failed:', error);
      throw error;
    }
  };

  // Debug imageUri changes
  useEffect(() => {
    console.log('📷 ImageUri changed:', imageUri);
  }, [imageUri]);

  useEffect(() => {
    if (visible) {
      // Test storage access when modal opens
      testStorageAccess();
      
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

      if (Platform.OS === 'web' && locationInputRef.current) {
        locationInputRef.current.focus();
      }
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
    try {
      console.log('📷 Requesting image picker permissions...');
      
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('📷 Permission status:', status);
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required', 
            'Please grant media library access to pick an image.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => {
                  // On iOS, this will open app settings
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  }
                }
              }
            ]
          );
          return false;
        }
        return true;
      }
      return true;
    } catch (error) {
      console.error('📷 Permission request failed:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
      return false;
    }
  };

  const pickImage = async () => {
    try {
      console.log('📷 Starting image picker...');
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('📷 Permission denied');
        return;
      }

      console.log('📷 Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Higher quality for better image
        allowsMultipleSelection: false,
      });

      console.log('📷 Image picker result:', {
        canceled: result.canceled,
        hasAssets: result.assets?.length > 0
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📷 Selected image:', {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });
        
        console.log('📷 About to set imageUri to:', asset.uri);
        setImageUri(prevUri => {
          console.log('📷 Previous imageUri:', prevUri);
          console.log('📷 New imageUri:', asset.uri);
          return asset.uri;
        });
      } else {
        console.log('📷 Image picker was canceled');
      }
    } catch (error) {
      console.error('📷 Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (uri) => {
    if (!uri) {
      console.log('📁 No image URI provided');
      return null;
    }

    try {
      console.log('📤 Starting image upload process...');
      console.log('📤 Image URI:', uri);
      
      // Test storage access first
      await testStorageAccess();

      // Fetch the image
      console.log('📤 Fetching image data...');
      const response = await fetch(uri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('📤 Blob created, size:', blob.size, 'bytes');
      console.log('📤 Blob type:', blob.type);

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = uuidv4();
      const filename = `gate_photos/${timestamp}_${randomId}.jpg`;
      
      console.log('📤 Upload filename:', filename);

      // Create storage reference
      const imageRef = ref(storage, filename);
      console.log('📤 Storage reference created');

      // Test storage connectivity and authentication
      try {
        console.log('📤 Testing storage access...');
        console.log('📤 Storage bucket:', storage._location?.bucket);
        console.log('📤 Storage app:', storage.app.name);
        
        // Check current user authentication
        const currentUser = auth.currentUser;
        console.log('📤 Current user:', currentUser ? currentUser.uid : 'No user');
        console.log('📤 User email:', currentUser ? currentUser.email : 'No email');
        
        if (!currentUser) {
          throw new Error('User not authenticated. Please log in again.');
        }
        
        // Test a simple storage operation first
        console.log('📤 Testing storage list operation...');
        const testRef = ref(storage, 'gate_photos/');
        
      } catch (storageError) {
        console.error('📤 Storage connectivity issue:', storageError);
        throw new Error(`Storage access failed: ${storageError.message}`);
      }

      // Upload with resumable upload for better error handling
      console.log('📤 Starting upload...');
      
      const uploadMetadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'AddGateCodeModal',
          userId: auth.currentUser?.uid || 'unknown'
        }
      };
      
      console.log('📤 Upload metadata:', uploadMetadata);
      
      const uploadTask = uploadBytesResumable(imageRef, blob, uploadMetadata);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('📤 Upload progress:', progress.toFixed(2) + '%');
          },
          (error) => {
            console.error('📤 Upload failed:', error);
            console.error('📤 Error code:', error.code);
            console.error('📤 Error message:', error.message);
            console.error('📤 Error details:', error.serverResponse);
            reject(error);
          },
          async () => {
            try {
              console.log('📤 Upload completed, getting download URL...');
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ Download URL obtained:', downloadURL);
              resolve(downloadURL);
            } catch (urlError) {
              console.error('📤 Failed to get download URL:', urlError);
              reject(urlError);
            }
          }
        );
      });

    } catch (error) {
      console.error('📤 Image upload error:', error);
      console.error('📤 Error name:', error.name);
      console.error('📤 Error message:', error.message);
      console.error('📤 Error stack:', error.stack);
      throw error;
    }
  };

  const handleSave = async () => {
    console.log('💾 Starting save process...');
    setLoading(true);
    
    try {
      const dspToSaveName = isAdmin ? selectedDspName : currentDspName;
      const dspToSaveId = isAdmin ? selectedDspId : userDspId;
      
      // Validation
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

      console.log('💾 Validation passed, processing data...');

      // Upload image if present
      let imageUrl = null;
      if (imageUri) {
        try {
          console.log('💾 Uploading image...');
          
          // First, verify user is still authenticated
          const currentUser = auth.currentUser;
          if (!currentUser) {
            throw new Error('Authentication expired. Please log in again.');
          }
          
          imageUrl = await uploadImage(imageUri);
          console.log('💾 Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error("💾 Image upload failed:", uploadError);
          
          // Show more specific error message
          let errorMessage = "Failed to upload image. ";
          let shouldRetry = false;
          
          if (uploadError.code === 'storage/unauthorized') {
            errorMessage += "You don't have permission to upload files. Please check your account permissions.";
          } else if (uploadError.code === 'storage/canceled') {
            errorMessage += "Upload was canceled.";
          } else if (uploadError.code === 'storage/unknown') {
            errorMessage += "An unknown server error occurred. This might be due to Firebase Storage rules or network issues.";
            shouldRetry = true;
          } else if (uploadError.message?.includes('Authentication expired')) {
            errorMessage += "Please log out and log back in to refresh your authentication.";
          } else if (uploadError.message?.includes('Storage access failed')) {
            errorMessage += uploadError.message;
          } else {
            errorMessage += "Please check your network connection and try again.";
            shouldRetry = true;
          }
          
          console.log('💾 Upload error details:', {
            code: uploadError.code,
            message: uploadError.message,
            name: uploadError.name
          });
          
          Alert.alert(
            "Upload Error", 
            errorMessage,
            shouldRetry ? [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Retry", 
                onPress: () => {
                  // Retry the save operation
                  handleSave();
                  return;
                }
              }
            ] : [{ text: "OK" }]
          );
          setLoading(false);
          return; 
        }
      }

      // Encrypt gate code
      let encryptedCode = null;
      try {
        console.log('💾 Encrypting gate code...');
        encryptedCode = CryptoJS.AES.encrypt(code, ENCRYPTION_KEY).toString();
        console.log('💾 Gate code encrypted successfully');
      } catch (encryptError) {
        console.error("💾 Encryption failed:", encryptError);
        Alert.alert("Encryption Error", "Failed to encrypt gate code. Please ensure the key is correct and the `react-native-get-random-values` library is installed.");
        setLoading(false);
        return; 
      }

      // Save to Firestore
      console.log('💾 Saving to Firestore...');
      await addDoc(collection(db, 'gateCodes'), {
        location: location,
        encryptedCode: encryptedCode,
        notes: notes,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        dspName: dspToSaveName,
        companyId: dspToSaveId,
      });

      console.log('💾 Gate code saved successfully!');
      Alert.alert('Success', 'Gate code added successfully!');
      
      // Reset form
      setLocation('');
      setCode('');
      setNotes('');
      setImageUri(null);
      setSelectedDspId('');
      setSelectedDspName('');
      
      onSave();
      
    } catch (error) {
      console.error("💾 Save process failed:", error);
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
    console.log('📷 Closing modal and resetting form');
    
    // Reset all form fields
    setLocation('');
    setCode('');
    setNotes('');
    setImageUri(null);
    setSelectedDspId('');
    setSelectedDspName('');
    setIsDspPickerVisible(false);
    
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalView}>
              <ScrollView
                contentContainerStyle={{ paddingBottom: 12 }}
                style={{ flexGrow: 1, alignSelf: 'stretch', width: '100%' }}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.titleContainer}>
                  <View style={styles.titleIconContainer}>
                    <Ionicons name="key" size={24} color="#6366F1" />
                  </View>
                  <Text style={styles.modalTitle}>Add New Gate Code</Text>
                  <Text style={styles.modalSubtitle}>Add gate access information to your system</Text>
                </View>
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
                {/* Photo Section */}
                <View style={styles.photoSection}>
                  <Text style={styles.photoSectionLabel}>Gate Photo (Optional)</Text>
                  {imageUri ? (
                    <View style={styles.photoPreviewContainer}>
                      <View style={styles.photoPreview}>
                        <Image 
                          source={{ uri: imageUri }} 
                          style={styles.previewImage}
                          resizeMode="cover"
                          onLoad={() => console.log('📷 Preview image loaded successfully')}
                          onError={(error) => {
                            console.log('📷 Preview image failed to load:', error.nativeEvent?.error);
                            console.log('📷 Failed URI was:', imageUri);
                          }}
                        />
                      </View>
                      <View style={styles.photoActions}>
                        <TouchableOpacity 
                          style={styles.changePhotoButton}
                          onPress={pickImage}
                          accessibilityLabel="Change Photo"
                        >
                          <Ionicons name="camera-outline" size={16} color="#6366F1" />
                          <Text style={styles.changePhotoText}>Change Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removePhotoButton}
                          onPress={() => {
                            console.log('📷 Removing selected image');
                            setImageUri(null);
                          }}
                          accessibilityLabel="Remove Photo"
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          <Text style={styles.removePhotoText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                      <Ionicons name="camera-outline" size={20} color="#6366F1" />
                      <Text style={styles.addPhotoText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  ref={locationInputRef} 
                  style={styles.input}
                  placeholder="Location/Complex Name *"
                  value={location}
                  onChangeText={setLocation}
                  placeholderTextColor="#999"
                  autoFocus={Platform.OS === 'web'}
                />
                <TextInput
                  ref={codeInputRef} 
                  style={styles.input}
                  placeholder="Gate Code *"
                  value={code}
                  onChangeText={setCode}
                  placeholderTextColor="#999"
                />
                <TextInput
                  ref={notesInputRef}
                  style={[styles.input, styles.notesInput]}
                  placeholder="Notes (Optional)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                />
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={[styles.buttonText, { marginLeft: 8 }]}>Saving...</Text>
                    </View>
                  ) : (
                    <View style={styles.saveButtonContent}>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={[styles.buttonText, { marginLeft: 8 }]}>Save Gate Code</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
                      autoFocus={Platform.OS === 'web'}
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
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    width: '92%',
    maxWidth: Platform.OS === 'web' ? 520 : '92%',
    maxHeight: '88%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    flexShrink: 1,
    flexGrow: 0,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2E3A59',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 28,
    textAlign: 'center',
    fontWeight: '400',
  },
  photoSection: {
    width: '100%',
    marginBottom: 24,
  },
  photoSectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFC',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#EEF2FF',
          borderColor: '#4F46E5',
        },
      },
    }),
  },
  addPhotoText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 104, // Ensure consistent height
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexShrink: 0, // Prevent shrinking
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#DDD6FE',
          borderColor: '#A5B4FC',
        },
      },
    }),
  },
  changePhotoText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#FECACA',
          borderColor: '#F87171',
        },
      },
    }),
  },
  removePhotoText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FAFBFC',
    fontWeight: '500',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        ':focus': {
          borderColor: '#6366F1',
          backgroundColor: '#FFFFFF',
        },
      },
    }),
  },
  notesInput: {
    height: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 32,
    gap: 16,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    padding: 18,
    borderRadius: 16,
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#4F46E5',
          transform: 'translateY(-1px)',
        },
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    padding: 18,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#E5E7EB',
          borderColor: '#D1D5DB',
        },
      },
    }),
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  titleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dspSelectionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  dspSelectionLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '600',
  },
  dspSelectButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FAFBFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#F3F4F6',
          borderColor: '#6366F1',
        },
      },
    }),
  },
  dspSelectButtonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  assignedDspTextContainer: {
    width: '100%',
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    bottom: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  assignedDspLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 12,
  },
  assignedDspName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dspPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dspPickerModal: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    width: '88%',
    maxWidth: Platform.OS === 'web' ? 450 : '88%',
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dspPickerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2E3A59',
    textAlign: 'center',
  },
  dspSearchInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FAFBFC',
    fontWeight: '500',
  },
  dspList: {
    flexGrow: 1,
    marginBottom: 20,
  },
  dspListItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#EEF2FF',
        },
      },
    }),
  },
  dspListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dspListItemAddress: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  emptyDspListText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 16,
    fontWeight: '500',
  },
  dspPickerCloseButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: '#4F46E5',
        },
      },
    }),
  },
  dspPickerCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddGateCodeModal;