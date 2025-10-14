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
  const [demoMode, setDemoMode] = useState(false);
  // Demo user data for each role
  const demoUsers = {
    driver: {
      uid: 'demo-driver',
      email: 'driver@demo.com',
      name: 'Demo Driver',
      dspName: 'Demo DSP',
      role: 'driver',
      activated: true,
      isOnDutty: true, // Always on-duty in demo mode
      isAdmin: false,
      isDsp: false,
      isTrainer: false,
      profilePictureUrl: null,
      bio: 'This is a demo driver.',
      emailVerified: true,
    },
    dsp: {
      uid: 'demo-dsp',
      email: 'dsp@demo.com',
      name: 'Demo DSP',
      dspName: 'Demo DSP',
      role: 'dsp',
      activated: true,
      isOnDutty: true,
      isAdmin: false,
      isDsp: true,
      isTrainer: false,
      profilePictureUrl: null,
      bio: 'This is a demo DSP/company.',
      emailVerified: true,
    },
    admin: {
      uid: 'demo-admin',
      email: 'admin@demo.com',
      name: 'Demo Admin',
      dspName: 'Demo DSP',
      role: 'admin',
      activated: true,
      isOnDutty: true,
      isAdmin: true,
      isDsp: false,
      isTrainer: false,
      profilePictureUrl: null,
      bio: 'This is a demo admin.',
      emailVerified: true,
    },
  };

  // Demo login function with role
  const loginAsDemo = async (role = 'driver') => {
    setLoading(true);
    setDemoMode(true);
    const userData = demoUsers[role] || demoUsers.driver;
    setCurrentUser({ uid: userData.uid, email: userData.email });
    setUserData(userData);
    setLoading(false);
    return { user: { uid: userData.uid, email: userData.email }, userData };
  };

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
      console.error('Error fetching user data:', error);
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
      
      for (const chatDoc of groupChatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const lastMessageTimestamp = chatData.lastMessage?.createdAt?.toDate();

        if (!lastMessageTimestamp) continue;

        const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', chatId);
        const userChatSnap = await getDoc(userChatDocRef);

        let lastReadTimestamp = userChatSnap.exists() ? userChatSnap.data().lastReadMessageTimestamp?.toDate() : null;

        if ((!lastReadTimestamp || lastMessageTimestamp > lastReadTimestamp) && chatData.lastMessage.sender !== userData.email) {
          totalUnreadGroup += 1;
        }
      }

      setUnreadCounts(prev => ({ ...prev, group: totalUnreadGroup }));
    });

    const unsubscribeOneChats = onSnapshot(oneChatsQuery, async (oneChatsSnapshot) => {
      let totalUnreadOne = 0;
      
      for (const chatDoc of oneChatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const lastMessageTimestamp = chatData.lastMessage?.createdAt?.toDate();

        if (!lastMessageTimestamp) continue;

        const userChatDocRef = doc(db, 'userChats', userData.uid, 'chats', chatId);
        const userChatSnap = await getDoc(userChatDocRef);

        let lastReadTimestamp = userChatSnap.exists() ? userChatSnap.data().lastReadMessageTimestamp?.toDate() : null;

        if ((!lastReadTimestamp || lastMessageTimestamp > lastReadTimestamp) && chatData.lastMessage.sender !== userData.email) {
          totalUnreadOne += 1;
        }
      }

      setUnreadCounts(prev => ({ ...prev, one: totalUnreadOne }));
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
    setUserData,
    demoMode,
    loginAsDemo,
    setDemoMode
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