import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, getFirestore,
  collection, query, where, onSnapshot // Jey: Added for unread counts
} from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Jey: New state to hold unread message counts
  const [unreadCounts, setUnreadCounts] = useState({ group: 0, one: 0 });

  const db = getFirestore();

  const updateUserProfile = async (user) => {
    if (!user) {
      setUserData(null);
      return null;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Jey: Error fetching user data:", error);
      return null;
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await updateUserProfile(userCredential.user);
      return { user: userCredential.user, userData };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name, dspName, role = 'driver') => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        name,
        dspName,
        role,
        activated: role !== 'driver',
        createdAt: new Date(),
        lastLogin: new Date(),
        profilePictureUrl: null,
        bio: '',
        emailVerified: false
      });

      await sendEmailVerification(userCredential.user);

      const userData = await updateUserProfile(userCredential.user);
      return { user: userCredential.user, userData };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setUnreadCounts({ group: 0, one: 0 }); // Jey: Reset unread counts on logout
    } catch (error) {
      console.error("Jey: Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await updateUserProfile(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Jey: This useEffect listens for unread messages and categorizes them
  useEffect(() => {
    // Only proceed if userData (especially email and uid) is available
    if (!userData?.email || !userData?.uid) {
      setUnreadCounts({ group: 0, one: 0 }); // Reset if user data is missing
      return;
    }

    // Query for all chat documents where the current user's email is a participant
    // This query includes both group chats and one-to-one chats if their 'participants'
    // array includes the user's email.
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userData.email)
    );

    // Set up a real-time listener for these chats
    const unsubscribeChats = onSnapshot(chatsQuery, async (chatsSnapshot) => {
      let totalUnreadGroup = 0;
      let totalUnreadOne = 0;

      // Process each chat document found
      const chatProcessingPromises = chatsSnapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const lastMessageTimestamp = chatData.lastMessage?.createdAt?.toDate();

        // If there's no last message, it cannot be unread, so skip
        if (!lastMessageTimestamp) {
          return;
        }

        // Fetch the current user's specific 'last read' timestamp for this chat.
        // This is stored in '/userChats/{userId}/chats/{chatId}'.
        const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', chatId);
        const userChatSnap = await getDoc(userChatDocRef); // Use getDoc for a single read

        let lastReadTimestamp = null;
        if (userChatSnap.exists()) {
          lastReadTimestamp = userChatSnap.data().lastReadMessageTimestamp?.toDate();
        }

        // Determine if the message is unread based on timestamps and sender
        // It's considered unread if:
        // 1. There's no recorded lastReadTimestamp (user has never opened this chat before), OR
        // 2. The timestamp of the latest message is newer than the lastReadTimestamp, AND
        // 3. The last message was NOT sent by the current user (you don't unread your own messages).
        if ((!lastReadTimestamp || lastMessageTimestamp > lastReadTimestamp) && chatData.lastMessage.sender !== userData.email) {
          // Jey: This is where 'isGroup: true' (or its absence) on the chat document is checked.
          // If the chat document has 'isGroup: true', it's counted as a group unread.
          // Otherwise (if 'isGroup' is false, undefined, or any other falsy value),
          // it's treated as a one-to-one chat unread.
          if (chatData.isGroup) {
            totalUnreadGroup += 1;
          } else {
            totalUnreadOne += 1;
          }
        }
      });

      // Wait for all chat documents' unread status to be processed
      await Promise.all(chatProcessingPromises);
      setUnreadCounts({ group: totalUnreadGroup, one: totalUnreadOne });
    }, (error) => {
      console.error("Jey: Error listening to chats for unread count:", error);
    });

    // Clean up the listener when the component unmounts or userData changes
    return () => unsubscribeChats();
  }, [userData, db]); // Re-run this effect if userData or db instance changes

  const value = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
    unreadCounts // Jey: Provide unreadCounts via context
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};