import { initializeApp } from 'firebase/app';
// Jey: For web, you only need getAuth. Persistence is handled automatically.
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Jey: No need to import ReactNativeAsyncStorage for web builds
// import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

// Jey: Simplify Auth initialization for web.
// Firebase Auth automatically uses browser persistence (localStorage/sessionStorage) by default.
const auth = getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };