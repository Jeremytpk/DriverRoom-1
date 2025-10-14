import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, Alert, Linking } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import cameraIcon from '../assets/png/camera.png';
import userIcon from '../assets/png/user.png';
import lockIcon from '../assets/png/lock.png';
import rate_half from '../assets/png/rate_half.png';
import logoutIcon from '../assets/png/logout.png';
import FeedBack from './FeedBack';

const Colors = {
  primaryTeal: '#2E8B57',
  accentSalmon: '#FF6B6B',
  checkInGreen: '#4CAF50',
  lightBackground: '#F8FAFB',
  white: '#FFFFFF',
  darkText: '#2C3E50',
  mediumText: '#5A6C7D',
  lightGray: '#F0F2F5',
  border: '#E8EAED',
  inactiveGray: '#9AA0A6',
  redAccent: '#F44336',
  cardBackground: '#FFFFFF',
};

const Settings = () => {
  const { currentUser, userData } = useAuth();
  const navigation = useNavigation();

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);

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

  // Greeting and motivational message
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const getMotivationalMessage = () => {
    const messages = [
      'Your settings, your way! ⚙️',
      'Personalize your experience! 🌟',
      'Stay secure and in control! 🔒',
      'We care about your privacy! 🛡️',
      'Let us know how we can help! 💬'
    ];
    return messages[new Date().getDay() % messages.length];
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Profile Section with Gradient and Greeting */}
        <LinearGradient
          colors={[Colors.primaryTeal, '#3A9B6C']}
          style={styles.profileSection}
        >
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('EditProfile')}
          >
            {userData?.profilePictureUrl ? (
              <Image source={{ uri: userData.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={40} color={Colors.white} />
              </View>
            )}
            <View style={styles.editAvatarIcon}>
              <Image source={cameraIcon} style={styles.cameraImage} />
            </View>
          </TouchableOpacity>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.name}>{userData?.name?.split(' ')[0] || 'User'}! 👋</Text>
          <Text style={styles.motivationalText}>{getMotivationalMessage()}</Text>
          <Text style={styles.email}>{currentUser?.email || 'user@example.com'}</Text>
          <View style={[styles.statusBadge, userData?.activated ? styles.statusActive : styles.statusPending]}>
            <Text style={styles.statusText}>
              {userData?.activated ? 'Active' : 'Pending Activation'}
            </Text>
          </View>
        </LinearGradient>

        {/* General Menu Section */}
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
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('FeedBack')}>
            <Image source={rate_half} style={styles.menuItemIcon} />
            <Text style={styles.menuText}>Feedback</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>
        </View>

        {/* Support & Legal Menu Section */}
        <View style={styles.menu}>
          <Text style={styles.menuSectionTitle}>Support & Legal</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://driverroom.dev/privacy')}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primaryTeal} />
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://driverroom.dev/terms')}>
            <Ionicons name="document-text-outline" size={24} color={Colors.primaryTeal} />
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://driverroom.dev/contact')}>
            <Ionicons name="mail-outline" size={24} color={Colors.primaryTeal} />
            <Text style={styles.menuText}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.mediumText} style={styles.menuArrow} />
          </TouchableOpacity>
        </View>

        {/* Logout Button - Visually distinct */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Image source={logoutIcon} style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
    borderRadius: 18,
    padding: 28,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  greetingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 0,
    letterSpacing: 0.2,
  },
  motivationalText: {
    fontSize: 15,
    color: '#E0F2F1',
    marginTop: 2,
    marginBottom: 8,
    fontStyle: 'italic',
    textAlign: 'center',
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
    marginBottom: 20,
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
