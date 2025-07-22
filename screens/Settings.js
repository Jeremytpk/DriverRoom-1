import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { auth } from '../firebase'; // Assuming firebase.js exports auth
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native'; // Import these hooks

// Centralized Color Palette (copy-pasted for self-containment, but ideally imported)
const Colors = {
  primaryTeal: '#007070', // Slightly darker teal
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
  redAccent: '#FF5733', // A more vibrant red for alerts/actions
  inactiveGray: '#A0A0A0', // Added for inactive tab icons/text
};

const Settings = () => {
  const { currentUser, userData } = useAuth();

  const currentNavigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState('SettingsTab');

  useEffect(() => {
    const currentRouteName = route.name;

    if (currentRouteName === 'Home') {
      setActiveTab('HomeTab');
    } else if (currentRouteName === 'Posts') {
      setActiveTab('PostsTab');
    } else if (currentRouteName === 'AdminTab') {
      setActiveTab('AdminTab');
    } else if (currentRouteName === 'CompanyTab') {
      setActiveTab('CompanyTab');
    } else if (currentRouteName === 'Settings') {
      setActiveTab('SettingsTab');
    }
  }, [route.name]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      console.log("Jey: User logged out successfully.");
      currentNavigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Jey: Logout error:', error);
      Alert.alert("Logout Failed", "Could not log out. Please try again.");
    }
  };

  const handleTabPress = (tabName) => {
    if (tabName === activeTab) {
      if (tabName === 'HomeTab') {
        currentNavigation.navigate('Home');
      }
      return;
    }

    setActiveTab(tabName);

    let screenNameToNavigate = '';
    switch (tabName) {
      case 'HomeTab':
        screenNameToNavigate = 'Home';
        break;
      case 'PostsTab':
        screenNameToNavigate = 'Posts';
        break;
      case 'AdminTab':
        screenNameToNavigate = 'AdminTab';
        break;
      case 'CompanyTab':
        screenNameToNavigate = 'CompanyTab';
        break;
      case 'SettingsTab':
        screenNameToNavigate = 'Settings';
        break;
      default:
        screenNameToNavigate = 'Home';
    }

    if (currentNavigation.getParent()) {
      currentNavigation.getParent().navigate(screenNameToNavigate);
    } else {
      console.warn(`Jey: Could not navigate to tab '${screenNameToNavigate}' via parent. Attempting direct navigation within current stack.`);
      currentNavigation.navigate(screenNameToNavigate);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => currentNavigation.navigate('EditProfile')}
          >
            {userData?.profilePictureUrl ? (
              <Image source={{ uri: userData.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={50} color={Colors.white} />
              </View>
            )}
            <View style={styles.editAvatarIcon}>
              <Ionicons name="camera-outline" size={20} color={Colors.white} />
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

          <TouchableOpacity style={styles.menuItem} onPress={() => currentNavigation.navigate('EditProfile')}>
            <Ionicons name="person-outline" size={24} color={Colors.primaryTeal} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={24} color={Colors.primaryTeal} />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primaryTeal} />
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          <Text style={styles.menuSectionTitle}>Support</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.primaryTeal} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>

          {/* Logout Button - Visually distinct */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.redAccent} />
            <Text style={[styles.logoutButtonText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Jey: Conditional rendering for Footer Navigation Buttons */}
      {!(userData?.isDsp) && ( // Only show if isDsp is NOT true
        <View style={styles.toggleButtonContainer}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('HomeTab')}
          >
            <Ionicons
              name="home-outline"
              size={20}
              color={activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('PostsTab')}
          >
            <Ionicons
              name="newspaper-outline"
              size={20}
              color={activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>

          {userData?.role === 'admin' && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => handleTabPress('AdminTab')}
            >
              <MaterialIcons
                name="admin-panel-settings"
                size={20}
                color={activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray }
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          )}

          {userData?.role === 'company' && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => handleTabPress('CompanyTab')}
            >
              <MaterialIcons
                name="business"
                size={20}
                color={activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray }
                ]}
              >
                Company
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('SettingsTab')}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 80, // Added padding to account for the fixed footer
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
    backgroundColor: Colors.lightGray, // Fallback background
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#D4EDDA', // Light green
  },
  statusPending: {
    backgroundColor: '#FFE0B2', // Light orange
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkText, // Adjust color based on background
  },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden', // Ensures rounded corners
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.mediumText,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: Colors.lightBackground, // A subtle background for section titles
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
  menuText: {
    marginLeft: 15,
    fontSize: 17,
    color: Colors.darkText,
    flex: 1, // Allows text to take up space and push arrow to right
  },
  menuArrow: {
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content for logout button
    backgroundColor: Colors.white, // No background for item itself, let it match menu
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth, // Separate from last menu item
    borderTopColor: Colors.border,
  },
  logoutButtonText: {
    marginLeft: 10,
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.redAccent, // Make logout stand out with a red warning color
  },
  // Footer Navigation Styles (Copied from HomeWrapper)
  toggleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 0,
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10, // Adjust for iOS home indicator
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 0,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default Settings;