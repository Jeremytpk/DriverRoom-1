import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore'; // Jey: Import Firestore functions
import { db } from '../../firebase'; // Jey: Assuming 'db' is exported from your firebase.js

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { user } = await login(email, password); // Jey: Get the raw user object from login

      if (!user || !user.uid) {
        throw new Error("User object or UID not found after login.");
      }

      // Jey: Fetch the user's document directly from Firestore to get the latest status
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.warn("Jey: User document does not exist for UID:", user.uid);
        // Jey: Handle case where user document might not exist (e.g., new user, or data inconsistency)
        // You might want to navigate to a profile setup screen or a default dashboard
        navigation.navigate('PendingApproval'); // Or a more appropriate fallback
        return;
      }

      const userDataFromFirestore = userDocSnap.data();

      // Jey: Updated navigation logic to handle different user roles and isOnDutty status
      if (userDataFromFirestore?.isAdmin) {
        navigation.navigate('AdminScreen');
      } else if (userDataFromFirestore?.isDsp) {
        navigation.navigate('CompanyScreen');
      } else if (userDataFromFirestore?.role === 'driver') { // Jey: Check if the user is a driver
        if (userDataFromFirestore?.activated && userDataFromFirestore?.isOnDutty) {
          navigation.navigate('Home');
        } else if (userDataFromFirestore?.activated && !userDataFromFirestore?.isOnDutty) {
          navigation.navigate('OffDutty');
        } else {
          // Jey: If driver is not activated, they go to PendingApproval
          navigation.navigate('PendingApproval');
        }
      } else {
        // Jey: Fallback for any other roles or unhandled cases (e.g., if 'role' is missing or unknown)
        // For now, assuming any non-admin/non-dsp also goes to PendingApproval
        navigation.navigate('PendingApproval');
      }
    } catch (error) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginError = (error) => {
    let errorMessage = 'Login failed. Please try again.';

    switch(error.code) {
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password combination';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password. Please try again';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Try again later';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    Alert.alert('Login Error', errorMessage);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Image
              source={require('../../assets/logoOnly.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Sign in to continue to DriverRoom</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ResetPassword')}
            >
              <Text style={styles.forgotPasswordText}>Reset Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
    borderRadius: 100,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    marginBottom: 20,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 18,
    backgroundColor: '#F8F8F8',
    fontSize: 16,
    color: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButton: {
    height: 55,
    backgroundColor: '#6BB9F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#6BB9F0',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  footerText: {
    color: '#666666',
    fontSize: 15,
  },
  footerLink: {
    color: '#6BB9F0',
    fontWeight: '700',
    marginTop: 8,
    fontSize: 15,
  },
});

export default Login;
