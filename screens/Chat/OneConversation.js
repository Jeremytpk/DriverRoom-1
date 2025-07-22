// OneConversation.js (additions and modifications)

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, addDoc, serverTimestamp, onSnapshot, orderBy, query, updateDoc, setDoc } from 'firebase/firestore'; // Import setDoc
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext'; // Jey: Corrected path assumption
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

const OneConversation = ({ route }) => {
  const { chatId, otherParticipant } = route.params;
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const flatListRef = useRef(null);

  // Jey: Function to mark chat as read
  const markChatAsRead = async () => {
    if (!userData?.uid || !chatId) return;

    try {
      const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', chatId);
      // Use setDoc with merge: true to create/update the document
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

  // Jey: Use useFocusEffect to mark chat as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      markChatAsRead(); // Mark as read when entering/focusing the screen

      // Optional: You might want to debounce this or only mark as read on exit
      // For simplicity, we mark on focus.
      return () => {
        // Optional: Re-mark as read when leaving the screen to catch late messages
        // markChatAsRead();
      };
    }, [chatId, userData?.uid]) // Depend on chatId and userData.uid
  );

  const handleSend = async () => {
    if (!message.trim()) return;
    
    try {
      const newMessage = {
        text: message,
        sender: userData.email,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), newMessage);
      
      // Jey: Update the main chat document with lastMessage details
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: newMessage.text,
          sender: newMessage.sender,
          createdAt: newMessage.createdAt,
        },
        // Jey: Also update participants array for easier query
        participants: [userData.email, otherParticipant], // Ensure participants are updated/present
        updatedAt: serverTimestamp(), // Added for general chat sorting
      });
      
      // Jey: Also mark as read for the current user after sending a message
      markChatAsRead();

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.participantName}>{otherParticipant}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble,
            item.sender === userData.email ? styles.myMessage : styles.otherMessage
          ]}>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.messageTime}>
              {item.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.messagesList}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={24} color="#FF9AA2" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6BB9F0',
  },
  messagesList: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF9AA2',
    borderBottomRightRadius: 0,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#6BB9F0',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  },
  sendButton: {
    marginLeft: 10,
  },
});

export default OneConversation;