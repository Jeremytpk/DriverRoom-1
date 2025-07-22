import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView, // Import KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase'; // Assuming db and storage are exported from firebase.js
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Centralized Color Palette (assuming it's consistent across your app)
const Colors = {
  primaryTeal: '#007070',
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
  redAccent: '#FF5733',
  inactiveGray: '#A0A0A0',
};

const EditProfile = () => {
  const { userData, updateUserProfile } = useAuth(); // Get user data and update function from AuthContext
  const navigation = useNavigation();

  // State for form fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  // Add state for email
  const [email, setEmail] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState(null); // Current URL from Firestore
  const [newProfilePictureUri, setNewProfilePictureUri] = useState(null); // URI of newly picked image

  // State for UI feedback
  const [uploading, setUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Populate form fields with current user data on component mount
    if (userData) {
      setName(userData.name || '');
      setBio(userData.bio || '');
      setEmail(userData.email || ''); // Populate email from userData
      setProfilePictureUrl(userData.profilePictureUrl || null);
    }

    // Request media library permissions
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          console.log('Jey: Permission to access media library is required to pick a profile photo!');
        }
      }
    })();
  }, [userData]); // Re-run if userData changes (e.g., after initial load)

  const handleImagePick = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.7, // Reduce quality for faster upload
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewProfilePictureUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Jey: Error picking image:', error);
      setErrorMessage('Failed to pick image. Please try again.');
      setShowErrorModal(true);
    }
  };

  const uploadImageToFirebase = async (uri, userId) => {
    if (!uri) return null;

    try {
      const response = await fetch(uri);
      const blob = await response.blob(); // Convert image URI to blob

      const storageRef = ref(storage, `profile_pictures/${userId}/${Date.now()}_profile.jpg`);
      await uploadBytes(storageRef, blob); // Upload blob to Firebase Storage
      const downloadURL = await getDownloadURL(storageRef); // Get the public URL

      return downloadURL;
    } catch (error) {
      console.error('Jey: Error uploading image to Firebase Storage:', error);
      throw new Error('Failed to upload profile picture.'); // Re-throw to be caught by handleSaveProfile
    }
  };

  const handleSaveProfile = async () => {
    if (!userData?.uid) {
      setErrorMessage('You must be logged in to edit your profile.');
      setShowErrorModal(true);
      return;
    }

    setUploading(true); // Start loading indicator

    try {
      let updatedProfilePictureUrl = profilePictureUrl;

      // 1. Upload new profile picture if selected
      if (newProfilePictureUri) {
        updatedProfilePictureUrl = await uploadImageToFirebase(newProfilePictureUri, userData.uid);
      }

      // 2. Update user document in Firestore
      const userDocRef = doc(db, 'users', userData.uid);
      await updateDoc(userDocRef, {
        name: name.trim(), // Trim whitespace
        bio: bio.trim(),
        email: email.trim(), // Save updated email
        profilePictureUrl: updatedProfilePictureUrl,
        updatedAt: new Date(), // Add an update timestamp
      });

      // 3. Update local user context
      updateUserProfile({
        ...userData,
        name: name.trim(),
        bio: bio.trim(),
        email: email.trim(), // Update email in context
        profilePictureUrl: updatedProfilePictureUrl,
      });

      setShowSuccessModal(true); // Show success message
      // Optionally navigate back after a short delay
      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.goBack();
      }, 1500);

    } catch (error) {
      console.error('Jey: Error saving profile:', error);
      setErrorMessage(error.message || 'Failed to save profile. Please try again.');
      setShowErrorModal(true);
    } finally {
      setUploading(false); // Stop loading indicator
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20} // Adjust as needed
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.header}>Edit Your Profile</Text>

        {/* New Wrapper View for positioning */}
        <View style={styles.profileImageWrapper}>
          <TouchableOpacity style={styles.profilePictureContainer} onPress={handleImagePick}>
            {newProfilePictureUri ? (
              <Image source={{ uri: newProfilePictureUri }} style={styles.profilePicture} />
            ) : profilePictureUrl ? (
              <Image source={{ uri: profilePictureUrl }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePicture, styles.profilePicturePlaceholder]}>
                <Ionicons name="person" size={60} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
          {/* Camera icon is now a sibling, but absolutely positioned relative to the wrapper */}
          <TouchableOpacity style={styles.cameraIconContainer} onPress={handleImagePick}>
              <Ionicons name="camera" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hintText}>Tap to change profile picture</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your display name"
            placeholderTextColor={Colors.inactiveGray}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* New Email Input Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email address"
            placeholderTextColor={Colors.inactiveGray}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address" // Hint for email keyboard
            autoCapitalize="none" // Don't auto-capitalize emails
            autoCorrect={false} // Don't auto-correct emails
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about yourself..."
            placeholderTextColor={Colors.inactiveGray}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProfile}
          disabled={uploading} // Disable button during upload/save
        >
          {uploading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="checkmark-circle" size={50} color="green" />
              <Text style={styles.modalText}>Profile updated successfully!</Text>
              <TouchableOpacity onPress={() => setShowSuccessModal(false)} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <Modal
          visible={showErrorModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowErrorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="warning" size={50} color={Colors.redAccent} />
              <Text style={styles.modalText}>Error!</Text>
              <Text style={styles.modalErrorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setShowErrorModal(false)} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 30,
    marginTop: 10,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    marginBottom: 10,
    position: 'relative',
    // --- New styles for centering the avatar within the wrapper ---
    alignSelf: 'center', // Centers the wrapper itself
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryTeal,
    overflow: 'hidden',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    resizeMode: 'cover',
  },
  profilePicturePlaceholder: {
    backgroundColor: Colors.primaryTeal,
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: Colors.accentSalmon,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  hintText: {
    fontSize: 14,
    color: Colors.mediumText,
    marginBottom: 30,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.darkText,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primaryTeal,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    width: '80%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalErrorText: {
    fontSize: 15,
    color: Colors.mediumText,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: Colors.primaryTeal,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfile;