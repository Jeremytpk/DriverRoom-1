import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const LoadingScreen = () => {
  const navigation = useNavigation();
  const { user, userData, loadingUser } = useAuth(); // Get loadingUser

  useEffect(() => {
    // Only navigate once loadingUser is false, meaning Firebase Auth state is confirmed
    if (!loadingUser) {
      console.log("Jey: LoadingScreen - Auth state determined. User:", user ? user.uid : "No user");

      if (user) {
        // User is authenticated
        // Now, wait for userData to be loaded or proceed if it's not a critical dependency for initial route
        // For role-based redirection, it's better to wait for userData too.
        if (userData === null && !loadingUserData) { // If user exists but userData is null and not loading, maybe it's a new user without data yet, or an error.
          // Handle cases where user is logged in but has no Firestore profile (e.g., brand new sign-up)
          // You might want to navigate to a profile creation screen here.
          console.warn("Jey: User logged in, but no Firestore userData found or still loading.");
          // For now, let's assume if user exists, we proceed, if userData is still loading that's handled by other logic.
        }

        if (userData?.activated === false) {
          navigation.replace('PendingApproval');
        } else if (userData?.role === 'company' || userData?.isDsp === true) {
          navigation.replace('CompanyScreen');
        } else {
          navigation.replace('Main'); // Default to Main Tabs for regular users
        }
      } else {
        // No authenticated user, go to Login
        navigation.replace('Login');
      }
    }
  }, [user, userData, loadingUser, navigation]); // Add loadingUserData if you want to wait for that explicitly

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#008080" />
      <Text style={styles.loadingText}>Loading application...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    color: '#333',
    fontSize: 16,
  }
});

export default LoadingScreen;