import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Modal, Dimensions, Platform, Animated, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, FieldValue, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// Centralized Color Palette
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

// Get screen dimensions for full-screen image modal
const { width, height } = Dimensions.get('window');

// Define Mood Emojis
const MOOD_EMOJIS = [
  { emoji: '😄', name: 'Happy' },
  { emoji: '👍', name: 'Thumbs Up' },
  { emoji: '💡', name: 'Insightful' },
  { emoji: '🤔', name: 'Thoughtful' },
  { emoji: '💪', name: 'Strong' },
  { emoji: '🎉', name: 'Celebration' },
  { emoji: '😢', name: 'Sad' },
  { emoji: '🔥', name: 'Fire' },
];

const Posts = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [currentPostForModal, setCurrentPostForModal] = useState(null); // Holds the entire post object for modal context
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const commentsListRef = useRef(null); // Ref for FlatList to scroll to bottom

  // Mood Modal States
  const [isMoodPickerVisible, setIsMoodPickerVisible] = useState(false);
  const [currentPostForMood, setCurrentPostForMood] = useState(null);

  // Animation value for the heart icon
  const animatedValue = useRef(new Animated.Value(1)).current;

  // Footer active tab state and logic
  const currentNavigation = useNavigation();
  const [activeTab, setActiveTab] = useState('PostsTab');

  useEffect(() => {
    const currentRouteName = route.name;
    if (currentRouteName === 'Home') {
      setActiveTab('HomeTab');
    } else if (currentRouteName === 'Posts') {
      setActiveTab('PostsTab');
    } else if (currentRouteName === 'AdminTab') {
      setActiveTab('AdminTab');
    } else if (currentRouteName === 'CompanyTab') {
      setActiveTab('CompanyTab');
    } else if (currentRouteName === 'Settings') {
      setActiveTab('SettingsTab');
    }
  }, [route.name]);

  const handleTabPress = (tabName) => {
    if (tabName === activeTab) {
      if (tabName === 'HomeTab') {
        currentNavigation.navigate('Home');
      }
      return;
    }

    setActiveTab(tabName);

    let screenNameToNavigate = '';
    switch (tabName) {
      case 'HomeTab':
        screenNameToNavigate = 'Home';
        break;
      case 'PostsTab':
        screenNameToNavigate = 'Posts';
        break;
      case 'AdminTab':
        screenNameToNavigate = 'AdminTab';
        break;
      case 'CompanyTab':
        screenNameToNavigate = 'CompanyTab';
        break;
      case 'SettingsTab':
        screenNameToNavigate = 'Settings';
        break;
      default:
        screenNameToNavigate = 'Home';
    }

    if (currentNavigation.getParent()) {
      currentNavigation.getParent().navigate(screenNameToNavigate);
    } else {
      console.warn(`Jey: Could not navigate to tab '${screenNameToNavigate}' via parent. Attempting direct navigation within current stack.`);
      navigation.navigate(screenNameToNavigate);
    }
  };


  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => {
        const data = doc.data();
        const likedBy = data.likedBy || [];
        const hasLikedPost = userData?.uid ? likedBy.includes(userData.uid) : false;
        const moodReactions = data.moodReactions || {};
        const currentUserMood = userData?.uid ? moodReactions[userData.uid] : null;

        return {
          id: doc.id,
          ...data,
          hasLiked: hasLikedPost,
          currentUserMood: currentUserMood,
        };
      });
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      console.error("Jey: Error fetching posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  // Effect to fetch comments when the image modal opens for a specific post
  useEffect(() => {
    if (isImageModalVisible && currentPostForModal?.id) {
      const commentsQuery = query(
        collection(db, 'posts', currentPostForModal.id, 'comments'),
        orderBy('createdAt', 'asc') // Order comments by creation time
      );

      const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
        const fetchedComments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() // Convert Firestore Timestamp to Date object
        }));
        setComments(fetchedComments);
        // Scroll to the bottom of the comments list when new comments arrive
        setTimeout(() => {
          commentsListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, (error) => {
        console.error("Jey: Error fetching comments:", error);
      });

      return () => unsubscribeComments();
    } else {
      setComments([]); // Clear comments when modal is closed or no post is selected
    }
  }, [isImageModalVisible, currentPostForModal?.id]);

  const handleLike = async (postId) => {
    if (!userData?.uid) {
      console.log("Jey: Please log in to like posts!");
      return;
    }

    const postRef = doc(db, 'posts', postId);
    const currentPost = posts.find(p => p.id === postId);

    if (!currentPost) return;

    try {
      if (currentPost.hasLiked) {
        // Unlike the post
        await updateDoc(postRef, {
          likes: Math.max(0, (currentPost.likes || 1) - 1),
          likedBy: arrayRemove(userData.uid)
        });
        Animated.sequence([
          Animated.timing(animatedValue, { toValue: 0.8, duration: 100, useNativeDriver: true }),
          Animated.spring(animatedValue, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();

      } else {
        // Like the post
        await updateDoc(postRef, {
          likes: (currentPost.likes || 0) + 1,
          likedBy: arrayUnion(userData.uid)
        });
        Animated.sequence([
          Animated.timing(animatedValue, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.spring(animatedValue, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
      }
    } catch (error) {
      console.error('Jey: Error liking/unliking post:', error);
      console.log('Jey: Could not update like. Please try again.');
    }
  };

  const handleMoodSelect = async (emoji) => {
    if (!userData?.uid || !currentPostForMood) {
      console.log("Jey: Please log in to react with a mood!");
      return;
    }

    const postRef = doc(db, 'posts', currentPostForMood.id);
    const userUid = userData.uid;

    try {
      let updateData = {};
      const newMoodReactions = { ...currentPostForMood.moodReactions || {} };

      if (newMoodReactions[userUid] === emoji) {
        // If same emoji clicked again, remove reaction
        delete newMoodReactions[userUid];
        updateData[`moodReactions.${userUid}`] = FieldValue.delete();
      } else {
        // Set or update reaction
        newMoodReactions[userUid] = emoji;
        updateData[`moodReactions.${userUid}`] = emoji;
      }

      await updateDoc(postRef, updateData);
      setIsMoodPickerVisible(false); // Close modal after selection
      setCurrentPostForMood(null); // Clear selected post
    } catch (error) {
      console.error('Jey: Error updating mood reaction:', error);
      console.log('Jey: Could not update mood. Please try again.');
    }
  };

  const openImageModal = (imageUri, post) => {
    setSelectedImageUri(imageUri);
    setCurrentPostForModal(post); // Set the entire post object
    setIsImageModalVisible(true);
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
    setSelectedImageUri(null);
    setCurrentPostForModal(null); // Clear the post object
    setNewCommentText(''); // Clear comment input
    setComments([]); // Clear comments state
  };

  const openMoodPicker = (post) => {
    if (!userData?.uid) {
      console.log("Jey: Please log in to react with a mood!");
      return;
    }
    setCurrentPostForMood(post);
    setIsMoodPickerVisible(true);
  };

  const closeMoodPicker = () => {
    setIsMoodPickerVisible(false);
    setCurrentPostForMood(null);
  };

  const handleAddComment = async () => {
    if (!userData?.uid) {
      console.log("Jey: Please log in to add comments!");
      return;
    }
    if (!newCommentText.trim()) {
      console.log("Jey: Comment cannot be empty!");
      return;
    }
    if (!currentPostForModal?.id) {
      console.error("Jey: No post selected for commenting.");
      return;
    }

    try {
      // Add comment to the 'comments' subcollection of the current post
      await addDoc(collection(db, 'posts', currentPostForModal.id, 'comments'), {
        userId: userData.uid,
        userName: userData.name || 'Anonymous',
        userAvatar: userData.profilePictureUrl || null,
        text: newCommentText.trim(),
        createdAt: serverTimestamp(),
      });

      // Increment comments count on the post document
      await updateDoc(doc(db, 'posts', currentPostForModal.id), {
        comments: (currentPostForModal.comments || 0) + 1,
      });

      setNewCommentText(''); // Clear input after sending
      // The onSnapshot listener for comments will automatically update the list
    } catch (error) {
      console.error('Jey: Error adding comment:', error);
      console.log('Jey: Could not add comment. Please try again.');
    }
  };

  const renderCommentItem = ({ item: comment }) => (
    <View style={styles.commentItem}>
      {comment.userAvatar ? (
        <Image source={{ uri: comment.authorAvatarAvatar }} style={styles.commentAvatar} />
      ) : (
        <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={15} color={Colors.white} />
        </View>
      )}
      <View style={styles.commentContent}>
        <Text style={styles.commentUserName}>
          {comment.authorName || 'Anonymous User'} {/* MODIFIED LINE HERE */}
        </Text>
        <Text style={styles.commentText}>{comment.text}</Text>
        <Text style={styles.commentTime}>{comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(comment.createdAt).toLocaleDateString() : 'Just now'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryTeal} />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  if (posts.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="documents-outline" size={80} color={Colors.mediumText} />
        <Text style={styles.emptyText}>No posts yet. Be the first to share an update!</Text>
        <TouchableOpacity
          style={styles.newPostButtonEmpty}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Ionicons name="add" size={30} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.toggleButtonContainer}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('HomeTab')}
          >
            <Ionicons
              name="home-outline"
              size={20}
              color={activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('PostsTab')}
          >
            <Ionicons
              name="newspaper-outline"
              size={20}
              color={activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>

          {userData?.role === 'admin' && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => handleTabPress('AdminTab')}
            >
              <MaterialIcons
                name="admin-panel-settings"
                size={20}
                color={activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray }
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          )}

          {userData?.role === 'company' && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => handleTabPress('CompanyTab')}
            >
              <MaterialIcons
                name="business"
                size={20}
                color={activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray }
                ]}
              >
                Company
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('SettingsTab')}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatarContainer}>
                {item.authorAvatar ? (
                  <Image source={{ uri: item.authorAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={20} color={Colors.white} />
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.userName}>{item.authorName || 'Anonymous'}</Text>
                <Text style={styles.postTime}>{item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just now'}</Text>
              </View>
            </View>

            <Text style={styles.postContent}>{item.content}</Text>

            {item.image && (
              <TouchableOpacity onPress={() => openImageModal(item.image, item)}>
                <Image source={{ uri: item.image }} style={styles.postImage} />
              </TouchableOpacity>
            )}

            <View style={styles.postFooter}>
              <View style={styles.leftAlignedFooterButtons}>
                <TouchableOpacity
                  style={styles.footerButton}
                  onPress={() => handleLike(item.id)}
                >
                  <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
                    <Ionicons
                      name={item.hasLiked ? "heart" : "heart-outline"}
                      size={20}
                      color={item.hasLiked ? Colors.redAccent : Colors.accentSalmon}
                    />
                  </Animated.View>
                  <Text style={styles.footerText}>{item.likes || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.footerButton}
                  onPress={() => navigation.navigate('PostDetails', { post: item })}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.primaryTeal} />
                  <Text style={styles.footerText}>{item.comments || 0}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.footerButton}
                onPress={() => openMoodPicker(item)}
              >
                {item.currentUserMood ? (
                  <Text style={styles.moodEmoji}>{item.currentUserMood}</Text>
                ) : (
                  <Ionicons name="happy-outline" size={20} color={Colors.primaryTeal} />
                )}
                <Text style={styles.footerText}>Mood</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.newPostButton}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Ionicons name="add" size={30} color={Colors.white} />
      </TouchableOpacity>

      {/* Image Modal Component - Updated */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.fullScreenImageModalContainer}
        >
          <TouchableOpacity
            style={styles.modalContentWrapper}
            activeOpacity={1}
            onPress={() => console.log("Jey: Touched modal background but not close button")} // Prevent closing on general touch
          >
            {selectedImageUri && (
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity style={styles.closeModalButton} onPress={closeImageModal}>
              <Ionicons name="close-circle" size={40} color={Colors.white} />
            </TouchableOpacity>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
              {comments.length > 0 ? (
                <FlatList
                  ref={commentsListRef}
                  data={comments}
                  keyExtractor={(item) => item.id}
                  renderItem={renderCommentItem}
                  contentContainerStyle={styles.commentsList}
                />
              ) : (
                <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
              )}

              {/* Comment Input */}
              {userData?.uid ? (
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={Colors.mediumText}
                    value={newCommentText}
                    onChangeText={setNewCommentText}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.sendCommentButton}
                    onPress={handleAddComment}
                  >
                    <Ionicons name="send" size={24} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.loginToCommentText}>Log in to add a comment.</Text>
              )}
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Mood Picker Modal */}
      <Modal
        visible={isMoodPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMoodPicker}
      >
        <TouchableOpacity
          style={styles.moodPickerOverlay}
          activeOpacity={1}
          onPress={closeMoodPicker}
        >
          <View style={styles.moodPickerContainer}>
            <Text style={styles.moodPickerTitle}>Express your mood:</Text>
            <FlatList
              data={MOOD_EMOJIS}
              keyExtractor={(item) => item.emoji}
              numColumns={4}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.moodEmojiButton}
                  onPress={() => handleMoodSelect(item.emoji)}
                >
                  <Text style={styles.moodEmojiLarge}>{item.emoji}</Text>
                  <Text style={styles.moodEmojiName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.moodEmojiList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Footer Navigation Buttons */}
      <View style={styles.toggleButtonContainer}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleTabPress('HomeTab')}
        >
          <Ionicons
            name="home-outline"
            size={20}
            color={activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray}
          />
          <Text
            style={[
              styles.toggleButtonText,
              { color: activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleTabPress('PostsTab')}
        >
          <Ionicons
            name="newspaper-outline"
            size={20}
            color={activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray}
          />
          <Text
            style={[
              styles.toggleButtonText,
              { color: activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          >
            Posts
          </Text>
        </TouchableOpacity>

        {userData?.role === 'admin' && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('AdminTab')}
          >
            <MaterialIcons
              name="admin-panel-settings"
              size={20}
              color={activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Admin
            </Text>
          </TouchableOpacity>
        )}

        {userData?.role === 'company' && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('CompanyTab')}
          >
            <MaterialIcons
              name="business"
              size={20}
              color={activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Company
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleTabPress('SettingsTab')}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray}
          />
          <Text
            style={[
              styles.toggleButtonText,
              { color: activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
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
    backgroundColor: Colors.lightBackground,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.mediumText,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 25,
  },
  newPostButtonEmpty: {
    backgroundColor: Colors.accentSalmon,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  postCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontWeight: 'bold',
    color: Colors.darkText,
    fontSize: 16,
  },
  postTime: {
    fontSize: 13,
    color: Colors.mediumText,
  },
  postContent: {
    marginBottom: 10,
    color: Colors.darkText,
    lineHeight: 22,
    fontSize: 15,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'center',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  footerText: {
    marginLeft: 5,
    color: Colors.mediumText,
    fontSize: 14,
  },
  newPostButton: {
    position: 'absolute',
    bottom: 90,
    right: 30,
    backgroundColor: Colors.accentSalmon,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  fullScreenImageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    flex: 1, // Take full height
    width: '100%',
    justifyContent: 'flex-start', // Align content to the top
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 30, // Adjust for status bar/notch
  },
  fullScreenImage: {
    width: width * 0.9, // Make image a bit smaller to accommodate comments
    height: height * 0.4, // Adjust height
    borderRadius: 8,
    marginBottom: 15, // Space between image and comments
  },
  closeModalButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 10,
    padding: 5,
    zIndex: 1, // Ensure it's above other content
  },
  moodPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodPickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  moodPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 15,
    textAlign: 'center',
  },
  moodEmojiList: {
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  moodEmojiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    width: (width * 0.9 - 40) / 4,
  },
  moodEmojiLarge: {
    fontSize: 40,
    marginBottom: 5,
  },
  moodEmojiName: {
    fontSize: 12,
    color: Colors.mediumText,
    textAlign: 'center',
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 5,
  },
  leftAlignedFooterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 0,
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 0,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  // New Styles for Comments Section in Modal
  commentsSection: {
    flex: 1, // Allow comments section to take remaining space
    width: '100%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 15,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 10,
    textAlign: 'center',
  },
  commentsList: {
    flexGrow: 1, // Allow FlatList to grow
    paddingBottom: 10, // Space for the input field below
  },
  noCommentsText: {
    fontSize: 14,
    color: Colors.mediumText,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align avatar and text to the top
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 5,
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontWeight: 'bold',
    fontSize: 13,
    color: Colors.darkText,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: Colors.darkText,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.inactiveGray,
    marginTop: 3,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0, // Extra padding for iOS keyboard
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginRight: 10,
    fontSize: 15,
    color: Colors.darkText,
    maxHeight: 100, // Prevent input from growing too large
  },
  sendCommentButton: {
    backgroundColor: Colors.primaryTeal,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginToCommentText: {
    fontSize: 14,
    color: Colors.mediumText,
    textAlign: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
  },
});

export default Posts;