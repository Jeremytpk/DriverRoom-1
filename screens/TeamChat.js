import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
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
import { useNavigation } from '@react-navigation/native';

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
    const navigation = useNavigation();
    const db = getFirestore();
    // --- Notification Setup ---
    useEffect(() => {
      registerForPushNotificationsAsync().then(token => {
        if (token && userData?.uid) {
          // Store the FCM token in Firestore for this user
          const userRef = doc(db, 'users', userData.uid);
          updateDoc(userRef, { fcmToken: token });
        }
      });
    }, [userData?.uid]);

    // Listen for foreground notifications
    useEffect(() => {
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        // Optionally handle notification in-app
      });
      return () => subscription.remove();
    }, []);

    // Listen for new messages and show local notification if not on TeamChat
    useEffect(() => {
      if (!userData?.dspName) return;
      const messagesQuery = query(
        collection(db, 'teamChats', userData.dspName, 'messages'),
        orderBy('createdAt', 'desc')
      );
      let lastMessageId = null;
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        if (!snapshot.empty) {
          const latest = snapshot.docs[0];
          if (lastMessageId && latest.id !== lastMessageId && latest.data().senderId !== userData.uid) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: `New message in ${userData.dspName}`,
                body: latest.data().text,
                data: { screen: 'TeamChat' },
              },
              trigger: null,
            });
          }
          lastMessageId = latest.id;
        }
      });
      return () => unsubscribe();
    }, [userData?.dspName]);

    // Configure navigation header for iOS - hide back button title
    useLayoutEffect(() => {
      navigation.setOptions({
        headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
        headerBackTitleVisible: false,
      });
    }, [navigation]);

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

// --- Register for Push Notifications (FCM) ---
async function registerForPushNotificationsAsync() {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  return token;
}

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

/*
--- Firebase Cloud Function Example (deploy in drr-functions/index.js) ---
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
exports.sendTeamChatNotification = functions.firestore
  .document('teamChats/{dspName}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const dspName = context.params.dspName;
    // Get all users in this team
    const usersSnap = await admin.firestore().collection('users').where('dspName', '==', dspName).get();
    const tokens = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken && data.uid !== message.senderId) tokens.push(data.fcmToken);
    });
    if (tokens.length > 0) {
      const payload = {
        notification: {
          title: `New message in ${dspName}`,
          body: message.text,
        },
        data: { screen: 'TeamChat' },
      };
      await admin.messaging().sendToDevice(tokens, payload);
    }
    return null;
  });
*/

export default TeamChat;