import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
  redAccent: '#dc3545',
};

const ManagePosts = () => {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyPosts = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      if (!userData || !userData.uid) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const postsRef = collection(db, 'posts');
      
      const q = query(postsRef, where('authorId', '==', userData.uid));
      
      const querySnapshot = await getDocs(q);
      
      const fetchedPosts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      const sortedPosts = fetchedPosts.sort((a, b) => b.createdAt - a.createdAt);

      setPosts(sortedPosts);

    } catch (error) {
      console.error("Jey: Error fetching my posts:", error);
      Alert.alert("Error", "Failed to load your posts. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, [userData?.uid]);

  const handleDeletePost = (postId) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', postId));
              await fetchMyPosts(); 
              Alert.alert("Success", "Post deleted successfully.");
            } catch (error) {
              console.error("Jey: Error deleting post:", error);
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
          style: "destructive"
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postCardHeader}>
        <View style={styles.postTimeAndStatus}>
          <Ionicons 
            name={item.status === 'approved' ? "checkmark-circle" : "hourglass-outline"} 
            size={18} 
            color={item.status === 'approved' ? 'green' : Colors.mediumText} 
          />
          <Text style={styles.postTime}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No date'}
            {' '}{item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
          <Ionicons name="trash-outline" size={24} color={Colors.redAccent} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.postContent}>{item.content}</Text>
      
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} />
      )}
      
      <View style={styles.postStats}>
        <Ionicons name="heart" size={16} color={Colors.accentSalmon} />
        <Text style={styles.likesText}>{item.likes || 0} Likes</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.primaryTeal} />
        <Text style={styles.loadingText}>Loading your posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color={Colors.mediumText} />
          <Text style={styles.emptyText}>You haven't created any posts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={fetchMyPosts}
        />
      )}
      
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('Posts')}
      >
        <Text style={styles.floatingButtonText}>All Posts</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
    padding: 20,
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
    marginTop: 15,
    fontSize: 18,
    color: Colors.mediumText,
    textAlign: 'center',
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
  postCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postTimeAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postTime: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
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
    resizeMode: 'cover',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  likesText: {
    marginLeft: 5,
    fontSize: 14,
    color: Colors.mediumText,
    fontWeight: '500',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primaryTeal,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ManagePosts;