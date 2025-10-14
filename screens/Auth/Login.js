import React, { useState, useLayoutEffect } from 'react';
import { Modal } from 'react-native';
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Jey: Added new state for password visibility
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); 
  const { login, loginAsDemo } = useAuth();
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState(null);
  // Show modal to select demo role
  const handleDemoLogin = () => {
    setDemoModalVisible(true);
  };

  // Handle actual demo login after role selection
  const handleDemoRoleSelect = async (role) => {
    setDemoModalVisible(false);
    setLoading(true);
    try {
      const { userData } = await loginAsDemo(role);
      if (role === 'admin' || userData?.isAdmin) {
        navigation.navigate('AdminScreen');
      } else if (role === 'dsp' || userData?.isDsp) {
        navigation.navigate('CompanyScreen');
      } else if (role === 'driver' || userData?.role === 'driver') {
        if (userData?.activated && userData?.isOnDutty) {
          navigation.navigate('Home');
        } else if (userData?.activated && !userData?.isOnDutty) {
          navigation.navigate('OffDutty');
        } else {
          navigation.navigate('PendingApproval');
        }
      } else {
        navigation.navigate('PendingApproval');
      }
    } catch (error) {
      Alert.alert('Demo Login Error', 'Failed to enter demo mode.');
    } finally {
      setLoading(false);
    }
  };
  const navigation = useNavigation();

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);

  const handleLogin = async () => {
    // ... (rest of the handleLogin function is unchanged)
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { user } = await login(email, password);

      if (!user || !user.uid) {
        throw new Error("User object or UID not found after login.");
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.warn("Jey: User document does not exist for UID:", user.uid);
        navigation.navigate('PendingApproval');
        return;
      }

      const userDataFromFirestore = userDocSnap.data();

      if (userDataFromFirestore?.isAdmin) {
        navigation.navigate('AdminScreen');
      } else if (userDataFromFirestore?.isDsp) {
        navigation.navigate('CompanyScreen');
      } else if (userDataFromFirestore?.isTrainer) {
        navigation.navigate('Home');
      } else if (userDataFromFirestore?.role === 'driver') {
        if (userDataFromFirestore?.activated && userDataFromFirestore?.isOnDutty) {
          navigation.navigate('Home');
        } else if (userDataFromFirestore?.activated && !userDataFromFirestore?.isOnDutty) {
          navigation.navigate('OffDutty');
        } else {
          navigation.navigate('PendingApproval');
        }
      } else {
        navigation.navigate('PendingApproval');
      }
    } catch (error) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginError = (error) => {
    // ... (handleLoginError function is unchanged)
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

            {/* Jey: This is the new password input with the visibility toggle */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible} // Jey: Controlled by state
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            
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
  // ...existing code...
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 18,
    color: '#333',
  },
  modalButton: {
    backgroundColor: '#FFD580',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginVertical: 6,
    width: 200,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 16,
  },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    backgroundColor: '#eee',
    width: 200,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
  },
  demoButton: {
    height: 50,
    backgroundColor: '#FFD580',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  demoButtonText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 17,
  },
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
  // Jey: New styles for the password input container and icon
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333333',
  },
  eyeIcon: {
    paddingHorizontal: 15,
  },
  // Jey: Rest of the styles are unchanged
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