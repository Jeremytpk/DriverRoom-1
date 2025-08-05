import React, { useState, useEffect } from 'react'; // Jey: Added useEffect
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail // Jey: ✨ Import for unauthenticated flow
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Jey: ✨ Import for checking email existence
import { db } from '../firebase'; // Jey: Assuming 'db' is exported from your firebase.js
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  const auth = getAuth();

  // Jey: State for authenticated user password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Jey: State for unauthenticated user email input
  const [emailToReset, setEmailToReset] = useState('');

  const [loading, setLoading] = useState(false);

  // Jey: Determine the flow based on whether a user is currently logged in
  const isLoggedInFlow = !!currentUser;

  useEffect(() => {
    if (isLoggedInFlow && currentUser?.email) {
      setEmailToReset(currentUser.email); // Pre-fill email if logged in
    } else {
      setEmailToReset(''); // Clear email if not logged in
    }
  }, [isLoggedInFlow, currentUser]);

  const handleSubmit = async () => { // Jey: Renamed to handleSubmit for clarity
    setLoading(true);

    try {
      if (isLoggedInFlow) {
        // Jey: Authenticated User Flow (Change Password)
        if (!currentPassword || !newPassword || !confirmNewPassword) {
          Alert.alert('Error', 'Please fill in all password fields.');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          Alert.alert('Error', 'New passwords do not match.');
          return;
        }
        if (newPassword.length < 6) {
          Alert.alert('Error', 'New password must be at least 6 characters long.');
          return;
        }

        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);

        Alert.alert('Success', 'Your password has been successfully reset!');
        navigation.navigate('PasswordResetConfirmation');
      } else {
        // Jey: Unauthenticated User Flow (Forgot Password)
        if (!emailToReset) {
          Alert.alert('Error', 'Please enter your email address.');
          return;
        }

        // Jey: Check if email exists in Firestore 'users' collection
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', emailToReset.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          Alert.alert('Account Not Found', 'No account found with this email address. Please check your email or sign up.');
          return;
        }

        // Jey: If email exists, send password reset email
        await sendPasswordResetEmail(auth, emailToReset);

        Alert.alert('Password Reset Link Sent', `A password reset link has been sent to ${emailToReset}. Please check your inbox (and spam folder).`);
        navigation.navigate('Login'); // Jey: Navigate back to login after sending email
      }
    } catch (error) {
      console.error("Jey: Error in password reset process:", error);
      let errorMessage = 'An error occurred. Please try again.';

      // Jey: Handle specific Firebase authentication errors for both flows
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'The current password you entered is incorrect.';
          break;
        case 'auth/user-mismatch':
          errorMessage = 'User mismatch. Please log in again.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid current password. Please try again.';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'For security reasons, this operation requires a recent login. Please log in again.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The new password is too weak. Please choose a stronger password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/user-not-found': // Jey: More specific for sendPasswordResetEmail
          errorMessage = 'No account found with this email address.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#333333" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={require('../assets/reset_password.png')}
              style={styles.illustration}
              resizeMode="contain"
            />
            <Text style={styles.title}>
              {isLoggedInFlow ? 'Change Your Password' : 'Forgot Your Password?'}
            </Text>
            <Text style={styles.subtitle}>
              {isLoggedInFlow
                ? 'Enter your current password and your new password below.'
                : 'Enter the email address associated with your account to receive a password reset link.'}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Jey: Conditional rendering for email input */}
            <TextInput
              style={[styles.input, isLoggedInFlow && styles.readOnlyInput]}
              placeholder="Account Email"
              placeholderTextColor="#888"
              value={emailToReset}
              onChangeText={setEmailToReset}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoggedInFlow} // Jey: Editable only if not logged in
            />

            {/* Jey: Conditional rendering for password fields (only if logged in) */}
            {isLoggedInFlow && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Current Password"
                  placeholderTextColor="#888"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />

                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#888"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#888"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.resetButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit} // Jey: Call the unified handleSubmit
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>
                  {isLoggedInFlow ? 'Reset Password' : 'Send Reset Link'}
                </Text>
              )}
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
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 25,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  illustration: {
    width: 200,
    height: 200,
    marginBottom: 20,
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
    textAlign: 'center',
    paddingHorizontal: 20,
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
  readOnlyInput: {
    backgroundColor: '#e9e9e9',
    color: '#555555',
  },
  resetButton: {
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
  resetButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});

export default ResetPassword;
