import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore'; 
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

const FeedBack = () => {
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false); // Jey: New state for modal visibility
  const navigation = useNavigation();
  const { userData } = useAuth();

  useEffect(() => {
    const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeedbackList(list);
      setFeedbackLoading(false);
    }, (error) => {
      console.error("Jey: Error fetching feedback:", error);
      setFeedbackLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim() && rating === 0) {
      Alert.alert('Error', 'Please enter your feedback or provide a star rating before submitting.');
      return;
    }

    Alert.alert(
      "Display Your Name?",
      "Would you like to display your name with this feedback?",
      [
        {
          text: "No",
          onPress: () => submitFeedback(false),
          style: "cancel"
        },
        {
          text: "Yes",
          onPress: () => submitFeedback(true),
        }
      ]
    );
  };

  const submitFeedback = async (displayName) => {
    setLoading(true);
    try {
      let displayAsName = "Driver";
      if (userData?.isDsp || userData?.role === 'company') {
        displayAsName = "DSP/Company";
      }

      await addDoc(collection(db, 'feedback'), {
        userId: userData.uid,
        userName: userData.name,
        userRoleTitle: displayAsName,
        feedback: feedbackText,
        rating: rating,
        displayName: displayName,
        displayAs: displayAsName,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Thank you for your feedback! We appreciate your input.');
      setFeedbackText('');
      setRating(0);
      setIsModalVisible(false); // Jey: Hide modal after submission
    } catch (error) {
      console.error('Jey: Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderFeedbackItem = ({ item }) => {
    const nameToDisplay = item.displayName ? `${item.userName} (${item.userRoleTitle})` : item.displayAs;
    return (
      <View style={feedbackStyles.feedbackCard}>
        <View style={feedbackStyles.feedbackHeader}>
          <Text style={feedbackStyles.feedbackName}>{nameToDisplay}</Text>
          <View style={feedbackStyles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={item.rating >= star ? 'star' : 'star-outline'}
                size={16}
                color={item.rating >= star ? '#FFC107' : '#D3D3D3'}
              />
            ))}
          </View>
        </View>
        <Text style={feedbackStyles.feedbackText}>{item.feedback}</Text>
        <Text style={feedbackStyles.feedbackDate}>
          {item.createdAt?.toDate()?.toLocaleDateString()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Feedback</Text>
          <Text style={styles.subtitle}>See what others are saying.</Text>
        </View>

        <View style={feedbackStyles.feedbackListSection}>
          {feedbackLoading ? (
            <ActivityIndicator size="large" color="#6BB9F0" />
          ) : (
            <FlatList
              data={feedbackList}
              keyExtractor={item => item.id}
              renderItem={renderFeedbackItem}
              ListEmptyComponent={() => (
                <Text style={feedbackStyles.emptyText}>No feedback submitted yet.</Text>
              )}
            />
          )}
        </View>

        {/* Jey: Modal for Feedback Submission */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => {
            setIsModalVisible(!isModalVisible);
          }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Send Your Feedback</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingLabel}>Rate your experience:</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons
                          name={rating >= star ? 'star' : 'star-outline'}
                          size={36}
                          color={rating >= star ? '#FFC107' : '#D3D3D3'}
                          style={styles.starIcon}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder="Type your feedback here..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={10}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                />
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmitFeedback}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Jey: Floating button to open the feedback modal */}
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setIsModalVisible(true)}>
          <Ionicons name="pencil-outline" size={24} color="#fff" />
          <Text style={styles.floatingButtonText}>Send Feedback</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F4F7',
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    //
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stars: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 5,
  },
  textInput: {
    minHeight: 120,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#6BB9F0',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#6BB9F0',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

const feedbackStyles = StyleSheet.create({
  feedbackListSection: {
    flex: 1,
    padding: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  feedbackName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  feedbackText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 5,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
});

export default FeedBack;