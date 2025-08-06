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
  collection, query, where, onSnapshot
} from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
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
      setUnreadCounts({ group: 0, one: 0 });
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

  useEffect(() => {
    if (!userData?.email || !userData?.uid) {
      setUnreadCounts({ group: 0, one: 0 });
      return;
    }

    // Jey: Create separate queries for group and one-to-one chats
    const groupChatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userData.email),
      where('isGroup', '==', true) // Filter for group chats
    );

    const oneChatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userData.email),
      where('isGroup', '==', false) // Filter for one-to-one chats
    );

    const unsubscribeGroupChats = onSnapshot(groupChatsQuery, async (groupChatsSnapshot) => {
      let totalUnreadGroup = 0;
      const chatProcessingPromises = groupChatsSnapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const lastMessageTimestamp = chatData.lastMessage?.createdAt?.toDate();

        if (!lastMessageTimestamp) return;

        const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', chatId);
        const userChatSnap = await getDoc(userChatDocRef);

        let lastReadTimestamp = userChatSnap.exists() ? userChatSnap.data().lastReadMessageTimestamp?.toDate() : null;

        if ((!lastReadTimestamp || lastMessageTimestamp > lastReadTimestamp) && chatData.lastMessage.sender !== userData.email) {
          totalUnreadGroup += 1;
        }
      });

      await Promise.all(chatProcessingPromises);
      setUnreadCounts(prev => ({ ...prev, group: totalUnreadGroup }));
    }, (error) => {
      console.error("Jey: Error listening to group chats:", error);
    });

    const unsubscribeOneChats = onSnapshot(oneChatsQuery, async (oneChatsSnapshot) => {
      let totalUnreadOne = 0;
      const chatProcessingPromises = oneChatsSnapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const lastMessageTimestamp = chatData.lastMessage?.createdAt?.toDate();

        if (!lastMessageTimestamp) return;

        const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', chatId);
        const userChatSnap = await getDoc(userChatDocRef);

        let lastReadTimestamp = userChatSnap.exists() ? userChatSnap.data().lastReadMessageTimestamp?.toDate() : null;

        if ((!lastReadTimestamp || lastMessageTimestamp > lastReadTimestamp) && chatData.lastMessage.sender !== userData.email) {
          totalUnreadOne += 1;
        }
      });

      await Promise.all(chatProcessingPromises);
      setUnreadCounts(prev => ({ ...prev, one: totalUnreadOne }));
    }, (error) => {
      console.error("Jey: Error listening to one-to-one chats:", error);
    });

    return () => {
      unsubscribeGroupChats();
      unsubscribeOneChats();
    };
  }, [userData, db]);

  const value = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
    unreadCounts,
    setUserData
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