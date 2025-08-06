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

// Other services can be initialized as before
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };