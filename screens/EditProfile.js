import React, { useState, useEffect, useLayoutEffect } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Jey: Import your local image assets
import cameraIcon from '../assets/png/camera.png'; // For camera icon
import { LinearGradient } from 'expo-linear-gradient';

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
  const { userData, updateUserProfile } = useAuth();
  const navigation = useNavigation();

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [newProfilePictureUri, setNewProfilePictureUri] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setBio(userData.bio || '');
      setEmail(userData.email || '');
      setProfilePictureUrl(userData.profilePictureUrl || null);
    }

    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          console.log('Jey: Permission to access media library is required to pick a profile photo!');
        }
      }
    })();
  }, [userData]);

  const handleImagePick = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
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
      const blob = await response.blob();

      const storageRef = ref(storage, `profile_pictures/${userId}/${Date.now()}_profile.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Jey: Error uploading image to Firebase Storage:', error);
      throw new Error('Failed to upload profile picture.');
    }
  };

  const handleSaveProfile = async () => {
    if (!userData?.uid) {
      setErrorMessage('You must be logged in to edit your profile.');
      setShowErrorModal(true);
      return;
    }

    setUploading(true);

    try {
      let updatedProfilePictureUrl = profilePictureUrl;

      if (newProfilePictureUri) {
        updatedProfilePictureUrl = await uploadImageToFirebase(newProfilePictureUri, userData.uid);
      }

      const userDocRef = doc(db, 'users', userData.uid);
      await updateDoc(userDocRef, {
        name: name.trim(),
        bio: bio.trim(),
        email: email.trim(),
        profilePictureUrl: updatedProfilePictureUrl,
        updatedAt: new Date(),
      });

      updateUserProfile({
        ...userData,
        name: name.trim(),
        bio: bio.trim(),
        email: email.trim(),
        profilePictureUrl: updatedProfilePictureUrl,
      });

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.goBack();
      }, 1500);

    } catch (error) {
      console.error('Jey: Error saving profile:', error);
      setErrorMessage(error.message || 'Failed to save profile. Please try again.');
      setShowErrorModal(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.header}>Edit Your Profile</Text>

        <View style={styles.profileImageWrapper}>
          <TouchableOpacity style={styles.profilePictureContainer} onPress={handleImagePick}>
            {newProfilePictureUri ? (
              <Image source={{ uri: newProfilePictureUri }} style={styles.profilePicture} />
            ) : profilePictureUrl ? (
              <Image source={{ uri: profilePictureUrl }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePicture, styles.profilePicturePlaceholder]}>
                <MaterialIcons name="person" size={60} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraIconContainer} onPress={handleImagePick}>
              <Image source={cameraIcon} style={styles.cameraImage} />
          </TouchableOpacity>
        </View>
        {((profilePictureUrl && !newProfilePictureUri) || newProfilePictureUri) && (
          <TouchableOpacity style={styles.deletePhotoButton} onPress={async () => {
            setNewProfilePictureUri(null);
            setProfilePictureUrl(null);
            if (userData?.uid && profilePictureUrl && !newProfilePictureUri) {
              const userDocRef = doc(db, 'users', userData.uid);
              await updateDoc(userDocRef, { profilePictureUrl: null });
              updateUserProfile({ ...userData, profilePictureUrl: null });
            }
          }}>
            <Text style={styles.deletePhotoButtonText}>Remove Profile Photo</Text>
          </TouchableOpacity>
        )}

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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email address"
            placeholderTextColor={Colors.inactiveGray}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
          disabled={uploading}
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
    alignSelf: 'center',
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
    width: 150, // This width/height is for the *View* that contains the image
    height: 150, // This width/height is for the *View* that contains the image
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
  cameraImage: {
    width: 24, // Match Ionicons size
    height: 24, // Match Ionicons size
    tintColor: Colors.white, // Apply tint if your PNG is a monochrome icon
    resizeMode: 'contain',
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
  deletePhotoButton: {
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'center',
    backgroundColor: Colors.redAccent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  deletePhotoButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default EditProfile;