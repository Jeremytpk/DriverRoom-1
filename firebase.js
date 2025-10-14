import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Jey: Use getAuth for web
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth'; // Jey: Import web persistence
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native'; // Jey: Import Platform to check the environment

const firebaseConfig = {
  apiKey: "AIzaSyCeFMr6BVp9hvJ8dqACXJXH4IrDuPqsZgg",
  authDomain: "driverroom-1.firebaseapp.com",
  projectId: "driverroom-1",
  storageBucket: "driverroom-1.firebasestorage.app",
  messagingSenderId: "514583100779",
  appId: "1:514583100779:web:fb5bb6bb6aaa8e6c90e02e",
  measurementId: "G-G4F3SZDMRQ"
};

// Initialize the Firebase app with the config
const app = initializeApp(firebaseConfig);

// Jey: Conditional check for the platform
let auth;
if (Platform.OS === 'web') {
  // Use getAuth for web, with web-specific persistence
  auth = getAuth(app);
} else {
  // Use initializeAuth with React Native persistence for mobile devices
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// Initialize Firestore with offline persistence
const db = getFirestore(app);

// Enable offline persistence for Firestore
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Function to handle network connectivity
const enableFirestoreNetwork = async () => {
  try {
    await enableNetwork(db);
    console.log('Jey: Firestore network enabled');
  } catch (error) {
    console.log('Jey: Error enabling Firestore network:', error);
  }
};

const disableFirestoreNetwork = async () => {
  try {
    await disableNetwork(db);
    console.log('Jey: Firestore network disabled');
  } catch (error) {
    console.log('Jey: Error disabling Firestore network:', error);
  }
};

const storage = getStorage(app);

export { auth, db, storage, enableFirestoreNetwork, disableFirestoreNetwork };