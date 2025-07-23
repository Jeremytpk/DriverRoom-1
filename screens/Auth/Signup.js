import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert, // Make sure Alert is imported, which it is
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ImagePicker from 'expo-image-picker';
import { db, storage } from '../../firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';

const Signup = ({ navigation }) => {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  // Jey: Changed role options to 'driver' and 'dispatcher_company'
  const [role, setRole] = useState('driver'); // Default role
  // Jey: Added state for Location/Station for Dispatcher/Company
  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  // State for search and dropdown positioning
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, width: 0, left: 0 });
  const dropdownRef = useRef(null);

  // Fetch companies from Firestore on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'companies'));
        const companiesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCompanies(companiesList);
        setFilteredCompanies(companiesList);
      } catch (error) {
        console.error("Jey: Error fetching companies:", error);
        Alert.alert("Error", "Could not load company list. Please try again later.");
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();

    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Permission to access media library is required to pick a profile photo!');
        }
      }
    })();
  }, []);

  // Filter companies based on search term
  useEffect(() => {
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const newFilteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (company.address && company.address.toLowerCase().includes(lowerCaseSearchTerm))
      );
      setFilteredCompanies(newFilteredCompanies);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchTerm, companies]);

  // Handle image selection from device library
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    } else if (result.canceled) {
      console.log('Jey: Image picking cancelled.');
    }
  };

  // Handle form submission and user registration
  const handleSignup = async () => {
    // Basic validation
    // Jey: Conditional validation based on role
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password).');
      return;
    }

    if (role === 'driver' && !selectedCompany) {
      Alert.alert('Error', 'Please select your company.');
      return;
    }

    if (role === 'dispatcher_company' && !location) {
      Alert.alert('Error', 'Please enter your Location/Station.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      if (profileImage) {
        const response = await fetch(profileImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile_images/${Date.now()}_${email.split('@')[0]}.jpg`);
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Jey: Conditionally pass companyName or location based on role
      const companyInfo = role === 'driver' ? selectedCompany.name : location;

      // Register the user (this will create an entry in the 'users' collection or similar,
      // handled by your AuthContext's `register` function)
      const userCredential = await register(
        email,
        password,
        name.trim(),
        companyInfo, // This will be company name for driver, or location for dispatcher_company
        role,
        imageUrl
      );

      // Jey: If the user is a dispatcher_company, create an entry in the 'dsps' collection
      if (role === 'dispatcher_company') {
        const dspData = {
          userId: userCredential.user.uid, // Get the UID from the newly registered user
          dspName: name.trim(), // The Dispatcher/Company Name entered
          location: location.trim(),
          email: email.trim(),
          profileImageUrl: imageUrl,
          createdAt: serverTimestamp(),
          // You might want to add other fields here, like status, active drivers, etc.
        };

        // Create a new document in the 'dsps' collection.
        // You can either let Firestore auto-generate an ID (addDoc)
        // or use the user's UID as the document ID (setDoc with doc()).
        // Using the UID as the document ID for DSPs is often a good practice
        // as it provides a direct link back to the user's authentication record.
        await setDoc(doc(db, 'dsps', userCredential.user.uid), dspData);
        console.log("Jey: Dispatcher/Company entry created in 'dsps' collection.");
      }

      // Jey: Display success message and navigate
      Alert.alert(
        'Success',
        role === 'driver'
          ? 'Account created! Please verify your email and wait for admin approval.'
          : 'Account created! You can now log in.',
        [{
          text: 'OK',
          onPress: () => {
            navigation.navigate('Login'); // Navigate back to Login.js
          }
        }]
      );
    } catch (error) {
      handleSignupError(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle and display signup errors
  const handleSignupError = (error) => {
    let errorMessage = 'Signup failed. An unexpected error occurred. Please try again.';

    switch(error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email address is already registered. Please use a different one or log in.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'The email address is not valid.';
        break;
      case 'auth/weak-password':
        errorMessage = 'The password is too weak. Please choose a stronger password (at least 6 characters).';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    Alert.alert('Signup Failed', errorMessage);
  };

  // Get position of the dropdown selector for modal positioning
  const onDropdownLayout = () => {
    dropdownRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownPosition({
        top: y + height,
        left: x,
        width: width,
      });
    });
  };

  // Render individual company item in the FlatList within the modal
  const renderCompanyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.companyItem}
      onPress={() => {
        setSelectedCompany(item);
        setShowCompanyDropdown(false);
        setSearchTerm('');
      }}
    >
      <Text style={styles.companyText}>{item.name}</Text>
      {item.address && <Text style={styles.companySubtext}>{item.address}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create Your Account</Text>

          {/* Profile Image Selection */}
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={pickImage}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialIcons name="add-a-photo" size={36} color="#6BB9F0" />
                <Text style={styles.imagePlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Full Name / Dispatcher/Company Name Input */}
          <TextInput
            style={styles.input}
            // Jey: Dynamic placeholder based on role
            placeholder={role === 'driver' ? 'Full Name' : 'Dispatcher/Company Name'}
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {/* Jey: Conditional Location/Station Input for Dispatcher/Company */}
          {role === 'dispatcher_company' && (
            <TextInput
              style={styles.input}
              placeholder="Location/Station"
              placeholderTextColor="#888"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
          )}

          {/* Email Address Input */}
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

          {/* Password Input */}
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Confirm Password Input */}
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {/* Jey: Conditional Company Dropdown Selector for Driver Role */}
          {role === 'driver' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Your Company</Text>
              <TouchableOpacity
                ref={dropdownRef}
                onLayout={onDropdownLayout}
                style={styles.dropdownSelector}
                onPress={() => setShowCompanyDropdown(true)}
                disabled={loadingCompanies}
              >
                {loadingCompanies ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <>
                    <Text style={selectedCompany ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {selectedCompany ? selectedCompany.name : 'Choose your company'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Role Selection (Driver/Dsp & Company) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Type</Text>
            <View style={styles.roleContainer}>
              {/* Jey: Updated role button text and values */}
              {[
                { value: 'driver', label: 'Driver' },
                { value: 'dispatcher_company', label: 'Dsp/ Company' }
              ].map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleButton,
                    role === r.value && styles.roleButtonActive
                  ]}
                  onPress={() => setRole(r.value)}
                >
                  <Text style={[
                    styles.roleButtonText,
                    role === r.value && styles.roleButtonTextActive
                  ]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLinkText}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Company Dropdown Modal (only visible if role is driver) */}
        {role === 'driver' && (
          <Modal
            visible={showCompanyDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => { setShowCompanyDropdown(false); setSearchTerm(''); }}
          >
            <TouchableWithoutFeedback onPress={() => { setShowCompanyDropdown(false); setSearchTerm(''); }}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={[
              styles.dropdownModalContent,
              {
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: Dimensions.get('window').height * 0.4,
              }
            ]}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search company..."
                placeholderTextColor="#999"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <FlatList
                data={filteredCompanies}
                renderItem={renderCompanyItem}
                keyExtractor={item => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No companies found.</Text>
                }
                keyboardShouldPersistTaps="always"
              />
            </View>
          </Modal>
        )}
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
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 35,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#6BB9F0',
    resizeMode: 'cover',
  },
  profileImagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A8DADC',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#6BB9F0',
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
    color: '#555555',
    fontWeight: '600',
    fontSize: 15,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#F8F8F8',
    fontSize: 16,
    color: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F8F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dropdownModalContent: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    margin: 10,
    backgroundColor: '#F8F8F8',
    fontSize: 16,
    color: '#333',
  },
  companyItem: {
    padding: 18,
    backgroundColor: '#fff',
  },
  companyText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#333',
  },
  companySubtext: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  emptyText: {
    padding: 30,
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  roleButtonActive: {
    backgroundColor: '#6BB9F0',
  },
  roleButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#FF9AA2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 25,
    shadowColor: '#FF9AA2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  loginLink: {
    alignSelf: 'center',
    paddingBottom: 10,
  },
  loginText: {
    color: '#666',
    fontSize: 15,
  },
  loginLinkText: {
    color: '#6BB9F0',
    fontWeight: '700',
  },
});

export default Signup;