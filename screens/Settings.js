import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Still keep Ionicons if you use it elsewhere or for other icons not specified
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Jey: Import your local image assets
import profilePlaceholderIcon from '../assets/png/profile.png'; // For avatar placeholder
import cameraIcon from '../assets/png/camera.png'; // For edit avatar icon
import userIcon from '../assets/png/user.png'; // For Edit Profile menu item
import lockIcon from '../assets/png/lock.png'; // For Privacy & Security menu item
import rate_half from '../assets/png/rate_half.png'; 
import logoutIcon from '../assets/png/logout.png'; // For Logout button

const Colors = {
  primaryTeal: '#007070',
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
  redAccent: '#FF5733',
  inactiveGray: '#A0A0A0',
};

const Settings = () => {
  const { currentUser, userData } = useAuth();
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      console.log("Jey: User logged out successfully.");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Jey: Logout error:', error);
      Alert.alert("Logout Failed", "Could not log out. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('EditProfile')}
          >
            {userData?.profilePictureUrl ? (
              <Image source={{ uri: userData.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                {/* Jey: Replaced Ionicons with custom profile placeholder image */}
                <Image source={profilePlaceholderIcon} style={styles.profilePlaceholderImage} />
              </View>
            )}
            <View style={styles.editAvatarIcon}>
              {/* Jey: Replaced Ionicons with custom camera icon */}
              <Image source={cameraIcon} style={styles.cameraImage} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{userData?.name || 'User Name'}</Text>
          <Text style={styles.email}>{currentUser?.email || 'user@example.com'}</Text>
          <View style={[styles.statusBadge, userData?.activated ? styles.statusActive : styles.statusPending]}>
            <Text style={styles.statusText}>
              {userData?.activated ? 'Active' : 'Pending Activation'}
            </Text>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menu}>
          <Text style={styles.menuSectionTitle}>General</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
            {/* Jey: Replaced Ionicons with custom user icon */}
            <Image source={userIcon} style={styles.menuItemIcon} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ResetPassword')}>
            {/* Jey: Replaced Ionicons with custom lock icon */}
            <Image source={lockIcon} style={styles.menuItemIcon} />
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Image source={rate_half} style={styles.menuItemIcon} />
            <Text style={styles.menuText}>Feedback</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          {/* Logout Button - Visually distinct */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            {/* Jey: Replaced Ionicons with custom logout icon */}
            <Image source={logoutIcon} style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
  },
  scrollViewContent: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 25,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: Colors.lightGray,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Jey: Style for the profile placeholder image
  profilePlaceholderImage: {
    width: 80, // Adjust size as needed
    height: 80, // Adjust size as needed
    tintColor: Colors.white, // Apply tint if your PNG is a monochrome icon
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primaryTeal,
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  // Jey: Style for the camera image
  cameraImage: {
    width: 20, // Adjust size as needed
    height: 20, // Adjust size as needed
    tintColor: Colors.white, // Apply tint if your PNG is a monochrome icon
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: Colors.mediumText,
    marginBottom: 10,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#D4EDDA',
  },
  statusPending: {
    backgroundColor: '#FFE0B2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.mediumText,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: Colors.lightBackground,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  // Jey: Style for menu item icons
  menuItemIcon: {
    width: 24, // Match Ionicons size
    height: 24, // Match Ionicons size
    tintColor: Colors.primaryTeal, // Apply tint if your PNG is a monochrome icon
  },
  menuText: {
    marginLeft: 15,
    fontSize: 17,
    color: Colors.darkText,
    flex: 1,
  },
  menuArrow: {
    marginLeft: 10,
  },
  logoutButton: {
    //marginTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  // Jey: Style for the logout icon
  logoutIcon: {
    width: 24, // Match Ionicons size
    height: 24, // Match Ionicons size
    tintColor: Colors.redAccent, // Apply tint if your PNG is a monochrome icon
  },
  logoutButtonText: {
    marginLeft: 10,
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.redAccent,
  },
});

export default Settings;