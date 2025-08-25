import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, 
  TouchableOpacity, ActivityIndicator, Alert, 
  TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  collection, query, where, getDocs, getFirestore,
  onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc, setDoc
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Define your new color palette
const Colors = {
  primaryTeal: '#007070', // Slightly darker teal
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
};

const GroupChat = ({ navigation }) => {
  const { userData, currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});

  // Effect to fetch user's groups from Firestore AND their individual unread counts
  useEffect(() => {
    if (!currentUser?.uid || !userData?.email) {
      setLoadingGroups(false);
      return;
    }

    const db = getFirestore();
    const groupsRef = collection(db, 'groups');

    const q = query(groupsRef, where('members', 'array-contains', currentUser.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedGroups = [];
      const newGroupUnreadCounts = {};

      const groupPromises = snapshot.docs.map(async (groupDoc) => {
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;
        fetchedGroups.push({ id: groupId, ...groupData });

        const lastMessageTimestamp = groupData.lastMessage?.createdAt?.toDate();
        let unreadCount = 0;

        if (lastMessageTimestamp) {
          const userChatDocRef = doc(db, 'userChats', currentUser.uid, 'chats', groupId);
          const userChatSnap = await getDoc(userChatDocRef);

          let lastReadTimestamp = null;
          if (userChatSnap.exists()) {
            lastReadTimestamp = userChatSnap.data().lastReadMessageTimestamp?.toDate();
          }

          if ((!lastReadTimestamp || lastMessageTimestamp > lastReadTimestamp) && groupData.lastMessage.sender !== userData.email) {
            unreadCount = 1;
          }
        }
        newGroupUnreadCounts[groupId] = unreadCount;
      });

      await Promise.all(groupPromises);
      setGroups(fetchedGroups);
      setGroupUnreadCounts(newGroupUnreadCounts);
      setLoadingGroups(false);
    }, (error) => {
      console.error("Jey: Error fetching groups or unread counts:", error);
      setLoadingGroups(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, userData?.email]);

  // Jey: Updated effect to fetch only users related to the current DSP
  useEffect(() => {
    if (!isModalVisible || !userData?.dspName) return;

    const fetchAllUsers = async () => {
      setLoadingUsers(true);
      try {
        const db = getFirestore();
        const usersRef = collection(db, 'users');
        
        // Jey: Filter users by dspName
        const q = query(
          usersRef,
          where('dspName', '==', userData.dspName),
          where('role', 'in', ['driver', 'trainer']) // Fetch only drivers and trainers
        );
        
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          // Jey: Still filter out the current user, who is a DSP admin
          .filter(user => user.id !== currentUser.uid);

        setAllUsers(users);
      } catch (error) {
        console.error("Jey: Error fetching users:", error);
        Alert.alert("Error", "Failed to load users for selection.");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAllUsers();
  }, [isModalVisible, currentUser?.uid, userData?.dspName]); // Jey: Added userData.dspName to dependency array

  // Function to handle picking an image for the group photo
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
            if (status !== 'granted') { Alert.alert('Permission required', 'Please grant media library permissions to select a photo.'); return; }
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, });
            if (!result.canceled) { setGroupPhoto(result.assets[0].uri); }
          }
        },
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission required', 'Please grant camera permissions to take a photo.'); return; }
            let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, });
            if (!result.canceled) { setGroupPhoto(result.assets[0].uri); }
          }
        },
      ],
      { cancelable: true }
    );
  };

  // Function to upload the selected image to Firebase Storage
  const uploadImage = async (uri) => {
    setIsUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storage = getStorage();
      const storageRef = ref(storage, `group_photos/${currentUser.uid}_${Date.now()}.jpg`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Jey: Image uploaded to:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Jey: Error uploading image:", error);
      Alert.alert("Upload Failed", "Could not upload group photo. Please try again.");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Function to add or remove a member from the selected list
  const toggleMemberSelection = (member) => {
    setSelectedMembers(prevSelected => {
      if (prevSelected.some(m => m.id === member.id)) {
        return prevSelected.filter(m => m.id !== member.id);
      } else {
        return [...prevSelected, member];
      }
    });
  };

  // Filter users based on search query
  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Function to handle the creation of a new group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name cannot be empty.");
      return;
    }
    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Please add at least one member to the group (excluding yourself).");
      return;
    }

    setIsCreatingGroup(true);
    let photoURL = null;
    if (groupPhoto) {
      photoURL = await uploadImage(groupPhoto);
      if (!photoURL) {
        setIsCreatingGroup(false);
        return;
      }
    }

    try {
      const db = getFirestore();
      const groupsRef = collection(db, 'groups');

      const allMembersUids = [currentUser.uid, ...selectedMembers.map(m => m.id)];
      const allMembersEmails = [userData.email, ...selectedMembers.map(m => m.email)]; // Jey: Also collect emails for 'participants' field

      const newGroupRef = await addDoc(groupsRef, {
        name: groupName.trim(),
        photoURL: photoURL,
        members: allMembersUids,
        participants: allMembersEmails,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        isGroup: true,
        lastMessage: {
          text: 'Group created!',
          sender: currentUser.email,
          createdAt: serverTimestamp(),
        }
      });

      const userChatDocRef = doc(db, 'userChats', currentUser.uid, 'chats', newGroupRef.id);
      await setDoc(userChatDocRef, {
        lastReadMessageTimestamp: serverTimestamp(),
      }, { merge: true });


      Alert.alert("Success", `Group "${groupName}" created!`);
      setGroupName('');
      setGroupPhoto(null);
      setSelectedMembers([]);
      setSearchQuery('');
      setIsModalVisible(false);
    } catch (error) {
      console.error("Jey: Error creating group:", error);
      Alert.alert("Error", "Failed to create group. Please try again.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Function to render each group item in the FlatList
  const renderGroupItem = ({ item }) => {
    const unreadCount = groupUnreadCounts[item.id] || 0;

    return (
      <TouchableOpacity
        style={styles.groupItem}
        onPress={() => navigation.navigate('GroupConversation', { groupId: item.id, groupName: item.name, groupPhotoURL: item.photoURL })}
      >
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.groupImage} />
        ) : (
          <View style={styles.groupImagePlaceholder}>
            <Ionicons name="people-outline" size={24} color={Colors.white} />
          </View>
        )}
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          {item.lastMessage?.text && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.sender === userData.email ? 'You: ' : ''}
              {item.lastMessage.text}
            </Text>
          )}
        </View>
        {unreadCount > 0 ? (
          <View style={styles.groupUnreadBadge}>
            <Text style={styles.groupUnreadBadgeText}>{unreadCount}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Jey: Always visible "Create New Group" button */}
      <TouchableOpacity
        style={styles.createGroupButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="people-outline" size={24} color='white' />
        <Text style={styles.createGroupButtonText}>Create New Group</Text>
      </TouchableOpacity>

      {/* Conditional rendering for loading or empty state (now only for the list itself) */}
      {loadingGroups ? (
        <ActivityIndicator size="large" color={Colors.primaryTeal} style={styles.loadingIndicator} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="people-outline" size={80} color={Colors.mediumText} />
          <Text style={styles.emptyStateText}>No groups found.</Text>
          <Text style={styles.emptyStateSubText}>Your created groups will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.listContentContainer}
        />
      )}

      {/* Create Group Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.centeredView}
        >
          <View style={styles.modalView}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close-circle-outline" size={30} color={Colors.mediumText} />
            </TouchableOpacity>

            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberItem}
                  onPress={() => toggleMemberSelection(item)}
                >
                  {item.profilePictureUrl ? (
                    <Image source={{ uri: item.profilePictureUrl }} style={styles.memberImage} />
                  ) : (
                    <View style={styles.memberImagePlaceholder}>
                      <Ionicons name="person" size={18} color={Colors.white} />
                    </View>
                  )}
                  <Text style={styles.memberName}>{item.name}</Text>
                  {selectedMembers.some(m => m.id === item.id) ? (
                    <Ionicons name="checkbox-outline" size={24} color={Colors.primaryTeal} />
                  ) : (
                    <Ionicons name="square-outline" size={24} color={Colors.mediumText} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                loadingUsers ? null : <Text style={styles.noResultsText}>No users found.</Text>
              )}
              ListHeaderComponent={() => (
                <View>
                  <Text style={styles.modalTitle}>Create New Group</Text>
                  {/* Group Photo Section */}
                  <TouchableOpacity style={styles.photoPicker} onPress={pickImage} disabled={isUploadingImage}>
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color={Colors.primaryTeal} />
                    ) : groupPhoto ? (
                      <Image source={{ uri: groupPhoto }} style={styles.groupPhotoPreview} />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={40} color={Colors.mediumText} />
                        <Text style={styles.photoPickerText}>Add Group Photo</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Group Name Input */}
                  <TextInput
                    style={styles.input}
                    placeholder="Group Name"
                    placeholderTextColor={Colors.mediumText}
                    value={groupName}
                    onChangeText={setGroupName}
                    maxLength={50}
                  />

                  {/* Add Members Section Header & Search Input */}
                  <Text style={styles.sectionTitle}>Add Members ({selectedMembers.length})</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor={Colors.mediumText}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {loadingUsers && <ActivityIndicator size="small" color={Colors.primaryTeal} style={{ marginTop: 20 }} />}
                </View>
              )}
              ListFooterComponent={() => (
                <View>
                  {/* Selected Members Display */}
                  {selectedMembers.length > 0 && (
                    <View style={styles.selectedMembersContainer}>
                      <Text style={styles.selectedMembersTitle}>Selected:</Text>
                      <View style={styles.selectedMembersPills}>
                        {selectedMembers.map(member => (
                          <View key={member.id} style={styles.selectedMemberPill}>
                            <Text style={styles.selectedMemberText}>{member.name}</Text>
                            <TouchableOpacity onPress={() => toggleMemberSelection(member)} style={styles.removeMemberButton}>
                              <Ionicons name="close-circle" size={16} color={Colors.white} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateGroup}
              disabled={isCreatingGroup || isUploadingImage}
            >
              {isCreatingGroup ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.createButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
    padding: 10,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTeal,
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 10,
    marginTop: 10, // Jey: Add some top margin to separate from screen top
    marginBottom: 20, // Jey: Add bottom margin to separate from list/empty state
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    alignSelf: 'center', // Jey: Center the button
    width: '90%', // Jey: Make it span most of the width
  },
  createGroupButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    // Jey: No longer needs the createGroupButton inside, so remove its margin
    // if it was specifically for that.
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 20,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: Colors.mediumText,
    textAlign: 'center',
    marginTop: 10,
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    // Jey: No need for paddingTop here as the button is now above the FlatList
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  groupImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: Colors.lightGray,
  },
  groupImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.darkText,
  },
  lastMessage: {
    fontSize: 13,
    color: Colors.mediumText,
    marginTop: 4,
  },
  groupUnreadBadge: {
    backgroundColor: Colors.accentSalmon,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  groupUnreadBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'space-between',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 20,
    textAlign: 'center',
  },
  photoPicker: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  groupPhotoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPickerText: {
    marginTop: 5,
    fontSize: 14,
    color: Colors.mediumText,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    color: Colors.darkText,
    backgroundColor: Colors.lightBackground,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 10,
    marginTop: 10,
  },
  searchInput: {
    width: '100%',
    height: 45,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: Colors.darkText,
    backgroundColor: Colors.lightBackground,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  memberImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 15,
    backgroundColor: Colors.lightGray,
  },
  memberImagePlaceholder: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    color: Colors.darkText,
    fontWeight: '500',
  },
  noResultsText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: Colors.mediumText,
    fontSize: 15,
  },
  selectedMembersContainer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  selectedMembersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 10,
  },
  selectedMembersPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryTeal,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedMemberText: {
    color: Colors.white,
    fontSize: 14,
    marginRight: 5,
  },
  removeMemberButton: {
    marginLeft: 5,
  },
  createButton: {
    backgroundColor: Colors.accentSalmon,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GroupChat;

