import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Image, ScrollView
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import TransferDSPModal from '../components/TransferDSPModal';

const DriverDetailScreen = ({ route, navigation }) => {
  const { driverId } = route.params;
  const [driver, setDriver] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);

  const fetchDriverAndCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const driverDoc = await getDoc(doc(db, 'users', driverId));
      if (driverDoc.exists()) {
        setDriver({ id: driverDoc.id, ...driverDoc.data() });
      } else {
        Alert.alert("Error", "Driver not found.");
        navigation.goBack();
      }

      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompanies(companiesData);

    } catch (error) {
      console.error("Jey: Error fetching driver details:", error);
      Alert.alert("Error", "Failed to load driver details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [driverId, navigation]);

  useEffect(() => {
    fetchDriverAndCompanies();
  }, [fetchDriverAndCompanies]);

  const toggleActivation = async () => {
    if (!driver) return;
    try {
      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, { activated: !driver.activated });
      setDriver(prev => ({ ...prev, activated: !prev.activated }));
      Alert.alert("Success", `Driver status updated to ${!driver.activated ? 'Active' : 'Deactivated'}.`);
    } catch (error) {
      console.error("Jey: Error toggling driver status:", error);
      Alert.alert("Error", "Failed to update driver status.");
    }
  };

  const handleDelete = () => {
    if (!driver) return;
    Alert.alert(
      "Delete Driver",
      `Are you sure you want to delete ${driver.name}'s account? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', driverId));
              Alert.alert("Success", `${driver.name}'s account has been deleted.`);
              navigation.goBack();
            } catch (error) {
              console.error("Jey: Error deleting driver:", error);
              Alert.alert("Error", "Failed to delete driver. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleTransfer = async (newCompany) => {
    if (!driver) return;
    try {
      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, { dspName: newCompany.name });
      setDriver(prev => ({ ...prev, dspName: newCompany.name }));
      Alert.alert("Success", `${driver.name} has been transferred to ${newCompany.name}.`);
    } catch (error) {
      console.error("Jey: Error transferring driver:", error);
      Alert.alert("Error", "Failed to transfer driver. Please try again.");
    }
    setIsTransferModalVisible(false);
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={driverStyles.centeredContainer}>
        <ActivityIndicator size="large" color="#6BB9F0" />
        <Text style={driverStyles.loadingText}>Loading driver details...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={driverStyles.centeredContainer}>
        <Text style={driverStyles.loadingText}>Driver data not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={driverStyles.container}>
      <View style={driverStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#666" />
        </TouchableOpacity>
        <Text style={driverStyles.headerTitle}>Driver Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={driverStyles.profileCard}>
        {driver.photoURL ? (
          <Image source={{ uri: driver.photoURL }} style={driverStyles.profileImage} />
        ) : (
          <MaterialIcons name="account-circle" size={100} color="#ccc" />
        )}
        <Text style={driverStyles.driverName}>{driver.name}</Text>
        <Text style={driverStyles.driverEmail}>{driver.email}</Text>
      </View>

      <View style={driverStyles.detailsContainer}>
        <View style={driverStyles.detailRow}>
          <MaterialIcons name="business" size={24} color="#6BB9F0" />
          <Text style={driverStyles.detailLabel}>DSP Company</Text>
          <Text style={driverStyles.detailValue}>{driver.dspName || 'None'}</Text>
        </View>
        {/* Jey: New row to display the driver's role */}
        <View style={driverStyles.detailRow}>
          <MaterialIcons name="person-pin" size={24} color="#6BB9F0" />
          <Text style={driverStyles.detailLabel}>Role</Text>
          <Text style={driverStyles.detailValue}>{driver.role || 'N/A'}</Text>
        </View>
        <View style={driverStyles.detailRow}>
          <MaterialIcons name="calendar-today" size={24} color="#6BB9F0" />
          <Text style={driverStyles.detailLabel}>Date Created</Text>
          <Text style={driverStyles.detailValue}>{formatDate(driver.createdAt)}</Text>
        </View>
        <View style={driverStyles.detailRow}>
          <MaterialIcons name="check-circle" size={24} color={driver.activated ? 'green' : '#FF5733'} />
          <Text style={driverStyles.detailLabel}>Status</Text>
          <Text style={[driverStyles.detailValue, { color: driver.activated ? 'green' : '#FF5733', fontWeight: 'bold' }]}>
            {driver.activated ? 'Active' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <View style={driverStyles.buttonContainer}>
        <TouchableOpacity
          style={[driverStyles.actionButton, { backgroundColor: driver.activated ? '#FF5733' : '#6BB9F0' }]}
          onPress={toggleActivation}
        >
          <MaterialIcons name={driver.activated ? "person-off" : "person-add"} size={20} color="#fff" />
          <Text style={driverStyles.actionButtonText}>
            {driver.activated ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[driverStyles.actionButton, { backgroundColor: '#FF9AA2' }]}
          onPress={() => setIsTransferModalVisible(true)}
        >
          <MaterialIcons name="swap-horiz" size={20} color="#fff" />
          <Text style={driverStyles.actionButtonText}>Transfer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[driverStyles.actionButton, { backgroundColor: '#FF5733' }]}
          onPress={handleDelete}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
          <Text style={driverStyles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <TransferDSPModal
        visible={isTransferModalVisible}
        onClose={() => setIsTransferModalVisible(false)}
        companies={companies.filter(c => c.name !== driver.dspName)}
        onTransfer={handleTransfer}
      />
    </ScrollView>
  );
};

const driverStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderColor: '#6BB9F0',
    borderWidth: 3,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  driverEmail: {
    fontSize: 16,
    color: '#999',
    marginTop: 5,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 15,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default DriverDetailScreen;