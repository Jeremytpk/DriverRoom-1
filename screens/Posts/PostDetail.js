import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'; // Added ActivityIndicator
import { Ionicons } from '@expo/vector-icons';
import { doc, collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore'; // Added orderBy
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext'; // Make sure useAuth is imported

// Centralized Color Palette (copied from your other files for consistency)
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


const PostDetail = ({ route }) => {
  const { post } = route.params; // Initial post data passed via navigation
  const { userData, loading: authLoading } = useAuth(); // FIXED: Import loading from useAuth, renamed to authLoading to avoid confusion
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postData, setPostData] = useState(post);
  const [commentsLoading, setCommentsLoading] = useState(true); // New state for comments loading

  // State to track if the current user has liked this post
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    // Listener for comments
    setCommentsLoading(true); // Start loading comments
    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
    
    const unsubscribeComments = onSnapshot(commentsQuery, (querySnapshot) => {
      const commentsData = [];
      querySnapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() });
      });
      setComments(commentsData);
      setCommentsLoading(false); // Comments loaded
    }, (error) => {
      console.error("Jey: Error fetching comments:", error);
      setCommentsLoading(false); // Stop loading on error
    });

    // Listener for post data (likes, comments count, etc.)
    const postRef = doc(db, 'posts', post.id);
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const fetchedPost = { id: docSnap.id, ...docSnap.data() };
        setPostData(fetchedPost);

        // Check if current user has liked this post
        const likedBy = fetchedPost.likedBy || [];
        if (userData?.uid) {
          setHasLiked(likedBy.includes(userData.uid));
        }
      } else {
        console.warn("Jey: Post not found!");
        // Optionally navigate back or show an error
      }
    });

    // Cleanup listeners on component unmount
    return () => {
      unsubscribeComments();
      unsubscribePost();
    };
  }, [post.id, userData?.uid]); // Add userData.uid to dependencies to re-evaluate hasLiked

  const handleLike = async () => {
    if (!userData?.uid) {
      console.log('Jey: User not authenticated. Cannot like post.');
      return;
    }

    const postDocRef = doc(db, 'posts', post.id);
    try {
      if (hasLiked) {
        // Unlike the post
        await updateDoc(postDocRef, {
          likes: Math.max(0, (postData.likes || 1) - 1), // Ensure it doesn't go below 0
          likedBy: arrayRemove(userData.uid)
        });
      } else {
        // Like the post
        await updateDoc(postDocRef, {
          likes: (postData.likes || 0) + 1,
          likedBy: arrayUnion(userData.uid)
        });
      }
    } catch (error) {
      console.error('Jey: Error liking/unliking post:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !userData?.uid) {
      console.log('Jey: Comment is empty or user not authenticated.');
      return;
    }
    
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        text: newComment,
        authorId: userData.uid,
        author: userData.email,
        authorName: userData.name,
        authorAvatar: userData.profilePictureUrl || null,
        createdAt: serverTimestamp(),
      });
      
      await updateDoc(doc(db, 'posts', post.id), {
        comments: (postData.comments || 0) + 1,
      });
      
      setNewComment('');
    } catch (error) {
      console.error('Jey: Error adding comment:', error);
    }
  };

  // Optionally show a full-screen loading for the entire post detail if postData hasn't loaded yet
  if (!postData.authorName && authLoading) { // Check if initial post data from route is insufficient and still loading auth
      return (
          <View style={styles.fullScreenLoadingContainer}>
              <ActivityIndicator size="large" color={Colors.primaryTeal} />
              <Text style={styles.loadingText}>Loading post details...</Text>
          </View>
      );
  }


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              {postData.authorAvatar ? (
                <Image source={{ uri: postData.authorAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={24} color={Colors.white} />
                </View>
              )}
              <View>
                <Text style={styles.authorName}>{postData.authorName || 'Anonymous'}</Text>
                <Text style={styles.postTime}>
                  {postData.createdAt ? new Date(postData.createdAt.toDate()).toLocaleString() : 'Loading...'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.postContent}>{postData.content}</Text>
            
            {postData.image && (
              <Image source={{ uri: postData.image }} style={styles.postImage} />
            )}
            
            <View style={styles.postFooter}>
              <TouchableOpacity style={styles.footerButton} onPress={handleLike}>
                <Ionicons
                  name={hasLiked ? "heart" : "heart-outline"}
                  size={20}
                  color={hasLiked ? Colors.redAccent : Colors.accentSalmon}
                />
                <Text style={styles.footerText}>{postData.likes || 0}</Text>
              </TouchableOpacity>
              
              <View style={styles.footerButton}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.primaryTeal} />
                <Text style={styles.footerText}>{postData.comments || 0}</Text>
              </View>
            </View>
            <View style={styles.commentsSectionHeader}>
              <Text style={styles.commentsTitle}>Comments</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.commentContainer}>
            <View style={styles.commentHeader}>
              {item.authorAvatar ? (
                <Image source={{ uri: item.authorAvatar }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={18} color={Colors.white} />
                </View>
              )}
              <View>
                <Text style={styles.commentAuthor}>{item.authorName || 'Anonymous'}</Text>
                <Text style={styles.commentTime}>
                    {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleString() : 'Loading...'}
                </Text>
              </View>
            </View>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.commentsList}
        // FIXED: Use commentsLoading instead of undeclared 'loading'
        ListEmptyComponent={commentsLoading ? (
            <View style={styles.loadingCommentsContainer}>
                <ActivityIndicator size="small" color={Colors.primaryTeal} />
                <Text style={styles.loadingCommentsText}>Loading comments...</Text>
            </View>
        ) : (
            <View style={styles.noCommentsContainer}>
                <Text style={styles.noCommentsText}>No comments yet. Be the first to reply!</Text>
            </View>
        )}
      />
      
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          placeholderTextColor={Colors.mediumText}
          value={newComment}
          onChangeText={setNewComment}
          multiline={true}
          maxHeight={100}
        />
        <TouchableOpacity onPress={handleAddComment} disabled={!newComment.trim()}>
          <Ionicons
            name="send"
            size={24}
            color={newComment.trim() ? Colors.accentSalmon : Colors.lightGray}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
  },
  fullScreenLoadingContainer: { // NEW: For initial full post loading
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
  },
  loadingText: { // Reused from Posts.js loading state
    marginTop: 10,
    fontSize: 16,
    color: Colors.mediumText,
  },
  postContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontWeight: 'bold',
    color: Colors.darkText,
    fontSize: 16,
  },
  postTime: {
    fontSize: 12,
    color: Colors.mediumText,
  },
  postContent: {
    fontSize: 16,
    color: Colors.darkText,
    marginBottom: 10,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  },
  commentsSectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.lightBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  commentsList: {
    paddingBottom: 20,
  },
  commentContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: Colors.darkText,
    fontSize: 14,
  },
  commentText: {
    fontSize: 14,
    color: Colors.darkText,
    marginLeft: 40,
    marginBottom: 5,
  },
  commentTime: {
    fontSize: 10,
    color: Colors.mediumText,
    marginLeft: 10,
  },
  commentInputContainer: {
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: Colors.lightBackground,
    color: Colors.darkText,
  },
  noCommentsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noCommentsText: {
    fontSize: 16,
    color: Colors.mediumText,
    textAlign: 'center',
  },
  loadingCommentsContainer: { // NEW: For loading comments specifically
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default PostDetail;