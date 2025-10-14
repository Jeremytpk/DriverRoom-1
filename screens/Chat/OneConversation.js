import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList, Image, SafeAreaView,
  Alert, ActivityIndicator, Modal, Dimensions, PanResponder, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import {
  collection, doc, addDoc, serverTimestamp, onSnapshot,
  orderBy, query, updateDoc, setDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const OneConversation = ({ route }) => {
  // Jey: Destructure userName directly from route.params, and keep otherParticipantEmail for logic if needed
  const { chatId, otherParticipantEmail, userName } = route.params;
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef(null);
  const navigation = useNavigation();

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);

  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          setIsImageViewerVisible(false);
          setCurrentImageUri(null);
        }
      },
      onPanResponderTerminate: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          setIsImageViewerVisible(false);
          setCurrentImageUri(null);
        }
      },
    })
  ).current;

  const markChatAsRead = async () => {
    if (!userData?.uid || !chatId) return;

    try {
      const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', chatId);
      await setDoc(userChatDocRef, {
        lastReadMessageTimestamp: serverTimestamp(),
      }, { merge: true });
      console.log(`Jey: Chat ${chatId} marked as read for user ${userData.uid}`);
    } catch (error) {
      console.error('Jey: Error marking chat as read:', error);
    }
  };

  useEffect(() => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = [];
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messagesData);

      if (messagesData.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  useFocusEffect(
    React.useCallback(() => {
      markChatAsRead();

      return () => {};
    }, [chatId, userData?.uid])
  );

  const pickImage = async () => {
    Alert.alert(
      "Send Photo",
      "Choose an option",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take Photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission required', 'Please grant camera permissions to take a photo.'); return; }
            let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.7, });
            if (!result.canceled && result.assets && result.assets.length > 0) { setSelectedImage(result.assets[0].uri); }
          }
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission required', 'Please grant media library permissions to select a photo.'); return; }
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.7, });
            if (!result.canceled && result.assets && result.assets.length > 0) { setSelectedImage(result.assets[0].uri); }
          }
        },
      ],
      { cancelable: true }
    );
  };

  const uploadImageToFirebase = async (uri, path) => {
    setUploadingImage(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storage = getStorage();

      const storageRef = ref(storage, `${path}/${userData.uid}_${Date.now()}`);
      const uploadTask = uploadBytes(storageRef, blob);

      await uploadTask;
      const downloadURL = await getDownloadURL(storageRef);

      console.log("Jey: Image uploaded to:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Jey: Error uploading image:", error);
      Alert.alert("Upload Failed", "Could not upload image. Please try again.");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };


  const handleSend = async () => {
    if (!message.trim() && !selectedImage) {
      return;
    }

    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImageToFirebase(selectedImage, `chat_images/${chatId}`);
      if (!imageUrl) {
        return;
      }
    }

    try {
      const newMessage = {
        text: message.trim(),
        sender: userData.email,
        senderName: userData.name, // Keep senderName as userData.name
        createdAt: serverTimestamp(),
        imageUrl: imageUrl,
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), newMessage);

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: newMessage.text || (imageUrl ? 'Image' : ''),
          sender: newMessage.sender,
          createdAt: newMessage.createdAt,
        },
        // Jey: Ensure participant UIDs are used if available, otherwise fallback to emails
        participants: [userData.email, otherParticipantEmail].sort(), // Use emails for consistency with chat creation
        updatedAt: serverTimestamp(),
        isGroup: false,
      });

      markChatAsRead();

      setMessage('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Jey: Error sending message:', error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const openImageViewer = (uri) => {
    setCurrentImageUri(uri);
    setIsImageViewerVisible(true);
  };

  const renderMessageItem = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.sender === userData.email ? styles.myMessage : styles.otherMessage
    ]}>
      {item.sender !== userData.email && (
        // Jey: Use the 'userName' prop directly for the other participant's name
        <Text style={styles.senderName}>{userName || otherParticipantEmail || 'Unknown User'}</Text>
      )}
      {item.imageUrl && (
        <TouchableOpacity onPress={() => openImageViewer(item.imageUrl)}>
          <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
        </TouchableOpacity>
      )}
      {item.text.length > 0 && (
        <Text style={styles.messageText}>{item.text}</Text>
      )}
      <Text style={styles.messageTime}>
        {item.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <CustomHeader />


      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
      />

      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageButton}>
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.photoButton} disabled={uploadingImage}>
          {uploadingImage ? (
            <ActivityIndicator size="small" color="#6BB9F0" />
          ) : (
            <Ionicons name="image-outline" size={24} color="#6BB9F0" />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={message}
          onChangeText={setMessage}
          multiline
          editable={!uploadingImage}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={uploadingImage || (!message.trim() && !selectedImage)}
        >
          <Ionicons name="send" size={24} color={uploadingImage || (!message.trim() && !selectedImage) ? '#ccc' : '#FF9AA2'} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerBackground}
            activeOpacity={1}
            onPress={() => { setIsImageViewerVisible(false); setCurrentImageUri(null); }}
            {...panResponder.panHandlers}
          >
            {currentImageUri && (
              <Image source={{ uri: currentImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => { setIsImageViewerVisible(false); setCurrentImageUri(null); }}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSafeArea: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  // headerContainer: removed (no in-component header)
  headerLeft: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantNameHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6BB9F0',
    textAlign: 'center',
  },
  headerRight: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
  },
  participantPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ececec',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    resizeMode: 'cover',
  },
  participantPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007070', // A teal color, similar to Colors.primaryTeal from OneChat
    justifyContent: 'center',
    alignItems: 'center',
  },

  messagesList: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF9AA2',
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#6BB9F0',
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  messageImage: {
    width: 200,
    height: 266,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  imagePreview: {
    width: 100,
    height: 133,
    borderRadius: 8,
    resizeMode: 'cover',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    left: 95,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  photoButton: {
    padding: 8,
    marginRight: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
    color: '#333',
  },
  sendButton: {
    marginLeft: 10,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.7,
    resizeMode: 'contain',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
});

export default OneConversation;