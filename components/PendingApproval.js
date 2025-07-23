import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PendingApproval = () => {
  const { userData, updateUserProfile, currentUser } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const navigation = useNavigation();

  const checkApprovalStatus = async () => {
    if (!currentUser) {
      console.warn("Jey: No current user found while checking approval status. Redirecting to Login.");
      navigation.replace('Login');
      return;
    }

    setCheckingStatus(true);
    try {
      const updatedData = await updateUserProfile(currentUser);

      if (updatedData?.activated) {
        console.log("Jey: Account activated! Redirecting user to their respective home page.");
        if (updatedData.role === 'driver') {
          navigation.replace('MainApp', { screen: 'HomeTab' });
        } else if (updatedData.role === 'company' || updatedData.role === 'dispatcher_company') {
          navigation.replace('MainApp', { screen: 'CompanyTab' });
        } else if (updatedData.role === 'admin') {
          navigation.replace('MainApp', { screen: 'AdminTab' });
        } else {
          console.warn("Jey: Unknown role or no specific redirection defined. Navigating to HomeTab as default.");
          navigation.replace('MainApp', { screen: 'HomeTab' });
        }
      }
    } catch (error) {
      console.error("Jey: Error checking approval status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Jey: Removed the initial call to checkApprovalStatus from useEffect.
  // The status will now only be checked when the button is pressed.
  useEffect(() => {
    // This useEffect hook is now only here to observe currentUser and updateUserProfile
    // but no longer triggers an automatic status check.
    // If you need any setup that depends on currentUser *without* triggering a check,
    // it would go here. Otherwise, you could potentially remove this useEffect entirely
    // if its only purpose was the initial check.
  }, [currentUser, updateUserProfile]);

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={80} color="#6BB9F0" style={styles.icon} />
      <Text style={styles.title}>Account Pending Approval</Text>
      <Text style={styles.message}>
        Your account is waiting for approval from your DSP/ Company.
        Please tap the button below to check your status.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={checkApprovalStatus}
        disabled={checkingStatus}
      >
        {checkingStatus ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Check Approval Status</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6BB9F0',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#6BB9F0',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  note: { // Although this style is defined, the <Text> component using it has been removed.
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default PendingApproval;