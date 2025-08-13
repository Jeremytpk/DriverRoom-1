import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Colors = {
  primaryTeal: '#008080',
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
  red: '#dc3545',
  myMessageBubble: '#D6EAF8',
  otherMessageBubble: '#f0f0f0',
};

const TeamChat = () => {
    const { userData } = useAuth();
    const db = getFirestore();
    const [teamMessages, setTeamMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        if (!userData?.dspName) return;
        // Jey: Fetch messages in descending order so the inverted FlatList shows the newest at the bottom
        const messagesQuery = query(
          collection(db, 'teamChats', userData.dspName, 'messages'),
          orderBy('createdAt', 'desc')
        );
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
          const messagesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTeamMessages(messagesList);
        });
        return () => unsubscribeMessages();
    }, [userData?.dspName]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !userData?.dspName) return;
        try {
          const messagesRef = collection(db, 'teamChats', userData.dspName, 'messages');
          await addDoc(messagesRef, {
            text: newMessage,
            senderId: userData.uid,
            senderName: userData.name,
            createdAt: serverTimestamp(),
          });
          setNewMessage('');
        } catch (error) {
          console.error("Jey: Error sending team message:", error);
          Alert.alert("Error", "Failed to send message. Please try again.");
        }
    };
    
    const renderMessage = ({ item }) => {
        const isMyMessage = item.senderId === userData.uid;
        return (
          <View style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          ]}>
            {!isMyMessage && (
                <Text style={styles.messageSenderName}>{item.senderName}</Text>
            )}
            <View style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
            ]}>
              <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
                {item.text}
              </Text>
              <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
                {item.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        );
    };

    return (
        <KeyboardAvoidingView
          style={styles.chatWrapper}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
        >
            <View style={styles.chatContainer}>
              <FlatList
                data={teamMessages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatList}
                inverted={true} // Jey: Corrected to use inverted true for proper chat behavior
              />
              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.mediumText}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                  <Ionicons name="send" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
  chatWrapper: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    paddingTop: 10,
  },
  chatList: {
    flexGrow: 1,
    paddingHorizontal: 10,
    // Jey: Removed justifyContent: 'flex-end' since inverted prop handles it
  },
  messageContainer: {
    flexDirection: 'column',
    marginBottom: 10,
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    flexDirection: 'column',
  },
  myMessageBubble: {
    backgroundColor: Colors.myMessageBubble,
    borderBottomRightRadius: 2,
  },
  otherMessageBubble: {
    backgroundColor: Colors.otherMessageBubble,
    borderBottomLeftRadius: 2,
  },
  messageSenderName: {
    fontSize: 12,
    color: Colors.mediumText,
    marginBottom: 4,
  },
  myMessageText: {
    color: Colors.darkText,
    fontSize: 16,
  },
  otherMessageText: {
    color: Colors.darkText,
    fontSize: 16,
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: '#666',
  },
  otherMessageTime: {
    color: '#666',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    bottom: 10,
    marginBottom: 55
  },
  messageInput: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
    
  },
  sendButton: {
    backgroundColor: Colors.primaryTeal,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TeamChat;