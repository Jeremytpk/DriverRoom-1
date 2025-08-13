import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Jey: Import your local image assets
import profilePlaceholderIcon from '../assets/png/profile.png';
import cameraIcon from '../assets/png/camera.png';
import userIcon from '../assets/png/user.png';
import lockIcon from '../assets/png/lock.png';
import rate_half from '../assets/png/rate_half.png';
import logoutIcon from '../assets/png/logout.png';

// Jey: Import the new FeedBack.js component
import FeedBack from './FeedBack';

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
                <Image source={profilePlaceholderIcon} style={styles.profilePlaceholderImage} />
              </View>
            )}
            <View style={styles.editAvatarIcon}>
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
            <Image source={userIcon} style={styles.menuItemIcon} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ResetPassword')}>
            <Image source={lockIcon} style={styles.menuItemIcon} />
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          {/* Jey: Updated Feedback button to navigate to FeedBack.js */}
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('FeedBack')}>
            <Image source={rate_half} style={styles.menuItemIcon} />
            <Text style={styles.menuText}>Feedback</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          {/* Logout Button - Visually distinct */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
  profilePlaceholderImage: {
    width: 80,
    height: 80,
    tintColor: Colors.white,
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
  cameraImage: {
    width: 20,
    height: 20,
    tintColor: Colors.white,
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
  menuItemIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.primaryTeal,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  logoutIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.redAccent,
  },
  logoutButtonText: {
    marginLeft: 10,
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.redAccent,
  },
});

export default Settings;