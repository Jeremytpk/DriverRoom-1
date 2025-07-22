import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList, Image, SafeAreaView,
  Alert, ActivityIndicator, Modal, Dimensions, PanResponder, ScrollView
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  collection, doc, addDoc, serverTimestamp, onSnapshot,
  orderBy, query, updateDoc, getDoc, arrayUnion, limit, deleteDoc,
  setDoc // Jey: Added setDoc for marking as read
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Jey: Added useFocusEffect
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const GroupConversation = ({ route }) => {
  const { groupId } = route.params;
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef(null);
  const navigation = useNavigation();

  const [currentGroupName, setCurrentGroupName] = useState(route.params.groupName);
  const [currentGroupPhotoURL, setCurrentGroupPhotoURL] = useState(route.params.groupPhotoURL);

  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState(null);

  const [isGroupAdminModalVisible, setIsGroupAdminModalVisible] = useState(false);
  const [groupAdmin, setGroupAdmin] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isGroupInfoLoading, setIsGroupInfoLoading] = useState(true);

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(currentGroupName);
  const [newGroupPhoto, setNewGroupPhoto] = useState(currentGroupPhotoURL);
  const [isUploadingGroupPhoto, setIsUploadingGroupPhoto] = useState(false);

  const [showAddMembersSection, setShowAddMembersSection] = useState(false);
  const [allUsersForSelection, setAllUsersForSelection] = useState([]);
  const [loadingUsersForSelection, setLoadingUsersForSelection] = useState(true);
  const [searchNewMemberQuery, setSearchNewMemberQuery] = useState('');
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);

  const [hasChanges, setHasChanges] = useState(false);

  const [pinnedNotice, setPinnedNotice] = useState(null);

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

  // Jey: Function to mark the current chat as read for the user
  const markChatAsRead = async () => {
    if (!userData?.uid || !groupId) return;

    try {
      const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', groupId);
      // Use setDoc with merge: true to create the document if it doesn't exist,
      // or update it if it does, without overwriting other fields.
      await setDoc(userChatDocRef, {
        lastReadMessageTimestamp: serverTimestamp(),
      }, { merge: true });
      console.log(`Jey: Group chat ${groupId} marked as read for user ${userData.uid}`);
    } catch (error) {
      console.error('Jey: Error marking group chat as read:', error);
    }
  };

  // Jey: Use useFocusEffect to mark chat as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      markChatAsRead(); // Mark as read when entering/focusing the screen

      return () => {
        // Optional: you might want to mark as read again when leaving the screen
        // to ensure any messages received while on screen but not scrolled to are marked.
        // markChatAsRead();
      };
    }, [groupId, userData?.uid]) // Depend on groupId and userData.uid
  );

  // Jey: Effect to track changes for save button in admin modal
  useEffect(() => {
    const nameChanged = newGroupName.trim() !== currentGroupName;
    const photoChanged = newGroupPhoto !== currentGroupPhotoURL;

    setHasChanges(nameChanged || photoChanged);
  }, [newGroupName, currentGroupName, newGroupPhoto, currentGroupPhotoURL]);


  // Jey: Fetch group messages
  useEffect(() => {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
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
  }, [groupId]);

  // Jey: Fetch live group info (name, photo, admin, members) and update header
  useEffect(() => {
    const groupDocRef = doc(db, 'groups', groupId);

    const unsubscribeGroupInfo = onSnapshot(groupDocRef, async (groupDocSnap) => {
      setIsGroupInfoLoading(true);
      try {
        if (groupDocSnap.exists()) {
          const groupData = groupDocSnap.data();

          setCurrentGroupName(groupData.name);
          setCurrentGroupPhotoURL(groupData.photoURL);

          setNewGroupName(groupData.name);
          setNewGroupPhoto(groupData.photoURL);
          setGroupAdmin(groupData.createdBy);

          const memberUids = groupData.members || [];
          const fetchedMembers = [];
          for (const uid of memberUids) {
            const memberDocSnap = await getDoc(doc(db, 'users', uid));
            if (memberDocSnap.exists()) {
              fetchedMembers.push({ id: memberDocSnap.id, ...memberDocSnap.data() });
            }
          }
          setGroupMembers(fetchedMembers);
        } else {
          console.warn("Jey: Group document does not exist:", groupId);
          Alert.alert("Group Not Found", "This group no longer exists or you don't have access.");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Jey: Error fetching live group info:", error);
        Alert.alert("Error", "Failed to load live group information.");
      } finally {
        setIsGroupInfoLoading(false);
      }
    });

    return () => unsubscribeGroupInfo();
  }, [groupId, navigation]);

  // Jey: Fetch the latest notice for pinning
  useEffect(() => {
    const fetchLatestNotice = async () => {
      if (!userData?.dspName) {
        setPinnedNotice(null);
        return;
      }
      try {
        const noticesRef = collection(db, 'notices_by_dsp', userData.dspName, 'items');
        const q = query(noticesRef, orderBy('createdAt', 'desc'), limit(1));

        const unsubscribeNotice = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            setPinnedNotice({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
          } else {
            setPinnedNotice(null);
          }
        }, (error) => {
          console.error("Jey: Error fetching latest notice:", error);
          setPinnedNotice(null);
        });

        return () => unsubscribeNotice();
      } catch (error) {
        console.error("Jey: Error setting up notice listener:", error);
        setPinnedNotice(null);
      }
    };

    fetchLatestNotice();
  }, [userData?.dspName]);


  // Jey: Reset temporary admin modal states when modal closes
  useEffect(() => {
    if (!isGroupAdminModalVisible) {
      setIsEditingGroupName(false);
      setShowAddMembersSection(false);
      setSelectedNewMembers([]);
      setSearchNewMemberQuery('');
      setHasChanges(false);
    }
  }, [isGroupAdminModalVisible]);


  // Jey: Fetch all users for "Add Members" section
  useEffect(() => {
    if (!isGroupAdminModalVisible || !showAddMembersSection) {
      setAllUsersForSelection([]);
      return;
    }

    const fetchAllUsers = async () => {
      setLoadingUsersForSelection(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.id !== userData.uid && !groupMembers.some(member => member.id === user.id));

        setAllUsersForSelection(users);
      } catch (error) {
        console.error("Jey: Error fetching users for selection:", error);
        Alert.alert("Error", "Failed to load users for selection.");
      } finally {
        setLoadingUsersForSelection(false);
      }
    };

    fetchAllUsers();
  }, [isGroupAdminModalVisible, showAddMembersSection, groupMembers, userData.uid]);


  // Jey: Image picking for message sending
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

  // Jey: Image picking for group profile photo
  const pickGroupPhoto = async () => {
    Alert.alert(
      "Update Group Photo",
      "Choose an option",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take Photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission required', 'Please grant camera permissions to take a photo.'); return; }
            let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, });
            if (!result.canceled && result.assets && result.assets.length > 0) { setNewGroupPhoto(result.assets[0].uri); }
          }
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission required', 'Please grant media library permissions to select a photo.'); return; }
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, });
            if (!result.canceled && result.assets && result.assets.length > 0) { setNewGroupPhoto(result.assets[0].uri); }
          }
        },
      ],
      { cancelable: true }
    );
  };

  // Jey: Generic image upload to Firebase Storage
  const uploadImageToFirebase = async (uri, path) => {
    const setIsUploadingState = path.includes('group_photos') ? setIsUploadingGroupPhoto : setUploadingImage;
    setIsUploadingState(true);

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
      setIsUploadingState(false);
    }
  };

  // Jey: Handle sending chat messages (text or image)
  const handleSend = async () => {
    if (!message.trim() && !selectedImage) {
      return;
    }

    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImageToFirebase(selectedImage, `chat_images/${groupId}`);
      if (!imageUrl) {
        return;
      }
    }

    try {
      // Jey: Create the new message object
      const newMessage = {
        text: message.trim(),
        sender: userData.email,
        senderName: userData.name,
        createdAt: serverTimestamp(),
        imageUrl: imageUrl,
      };

      // Add the message to the group's messages subcollection
      await addDoc(collection(db, 'groups', groupId, 'messages'), newMessage);

      // Update the group's main document with the last message details
      // Jey: IMPORTANT: Add 'isGroup: true' here if it doesn't already exist for this group
      // This is crucial for the unread counts logic in AuthContext to differentiate.
      await updateDoc(doc(db, 'groups', groupId), {
        lastMessage: {
          text: newMessage.text || (imageUrl ? 'Image' : ''), // Show 'Image' if only image
          sender: newMessage.sender,
          createdAt: newMessage.createdAt,
        },
        updatedAt: serverTimestamp(), // Jey: Added for general chat sorting if needed
        isGroup: true, // Jey: Ensure this field exists for AuthContext logic
      });

      // Jey: Mark the chat as read for the current user after sending a message
      markChatAsRead();

      setMessage('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Jey: Error sending message:', error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  // Jey: Function to open image viewer modal
  const openImageViewer = (uri) => {
    setCurrentImageUri(uri);
    setIsImageViewerVisible(true);
  };

  const isGroupAdmin = userData.uid === groupAdmin;

  // Jey: Function to save group name and photo updates
  const handleSaveChanges = async () => {
    let updates = {};

    if (newGroupName.trim() !== currentGroupName) {
      updates.name = newGroupName.trim();
    }

    if (newGroupPhoto !== currentGroupPhotoURL) {
      if (newGroupPhoto) {
        const uploadedURL = await uploadImageToFirebase(newGroupPhoto, `group_photos`);
        if (uploadedURL) {
          updates.photoURL = uploadedURL;
        } else {
          Alert.alert("Save Failed", "Could not upload new group photo. Please try again.");
          return;
        }
      } else {
        updates.photoURL = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      Alert.alert("No Changes", "No changes were made to save.");
      return;
    }

    try {
      await updateDoc(doc(db, 'groups', groupId), updates);
      Alert.alert("Success", "Group information updated!");
      setIsEditingGroupName(false);
      setHasChanges(false);
    } catch (error) {
      console.error("Jey: Error saving group changes:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    }
  };

  // Jey: Function to remove the pinned notice (Admin Only)
  const handleRemovePinnedNotice = async () => {
    if (!isGroupAdmin || !pinnedNotice?.id) {
      Alert.alert("Permission Denied", "Only the group admin can unpin notices.");
      return;
    }

    Alert.alert(
      "Unpin Notice",
      "Are you sure you want to unpin this notice for everyone?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unpin",
          onPress: async () => {
            try {
              // Jey: This deletes the notice document from the DSP's notices.
              // If notices can be pinned to multiple groups, a more complex "unpin" mechanism is needed.
              // For now, assuming unpin means deleting from the DSP-wide notices.
              // If you have a separate 'pinnedNoticeId' field on the group, you'd just set that to null.
              await deleteDoc(doc(db, 'notices_by_dsp', userData.dspName, 'items', pinnedNotice.id));
              Alert.alert("Success", "Notice has been unpinned.");
              setPinnedNotice(null); // Optimistically remove from UI
            } catch (error) {
              console.error("Jey: Error unpinning notice:", error);
              Alert.alert("Error", "Failed to unpin notice. Please try again.");
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };


  const toggleNewMemberSelection = (user) => {
    setSelectedNewMembers(prevSelected => {
      if (prevSelected.some(u => u.id === user.id)) {
        return prevSelected.filter(u => u.id !== user.id);
      } else {
        return [...prevSelected, user];
      }
    });
  };

  const handleAddSelectedMembers = async () => {
    if (selectedNewMembers.length === 0) {
      Alert.alert("No Members Selected", "Please select members to add.");
      return;
    }

    try {
      const newMemberUids = selectedNewMembers.map(m => m.id);
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(...newMemberUids),
      });
      Alert.alert("Success", "New members added to the group!");
      setSelectedNewMembers([]);
      setSearchNewMemberQuery('');
      setShowAddMembersSection(false);
    } catch (error) {
      console.error("Jey: Error adding new members:", error);
      Alert.alert("Error", "Failed to add new members.");
    }
  };

  const filteredUsersForSelection = allUsersForSelection.filter(user =>
    user.name.toLowerCase().includes(searchNewMemberQuery.toLowerCase())
  );

  // Jey: Render individual chat message item
  const renderMessageItem = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.sender === userData.email ? styles.myMessage : styles.otherMessage
    ]}>
      {item.sender !== userData.email && (
        <Text style={styles.senderName}>{item.senderName}</Text>
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

  // Jey: Render group member item for the admin modal
  const renderGroupMemberItem = ({ item }) => (
    <View style={styles.memberListItem}>
      {item.profilePictureUrl ? (
        <Image source={{ uri: item.profilePictureUrl }} style={styles.memberPhoto} />
      ) : (
        <View style={styles.memberPhotoPlaceholder}>
          <Ionicons name="person" size={20} color="#fff" />
        </View>
      )}
      <Text style={styles.memberName}>{item.name}</Text>
      {item.id === groupAdmin && (
        <MaterialIcons name="admin-panel-settings" size={20} color="gold" style={styles.adminIcon} />
      )}
    </View>
  );

  // Jey: Render user for selection in the "Add Members" section
  const renderUserForSelectionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberSelectionItem}
      onPress={() => toggleNewMemberSelection(item)}
    >
      {item.profilePictureUrl ? (
        <Image source={{ uri: item.profilePictureUrl }} style={styles.memberPhoto} />
      ) : (
        <View style={styles.memberPhotoPlaceholder}>
          <Ionicons name="person" size={20} color="#fff" />
        </View>
      )}
      <Text style={styles.memberName}>{item.name}</Text>
      {selectedNewMembers.some(u => u.id === item.id) ? (
        <Ionicons name="checkbox-outline" size={24} color="#007070" />
      ) : (
        <Ionicons name="square-outline" size={24} color="#888" />
      )}
    </TouchableOpacity>
  );


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Jey: Custom Header Implementation */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerCenter}
            onPress={() => setIsGroupAdminModalVisible(true)}
          >
            <Text style={styles.groupNameHeader} numberOfLines={1}>
              {currentGroupName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerRight}
            onPress={() => setIsGroupAdminModalVisible(true)}
          >
            {currentGroupPhotoURL ? (
              <Image source={{ uri: currentGroupPhotoURL }} style={styles.groupPhoto} />
            ) : (
              <View style={styles.groupPhotoPlaceholder}>
                <Ionicons name="people" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Jey: Pinned Notice Section */}
      {pinnedNotice && (
        <View style={styles.pinnedNoticeContainer}>
          <MaterialIcons name="push-pin" size={18} color="#FF5733" style={styles.pinnedNoticeIcon} />
          <View style={styles.pinnedNoticeContent}>
            <Text style={styles.pinnedNoticeTitle}>{pinnedNotice.title}</Text>
            <Text style={styles.pinnedNoticeMessage} numberOfLines={1}>
              {pinnedNotice.message}
            </Text>
          </View>
          {isGroupAdmin && (
            <TouchableOpacity onPress={handleRemovePinnedNotice} style={styles.pinnedNoticeDismissButton}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      )}


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

      {/* Jey: Image Viewer Modal */}
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

      {/* Jey: Group Admin Modal */}
      <Modal
        visible={isGroupAdminModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setIsGroupAdminModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.adminModalCenteredView}
        >
          <View style={styles.adminModalView}>
            <TouchableOpacity style={styles.adminModalCloseButton} onPress={() => {
              setIsGroupAdminModalVisible(false);
            }}>
              <Ionicons name="close-circle-outline" size={30} color="#888" />
            </TouchableOpacity>

            {isGroupInfoLoading ? (
              <ActivityIndicator size="large" color="#6BB9F0" style={{ marginTop: 50 }} />
            ) : (
              <ScrollView contentContainerStyle={styles.adminModalScrollViewContent}>
                <Text style={styles.adminModalTitle}>Group Information</Text>

                {/* Group Photo */}
                <TouchableOpacity
                  style={styles.groupPhotoContainer}
                  onPress={isGroupAdmin ? pickGroupPhoto : null}
                  disabled={!isGroupAdmin || isUploadingGroupPhoto}
                >
                  {isUploadingGroupPhoto ? (
                    <ActivityIndicator size="large" color="#6BB9F0" />
                  ) : newGroupPhoto ? (
                    <Image source={{ uri: newGroupPhoto }} style={styles.groupProfilePhoto} />
                  ) : (
                    <View style={styles.groupProfilePhotoPlaceholder}>
                      <Ionicons name="people" size={60} color="#fff" />
                    </View>
                  )}
                  {isGroupAdmin && (
                    <View style={styles.editPhotoIcon}>
                      <Ionicons name="camera" size={24} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Group Name */}
                <View style={styles.groupNameEditContainer}>
                  {isEditingGroupName && isGroupAdmin ? (
                    <TextInput
                      style={styles.editGroupNameInput}
                      value={newGroupName}
                      onChangeText={setNewGroupName}
                      maxLength={50}
                      autoFocus
                    />
                  ) : (
                    <Text style={styles.groupNameDisplay}>{newGroupName}</Text>
                  )}
                  {isGroupAdmin && (
                    <TouchableOpacity
                      onPress={() => isEditingGroupName ? setIsEditingGroupName(false) : setIsEditingGroupName(true)}
                      style={styles.editGroupNameButton}
                    >
                      <MaterialIcons name={isEditingGroupName ? "close" : "edit"} size={24} color="#6BB9F0" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Members Section */}
                <Text style={styles.sectionTitle}>Members ({groupMembers.length})</Text>
                <FlatList
                  data={groupMembers}
                  keyExtractor={(item) => item.id}
                  renderItem={renderGroupMemberItem}
                  scrollEnabled={false}
                  ListEmptyComponent={<Text style={styles.emptyListText}>No members in this group.</Text>}
                  contentContainerStyle={{ paddingBottom: 10 }}
                />

                {/* Add Members Button (Admin Only) */}
                {isGroupAdmin && (
                  <TouchableOpacity
                    style={styles.addMembersButton}
                    onPress={() => setShowAddMembersSection(!showAddMembersSection)}
                  >
                    <Ionicons name={showAddMembersSection ? "remove-circle-outline" : "add-circle-outline"} size={24} color="#fff" />
                    <Text style={styles.addMembersButtonText}>
                      {showAddMembersSection ? "Hide Add Members" : "Add New Members"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Add Members Section (Admin Only, Collapsible) */}
                {isGroupAdmin && showAddMembersSection && (
                  <View style={styles.addMembersSection}>
                    <TextInput
                      style={styles.searchNewMemberInput}
                      placeholder="Search users..."
                      value={searchNewMemberQuery}
                      onChangeText={setSearchNewMemberQuery}
                    />
                    {loadingUsersForSelection ? (
                      <ActivityIndicator size="small" color="#6BB9F0" style={{ marginTop: 10 }} />
                    ) : (
                      <FlatList
                        data={filteredUsersForSelection}
                        keyExtractor={(item) => item.id}
                        renderItem={renderUserForSelectionItem}
                        scrollEnabled={true}
                        style={styles.userSelectionList}
                        ListEmptyComponent={<Text style={styles.emptyListText}>No users found or all users already in group.</Text>}
                      />
                    )}
                    {selectedNewMembers.length > 0 && (
                      <View style={styles.selectedNewMembersPillsContainer}>
                        {selectedNewMembers.map(member => (
                          <View key={member.id} style={styles.selectedNewMemberPill}>
                            <Text style={styles.selectedNewMemberText}>{member.name}</Text>
                            <TouchableOpacity onPress={() => toggleNewMemberSelection(member)}>
                              <Ionicons name="close-circle" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.confirmAddMembersButton}
                      onPress={handleAddSelectedMembers}
                      disabled={selectedNewMembers.length === 0}
                    >
                      <Text style={styles.confirmAddMembersButtonText}>
                        Add Selected ({selectedNewMembers.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Jey: Save Changes Button (Admin Only, visible when changes made and not uploading) */}
                {isGroupAdmin && hasChanges && !isUploadingGroupPhoto && (
                  <TouchableOpacity
                    style={styles.saveChangesButton}
                    onPress={handleSaveChanges}
                    disabled={isUploadingGroupPhoto}
                  >
                    <Text style={styles.saveChangesButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                )}

              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
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
  groupNameHeader: {
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
  groupPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ececec',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    resizeMode: 'cover',
  },
  groupPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007070',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Jey: Pinned Notice Styles
  pinnedNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBE6', // Light yellow background
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFD700', // Gold-ish border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinnedNoticeIcon: {
    marginRight: 10,
  },
  pinnedNoticeContent: {
    flex: 1,
  },
  pinnedNoticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  pinnedNoticeMessage: {
    fontSize: 12,
    color: '#666',
  },
  pinnedNoticeDismissButton: {
    marginLeft: 10,
    padding: 5,
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

  adminModalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  adminModalView: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  adminModalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  adminModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  adminModalScrollViewContent: {
    paddingBottom: 20,
  },
  groupPhotoContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ececec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    position: 'relative',
  },
  groupProfilePhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  groupProfilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#007070',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 5,
  },
  groupNameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  groupNameDisplay: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginRight: 10,
  },
  editGroupNameInput: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginRight: 10,
  },
  editGroupNameButton: {
    padding: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  memberPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ececec',
  },
  memberPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  adminIcon: {
    marginLeft: 5,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#888',
    paddingVertical: 15,
  },
  addMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6BB9F0',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  addMembersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  addMembersSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  searchNewMemberInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  userSelectionList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  memberSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  selectedNewMembersPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 10,
  },
  selectedNewMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9AA2',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 5,
    marginBottom: 5,
  },
  selectedNewMemberText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 5,
  },
  confirmAddMembersButton: {
    backgroundColor: '#007070',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmAddMembersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveChangesButton: {
    backgroundColor: '#007070',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  saveChangesButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GroupConversation;