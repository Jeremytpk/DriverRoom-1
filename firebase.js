import { initializeApp } from 'firebase/app';
// The correct import for React Native authentication
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
// For AsyncStorage, which is needed for React Native persistence
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Jey: This is the critical change for React Native.
// initializeAuth is used to configure persistence for mobile devices.
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Other services can be initialized as before
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };