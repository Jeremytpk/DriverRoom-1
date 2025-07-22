import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert, // Keeping Alert as per your original code, but generally prefer custom modals for better UX.
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // Assuming login function is provided by AuthContext
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { userData } = await login(email, password); // userData should contain isDsp and activated

      // Jey: Updated navigation logic based on isDsp and activated status
      if (userData?.isDsp) {
        navigation.navigate('CompanyScreen'); // Navigate to CompanyScreen if isDsp is true
      } else if (userData?.activated) {
        navigation.navigate('Home'); // Navigate to Home if activated (and not isDsp)
      } else {
        navigation.navigate('PendingApproval'); // Navigate to PendingApproval if not activated
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
        <View style={styles.header}>
          {/* Using a placeholder for the logo image if actual path is not available or for better visual balance */}
          <Image
            source={require('../../assets/logoOnly.png')} // Ensure this path is correct
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
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white background for professionalism
  },
  container: {
    flex: 1,
    padding: 25, // Increased padding for more breathing room
    justifyContent: 'space-between', // Distribute space between header, form, and footer
  },
  header: {
    alignItems: 'center',
    marginTop: 60, // Adjusted top margin
    marginBottom: 40,
  },
  logo: {
    width: 150, // Slightly smaller logo for a more refined look
    height: 150,
    marginBottom: 10, // Space between logo and title
    borderRadius: 100,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 26, // Slightly larger and bolder for impact
    fontWeight: '700', // Stronger font weight
    color: '#333333', // Darker text for better contrast and professionalism
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666', // Softer grey for subtext
    marginTop: 5,
  },
  formContainer: {
    flexGrow: 1, // Allows form to take up available space
    justifyContent: 'center', // Center the form vertically
    marginBottom: 20,
  },
  input: {
    height: 55, // Taller inputs for easier tapping
    borderWidth: 1,
    borderColor: '#E0E0E0', // Lighter border color
    borderRadius: 12, // More rounded corners for a friendly feel
    paddingHorizontal: 20,
    marginBottom: 18, // Increased space between inputs
    backgroundColor: '#F8F8F8', // Very light grey input background
    fontSize: 16,
    color: '#333333',
    shadowColor: '#000', // Subtle shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButton: {
    height: 55, // Consistent height with inputs
    backgroundColor: '#6BB9F0', // A more calming and professional blue
    borderRadius: 12, // Consistent rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20, // More space above the button
  },
  buttonDisabled: {
    opacity: 0.6, // Slightly more visible disabled state
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '700', // Bold text for emphasis
    fontSize: 18, // Larger font for readability
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end', // Aligned to the right
    marginBottom: 20, // Space below button
  },
  forgotPasswordText: {
    color: '#6BB9F0', // Matching the primary button color
    fontSize: 14,
    fontWeight: '600', // Slightly bolder
  },
  footer: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Adjust for iOS bottom safe area
  },
  footerText: {
    color: '#666666',
    fontSize: 15,
  },
  footerLink: {
    color: '#6BB9F0',
    fontWeight: '700', // Bolder link
    marginTop: 8, // More space from the text above
    fontSize: 15,
  },
});

export default Login;