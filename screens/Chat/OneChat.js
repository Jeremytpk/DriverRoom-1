import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs, addDoc, getFirestore, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Swipeable } from 'react-native-gesture-handler';
import { RectButton } from 'react-native-gesture-handler';

// Define your color palette (consistent with HomeScreen)
const Colors = {
  primaryTeal: '#008080',
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  borderColor: '#ddd',
  dangerRed: '#DC3545',
};

// StartNewOneChatModal component moved inside OneChat.js for direct integration
const StartNewOneChatModal = ({ visible, onClose, navigation, currentUserEmail, currentUserName, currentUserDspName }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    // Fetch all users when the modal becomes visible
    if (visible && allUsers.length === 0) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const usersCollectionRef = collection(db, 'users');
          // Fetch only activated users and those with the same dspName
          const q = query(
            usersCollectionRef,
            where('activated', '==', true),
            where('dspName', '==', currentUserDspName) // Filter by the current user's DSP
          );
          const querySnapshot = await getDocs(q);
          let usersData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Client-side filtering to exclude the current user
          usersData = usersData.filter(user => user.email !== currentUserEmail);

          setAllUsers(usersData);
          setFilteredUsers(usersData); // Initially show all users
        } catch (error) {
          console.error("Jey: Error fetching users for new chat:", error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    } else if (!visible) {
      // Reset state when modal closes
      setSearchQuery('');
      setFilteredUsers(allUsers); // Reset filtered users to all users for next open
    }
  }, [visible, currentUserEmail, currentUserDspName, allUsers.length]); // Added currentUserDspName to the dependency array

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = allUsers.filter(user =>
        user.name?.toLowerCase().includes(lowerCaseQuery) ||
        user.dspName?.toLowerCase().includes(lowerCaseQuery) ||
        user.email?.toLowerCase().includes(lowerCaseQuery)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);

  const startOneToOneChat = async (selectedUser) => {
    if (!currentUserEmail || !selectedUser?.email) {
      console.error("Jey: Current user email or selected user email is missing.");
      return;
    }

    const participants = [currentUserEmail, selectedUser.email].sort(); // Ensure consistent order
    const participantNames = {
      [currentUserEmail]: currentUserName,
      [selectedUser.email]: selectedUser.name,
    };

    try {
      const chatsCollectionRef = collection(db, 'chats');

      // Check if a chat already exists between these two participants
      const existingChatQuery = query(
        chatsCollectionRef,
        where('participants', '==', participants) // Query for exact participant array
      );
      const existingChatSnapshot = await getDocs(existingChatQuery);

      let chatId;
      if (!existingChatSnapshot.empty) {
        // Chat already exists, navigate to it
        chatId = existingChatSnapshot.docs[0].id;
        console.log("Jey: Existing chat found:", chatId);
      } else {
        // No existing chat, create a new one
        const newChatRef = await addDoc(chatsCollectionRef, {
          participants: participants,
          participantNames: participantNames, // Store names for easier display
          createdAt: new Date(),
          lastMessage: null, // Initialize without a last message
        });
        chatId = newChatRef.id;
        console.log("Jey: New chat created:", chatId);
      }

      onClose(); // Close the modal
      navigation.navigate('OneConversation', {
        chatId: chatId,
        otherParticipantEmail: selectedUser.email,
        userName: selectedUser.name, // Pass the selected user's name for conversation header
      });

    } catch (error) {
      console.error("Jey: Error starting one-to-one chat:", error);
      Alert.alert("Error", "Failed to start chat. Please try again."); // User-friendly error
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => startOneToOneChat(item)}>
      <View style={styles.userAvatar}>
        <Ionicons name="person" size={24} color={Colors.white} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || item.email}</Text>
        {item.dspName && <Text style={styles.userDsp}>DSP: {item.dspName}</Text>}
      </View>
      <Ionicons name="chatbubbles-outline" size={20} color={Colors.primaryTeal} />
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Start New Chat</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={Colors.darkText} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or DSP"
            placeholderTextColor={Colors.mediumText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loadingUsers ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={Colors.primaryTeal} />
              <Text style={styles.modalLoadingText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyResultsContainer}>
              <Ionicons name="sad-outline" size={50} color={Colors.mediumText} />
              <Text style={styles.emptyResultsText}>No users found.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              style={styles.userList}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};


const OneChat = ({ navigation }) => {
  const { userData } = useAuth();

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);

  useEffect(() => {
    if (!userData?.activated || !userData?.email) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userData.email)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chatsData = [];
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        const otherParticipantEmail = chatData.participants.find(
          p => p !== userData.email
        );
        chatsData.push({
          id: doc.id,
          otherParticipantEmail: otherParticipantEmail,
          otherParticipantName: chatData.participantNames?.[otherParticipantEmail] || otherParticipantEmail,
          lastMessage: chatData.lastMessage,
        });
      });
      chatsData.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt?.toDate()?.getTime() || 0;
        const timeB = b.lastMessage?.createdAt?.toDate()?.getTime() || 0;
        return timeB - timeA;
      });
      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      console.error("Jey: Error fetching one-to-one chats:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load chats. Please try again.");
    });

    return () => unsubscribe();
  }, [userData]);

  const deleteChat = async (chatId) => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'chats', chatId));
              console.log("Jey: Chat deleted successfully:", chatId);
            } catch (error) {
              console.error("Jey: Error deleting chat:", error);
              Alert.alert("Error", "Failed to delete chat. Please try again.");
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  const renderRightActions = (progress, dragX, chatId) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <RectButton style={styles.deleteButton} onPress={() => deleteChat(chatId)}>
        <View style={styles.deleteButtonContent}>
          <Ionicons name="trash-outline" size={24} color={Colors.white} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </View>
      </RectButton>
    );
  };

  if (!userData?.activated) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Your account needs to be activated to access chats</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryTeal} />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={50} color={Colors.primaryTeal} />
          <Text style={styles.emptyText}>No direct messages yet</Text>
          <Text style={styles.emptySubtext}>Start a new chat with a teammate</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
              overshootRight={false} // Prevents the swipe from going too far
            >
              <TouchableOpacity
                style={styles.chatItem}
                onPress={() => navigation.navigate('OneConversation', {
                  chatId: item.id,
                  otherParticipantEmail: item.otherParticipantEmail,
                  userName: item.otherParticipantName,
                })}
              >
                <View style={styles.chatAvatar}>
                  <Ionicons name="person" size={24} color={Colors.white} />
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{item.otherParticipantName}</Text>
                  <Text style={styles.lastMessage}>
                    {item.lastMessage?.text || 'No messages yet'}
                  </Text>
                </View>
                <View style={styles.chatMeta}>
                  <Text style={styles.messageTime}>
                    {item.lastMessage?.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setNewChatModalVisible(true)}
      >
        <Ionicons name="add" size={30} color={Colors.white} />
      </TouchableOpacity>

      <StartNewOneChatModal
        visible={newChatModalVisible}
        onClose={() => setNewChatModalVisible(false)}
        navigation={navigation}
        currentUserEmail={userData?.email}
        currentUserId={userData?.id}
        currentUserName={userData?.name}
        currentUserDspName={userData?.dspName} // <-- ADDED THIS PROP
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.mediumText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.primaryTeal,
    marginTop: 10,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.mediumText,
    marginTop: 5,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.mediumText,
    textAlign: 'center',
    marginTop: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    // Removed borderBottomWidth and borderBottomColor from here, as Swipeable creates its own background
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.accentSalmon,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.mediumText,
    marginTop: 3,
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  messageTime: {
    fontSize: 12,
    color: Colors.mediumText,
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: Colors.primaryTeal,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  // --- Swipeable Delete Button Styles ---
  deleteButton: {
    backgroundColor: Colors.dangerRed,
    justifyContent: 'center',
    alignItems: 'flex-end', // Align button content to the right edge
    flex: 1,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 8, // Match the margin of chatItem
    paddingRight: 15, // Add some padding on the right
  },
  deleteButtonContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80, // Fixed width for the button area
  },
  deleteButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginTop: 5,
    fontSize: 12,
  },
  // --- StartNewOneChatModal Styles (merged) ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.lightBackground,
    width: '100%',
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  searchInput: {
    height: 50,
    borderColor: Colors.borderColor,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: Colors.darkText,
    backgroundColor: Colors.white,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.mediumText,
  },
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 16,
    color: Colors.mediumText,
    marginTop: 10,
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  userDsp: {
    fontSize: 13,
    color: Colors.mediumText,
    marginTop: 2,
  },
});

export default OneChat;