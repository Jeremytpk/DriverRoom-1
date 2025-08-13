import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const LoadingScreen = () => {
  const navigation = useNavigation();
  const { currentUser, userData, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      console.log("Jey: LoadingScreen - Auth state determined. User:", currentUser ? currentUser.uid : "No user");

      if (currentUser) {
        // Jey: User is authenticated. Now, check user data for specific routing.
        // Jey: Prioritize admin and DSP roles, ignoring the 'activated' status for them.
        if (userData?.isAdmin) {
          navigation.replace('AdminScreen');
        } else if (userData?.isDsp) {
          navigation.replace('CompanyScreen');
        } else if (userData?.activated) {
          // Jey: Logic for activated general users (not admins or DSPs)
          if (userData?.role === 'driver') {
            if (userData?.isOnDutty) {
              navigation.replace('Home');
            } else {
              navigation.replace('OffDutty');
            }
          } else {
            navigation.replace('Main');
          }
        } else {
          // Jey: All other cases where a user exists but is not activated,
          // and is not an admin or DSP.
          navigation.replace('PendingApproval');
        }
      } else {
        // Jey: No authenticated user, go to Login
        navigation.replace('Login');
      }
    }
  }, [currentUser, userData, loading, navigation]);

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
