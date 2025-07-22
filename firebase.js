import { initializeApp } from 'firebase/app';
// Import initializeAuth and getReactNativePersistence
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Import AsyncStorage
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCeFMr6BVp9hvJ8dqACXJXH4IrDuPqsZgg",
  authDomain: "driverroom-1.firebaseapp.com",
  projectId: "driverroom-1",
  storageBucket: "driverroom-1.firebasestorage.app",
  messagingSenderId: "514583100779",
  appId: "1:514583100779:web:fb5bb6bb6aaa8e6c90e02e",
  measurementId: "G-G4F3SZDMRQ"
};

const app = initializeApp(firebaseConfig);

// Explicitly initialize Auth with React Native persistence
// This is the key change for robust session persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };