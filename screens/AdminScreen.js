import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const AdminScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch all companies
        const companiesSnapshot = await getDocs(collection(db, 'users'));
        const companiesData = companiesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === 'company');
        setCompanies(companiesData);

        // Fetch all drivers
        const driversData = companiesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === 'driver');
        setAllDrivers(driversData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'companies':
        return (
          <FlatList
            data={companies}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.dspName}</Text>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Email:</Text>
                  <Text style={styles.cardValue}>{item.email}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Drivers:</Text>
                  <Text style={styles.cardValue}>
                    {allDrivers.filter(d => d.dspName === item.dspName).length}
                  </Text>
                </View>
              </View>
            )}
            keyExtractor={item => item.id}
          />
        );
      case 'drivers':
        return (
          <FlatList
            data={allDrivers}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.driverInfo}>
                  <MaterialIcons name="person" size={24} color="#6BB9F0" />
                  <Text style={styles.driverName}>{item.name}</Text>
                  <Text style={styles.dspName}>{item.dspName}</Text>
                </View>
                <MaterialIcons 
                  name={item.activated ? 'check-circle' : 'remove-circle'} 
                  size={24} 
                  color={item.activated ? 'green' : 'red'} 
                />
              </View>
            )}
            keyExtractor={item => item.id}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6BB9F0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      <View style={styles.tabContainer}>
        {['companies', 'drivers', 'settings'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <MaterialIcons 
              name={
                tab === 'companies' ? 'business' :
                tab === 'drivers' ? 'people' : 'settings'
              } 
              size={24} 
              color={activeTab === tab ? '#FF9AA2' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
};

// Similar styles as CompanyScreen with minor adjustments
const styles = StyleSheet.create({
  // ... (use similar styles from CompanyScreen with color adjustments)
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6BB9F0',
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  cardLabel: {
    fontWeight: 'bold',
    width: 80,
    color: '#666',
  },
  cardValue: {
    flex: 1,
    color: '#333',
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    marginLeft: 10,
    marginRight: 5,
    fontSize: 16,
  },
  dspName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
});

export default AdminScreen;