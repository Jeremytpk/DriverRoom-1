import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// Define a consistent color palette (can be imported from a central theme file later)
const Colors = {
  primaryTeal: '#007070', // Slightly darker teal
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
  redAccent: '#FF5733', // A more vibrant red for alerts/actions
};


const CreatePost = ({ navigation }) => {
  const { userData } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null); // Stores URI
  const [uploading, setUploading] = useState(false);

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
              Alert.alert('Permission Required', 'Please grant media library permissions to select a photo.');
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7, // Lowered quality slightly for faster upload/smaller size
            });
            if (!result.canceled) {
              setImage(result.assets[0].uri);
            }
          }
        },
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please grant camera permissions to take a photo.');
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7,
            });
            if (!result.canceled) {
              setImage(result.assets[0].uri);
            }
          }
        },
      ],
      { cancelable: true }
    );
  };

  const removeImage = () => {
    setImage(null);
  };

  const handlePost = async () => {
    if (!content.trim() && !image) {
      Alert.alert('Hold On!', 'You need to add some words or a picture to your post before sharing it.');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;

      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        const storageRef = ref(storage, `posts/${userData.uid}_${Date.now()}`); // More unique path
        const snapshot = await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'posts'), {
        content,
        image: imageUrl,
        authorId: userData.uid, // Store author's UID for better referencing
        author: userData.email,
        authorName: userData.name,
        authorAvatar: userData.profilePictureUrl || null, // Store avatar for display
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success!', 'Your post has been shared with the community!');
      navigation.goBack();
    } catch (error) {
      console.error('Jey: Error creating post:', error);
      Alert.alert('Oh No!', 'Something went wrong while trying to create your post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Adjust offset as needed
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={Colors.mediumText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[styles.postButton, (uploading || (!content.trim() && !image)) && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={uploading || (!content.trim() && !image)}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Use ScrollView for content area to ensure everything is scrollable if keyboard appears or content overflows */}
      <ScrollView style={styles.contentArea} contentContainerStyle={styles.contentAreaInner}>
        <View style={styles.userInfo}>
          {/* Reusing avatar logic from Settings */}
          <View style={styles.avatarContainer}>
            {userData?.profilePictureUrl ? (
              <Image source={{ uri: userData.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={30} color={Colors.white} />
              </View>
            )}
            {/* The editAvatarIcon has been removed as per your request */}
          </View>
          <Text style={styles.userName}>{userData?.name || 'Guest User'}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="What's on your mind? Share an update or a thought..."
          placeholderTextColor={Colors.mediumText}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top" // Ensures placeholder starts from top
        />

        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.postImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
              <Ionicons name="close-circle" size={28} color={Colors.redAccent} />
            </TouchableOpacity>
          </View>
        )}

        {/* MOVED: "Add Photo" button now below the input/image preview */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity style={styles.footerActionButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={26} color={Colors.primaryTeal} />
            <Text style={styles.footerButtonText}>Add Photo</Text>
          </TouchableOpacity>
          {/* Add more action buttons here if needed, e.g., location, tag users */}
        </View>
      </ScrollView>

      {/* The original footer is now part of the ScrollView's content */}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 17,
    backgroundColor: Colors.lightBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 15, // Adjust for iOS notch/status bar
  },
  headerButton: {
    padding: 5, // Make touchable area larger
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  postButton: {
    backgroundColor: Colors.accentSalmon,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: Colors.accentSalmon + '80', // 50% opacity
  },
  postButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  contentArea: {
    flex: 1, // Allow ScrollView to take available space
  },
  contentAreaInner: {
    padding: 15,
    paddingBottom: 20, // Add some bottom padding
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  // REUSED/ADAPTED STYLES FROM Settings.js
  avatarContainer: {
    width: 50, // Slightly smaller than Settings for CreatePost context
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: Colors.lightGray, // Fallback background
    borderWidth: 1, // Slightly thinner border than Settings
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // The editAvatarIcon style is also no longer needed as the component is removed.
  // editAvatarIcon: {
  //   position: 'absolute',
  //   bottom: 0,
  //   right: 0,
  //   backgroundColor: Colors.primaryTeal,
  //   borderRadius: 10,
  //   padding: 3,
  //   borderWidth: 1,
  //   borderColor: Colors.white,
  //   opacity: 0.8,
  // },
  // END REUSED STYLES
  userName: {
    fontWeight: '600',
    fontSize: 18,
    color: Colors.darkText,
  },
  input: {
    fontSize: 17,
    color: Colors.darkText,
    minHeight: 120, // Increased minHeight for more input space
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingTop: 15, // Ensure text starts from top inside padding
    paddingBottom: 15,
    marginBottom: 15,
    lineHeight: 24, // Improve readability
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000', // Subtle shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  postImage: {
    width: '100%',
    height: 250, // Increased height for better preview
    borderRadius: 10,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.white, // Background for better visibility of icon
    borderRadius: 15,
    padding: 2,
    opacity: 0.9,
  },
  // NEW: Container for action buttons, now inside ScrollView
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Align to start for action buttons
    alignItems: 'center',
    // No borderTopWidth needed here as it's not a fixed footer
    paddingVertical: 10,
    // paddingHorizontal: 15, // Already handled by contentAreaInner padding
  },
  footerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    backgroundColor: Colors.lightGray, // Subtle background for action buttons
  },
  footerButtonText: {
    marginLeft: 8,
    color: Colors.primaryTeal,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CreatePost;