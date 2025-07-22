import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, 
ActivityIndicator, TextInput, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path as needed
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext'; // To get userData.dspName

const Notice = ({ isVisible, onClose, initialNotices, onNoticesUpdated }) => {
  const { userData } = useAuth(); // Get dspName for fetching/adding notices
  const [notices, setNotices] = useState(initialNotices || []);
  const [loading, setLoading] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Form states for adding Notice
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formImage, setFormImage] = useState(null); // URI for selected image
  const [uploadingImage, setUploadingImage] = useState(false);
  const storage = getStorage(); // Get Firebase Storage instance

  // Jey: Fetch notices specific to the DSP
  const fetchNotices = async () => {
    setLoading(true);
    try {
      if (!userData?.dspName) {
        console.warn("Jey: DSP name not available to fetch notices.");
        return;
      }
      const noticesQuery = query(
        collection(db, 'notices_by_dsp', userData.dspName, 'items'),
        orderBy('createdAt', 'desc')
      );
      const noticesSnapshot = await getDocs(noticesQuery);
      const fetchedNotices = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(fetchedNotices);
      if (onNoticesUpdated) {
        onNoticesUpdated(fetchedNotices); // Callback to update parent (CompanyScreen)
      }
    } catch (error) {
      console.error("Jey: Error fetching notices:", error);
      Alert.alert("Error", "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) { // Fetch notices only when the modal is visible
      fetchNotices();
    }
  }, [isVisible, userData?.dspName]); // Re-fetch if modal visibility or dspName changes

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this notice?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              // Jey: Correct collection path for subcollections
              const docPath = doc(db, 'notices_by_dsp', userData.dspName, 'items', itemId);
              await deleteDoc(docPath);
              Alert.alert("Success", "Notice deleted successfully!");
              fetchNotices(); // Re-fetch to update list
            } catch (error) {
              console.error("Jey: Error deleting notice:", error);
              Alert.alert("Error", "Failed to delete notice. Please try again.");
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

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
              Alert.alert('Permission required', 'Please grant media library permissions.');
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              setFormImage(result.assets[0].uri);
            }
          }
        },
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Please grant camera permissions.');
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              setFormImage(result.assets[0].uri);
            }
          }
        },
      ],
      { cancelable: true }
    );
  };

  const uploadImageToFirebase = async (uri) => {
    setUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `notice_images/${userData.dspName}_${Date.now()}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Jey: Error uploading image:", error);
      Alert.alert("Upload Failed", "Could not upload image. Please try again.");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddNotice = async () => {
    if (!formTitle.trim() || !formMessage.trim()) {
      Alert.alert("Error", "Title and Message cannot be empty.");
      return;
    }

    let imageUrl = null;
    if (formImage) {
      imageUrl = await uploadImageToFirebase(formImage);
      if (!imageUrl) {
        return; // Stop if image upload fails
      }
    }

    try {
      const noticesCollectionRef = collection(db, 'notices_by_dsp', userData.dspName, 'items');
      await addDoc(noticesCollectionRef, {
        title: formTitle.trim(),
        message: formMessage.trim(),
        imageUrl: imageUrl,
        dspName: userData.dspName,
        createdAt: serverTimestamp(), // Use server timestamp for consistent ordering
      });
      Alert.alert("Success", "Notice added successfully!");
      // Reset form and close modal
      setFormTitle('');
      setFormMessage('');
      setFormImage(null);
      setIsAddModalVisible(false);
      fetchNotices(); // Re-fetch to update list
    } catch (error) {
      console.error("Jey: Error adding notice:", error);
      Alert.alert("Error", "Failed to add notice. Please try again.");
    }
  };

  const renderNoticeItem = ({ item }) => (
    <View style={styles.contentItem}>
      {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.contentImage} />}
      <View style={styles.contentItemTextContainer}>
        <Text style={styles.contentItemTitle}>{item.title}</Text>
        <Text style={styles.contentItemMessage}>{item.message}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
        <MaterialIcons name="delete" size={24} color="#FF5733" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Company Notices</Text>
            <TouchableOpacity onPress={() => setIsAddModalVisible(true)}>
              <MaterialIcons name="add-circle" size={30} color="#FF9AA2" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#6BB9F0" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={notices}
              renderItem={renderNoticeItem}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyListText}>No notices published yet.</Text>}
              contentContainerStyle={styles.listContentContainer}
            />
          )}
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jey: Add Notice Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.centeredView}
        >
          <View style={styles.addModalView}>
            <Text style={styles.addModalTitle}>Add New Notice</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={formTitle}
              onChangeText={setFormTitle}
            />
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Message"
              value={formMessage}
              onChangeText={setFormMessage}
              multiline
            />
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              <MaterialIcons name="image" size={24} color="#fff" />
              <Text style={styles.imagePickerButtonText}>
                {formImage ? 'Image Selected' : 'Choose Image (Optional)'}
              </Text>
              {uploadingImage && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 10 }} />}
            </TouchableOpacity>
            {formImage && (
              <Image source={{ uri: formImage }} style={styles.selectedImagePreview} />
            )}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={() => { setIsAddModalVisible(false); setFormTitle(''); setFormMessage(''); setFormImage(null); }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSaveButton]} onPress={handleAddNotice} disabled={uploadingImage}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6BB9F0',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  contentItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
    resizeMode: 'cover',
  },
  contentItemTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  contentItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contentItemMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#888',
    paddingVertical: 20,
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#FF9AA2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Add Modal Styles (reused from CompanyScreen)
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  addModalView: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6BB9F0',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    flexDirection: 'row',
    backgroundColor: '#6BB9F0',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  selectedImagePreview: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalSaveButton: {
    backgroundColor: '#6BB9F0',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Notice;