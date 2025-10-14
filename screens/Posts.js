import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getFirestore 
} from 'firebase/firestore';

const Colors = {
  primaryTeal: '#2E8B57',
  accentSalmon: '#FF6B6B',
  lightBackground: '#F8FAFB',
  white: '#FFFFFF',
  darkText: '#2C3E50',
  mediumText: '#5A6C7D',
  lightGray: '#F0F2F5',
  border: '#E8EAED',
  inactiveGray: '#9AA0A6',
  cardBackground: '#FFFFFF',
};

const Posts = () => {
  const { userData } = useAuth();
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const db = getFirestore();

  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => {
        const data = doc.data();
        const likedBy = data.likedBy || [];
        const hasLikedPost = userData?.uid ? likedBy.includes(userData.uid) : false;
        
        return {
          id: doc.id,
          ...data,
          hasLikedPost,
          likesCount: likedBy.length
        };
      });
      
      setPosts(fetchedPosts);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  const handleLikePost = async (postId, hasLiked) => {
    if (!userData?.uid) return;

    try {
      const postRef = doc(db, 'posts', postId);
      
      if (hasLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(userData.uid)
        });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(userData.uid)
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener will automatically refresh the data
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.authorName || 'Unknown'}</Text>
          <Text style={styles.postDate}>
            {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.postContent}>{item.content}</Text>
      
      <View style={styles.postFooter}>
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => handleLikePost(item.id, item.hasLikedPost)}
        >
          <Ionicons 
            name={item.hasLikedPost ? 'heart' : 'heart-outline'} 
            size={20} 
            color={item.hasLikedPost ? Colors.accentSalmon : Colors.inactiveGray} 
          />
          <Text style={[
            styles.likeText, 
            item.hasLikedPost && { color: Colors.accentSalmon }
          ]}>
            {item.likesCount || 0}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.commentButton}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.inactiveGray} />
          <Text style={styles.commentText}>Comment</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryTeal} />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Posts</Text>
        {userData?.allowPosts && (
          <TouchableOpacity 
            style={styles.createPostButton}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color={Colors.inactiveGray} />
          <Text style={styles.emptyText}>No posts available</Text>
          {userData?.allowPosts && (
            <TouchableOpacity 
              style={styles.createFirstPostButton}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Text style={styles.createFirstPostText}>Create the first post</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primaryTeal]}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  createPostButton: {
    backgroundColor: Colors.primaryTeal,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: Colors.mediumText,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  createFirstPostButton: {
    backgroundColor: Colors.primaryTeal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createFirstPostText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 10,
  },
  postCard: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  postDate: {
    fontSize: 12,
    color: Colors.mediumText,
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: Colors.darkText,
    lineHeight: 22,
    marginBottom: 15,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  likeText: {
    marginLeft: 5,
    fontSize: 14,
    color: Colors.mediumText,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentText: {
    marginLeft: 5,
    fontSize: 14,
    color: Colors.mediumText,
  },
});

export default Posts;