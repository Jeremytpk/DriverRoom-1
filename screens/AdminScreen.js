import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, Image, ScrollView, RefreshControl
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, getDocs, where, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import CompanyModal from '../components/CompanyModal';
import AssignDSPModal from '../components/AssignDSPModal';

const AdminScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState(null);

  const [isAssignDSPModalVisible, setIsAssignDSPModal] = useState(false);
  const [selectedCompanyForDSP, setSelectedCompanyForDSP] = useState(null);
  
  // Jey: State for the logged-in user
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Jey: Placeholder function to get the current user ID
  // **IMPORTANT:** Replace this with your actual logic to get the current user's ID
  const getUserId = () => {
    // For example: `return auth.currentUser.uid;`
    // Jey: Using the ID from your screenshot for testing
    return 'nGpRSSIgZZeZExkZWDxRS80z8A3';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      // Jey: Fetch all data concurrently and efficiently
      const [
        usersSnapshot,
        companiesSnapshot,
        driversSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'companies')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'driver')))
      ]);

      const allUsersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setAllUsers(allUsersData);
      setCompanies(companiesData);
      setDrivers(driversData);

      // Jey: Find the logged-in user's data from the fetched list
      const currentUserId = getUserId();
      const currentUserData = allUsersData.find(user => user.id === currentUserId);
      setLoggedInUser(currentUserData || { name: 'Admin User', photoURL: null });

    } catch (error) {
      console.error("Jey: Error fetching admin data:", error);
      Alert.alert("Error", "Failed to load admin data. Please try again.");
      setLoggedInUser({ name: 'Admin User', photoURL: null }); // Jey: Set placeholder on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Jey: Empty dependency array means this function is created once

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleDriverActivation = async (driverId, currentStatus) => {
    try {
      const driverRef = doc(db, 'users', driverId);
      await updateDoc(driverRef, { activated: !currentStatus });

      const updatedDrivers = drivers.map(d =>
        d.id === driverId ? { ...d, activated: !currentStatus } : d
      );
      setDrivers(updatedDrivers);

      Alert.alert("Success", `Driver status updated to ${!currentStatus ? 'Activated' : 'Deactivated'}.`);
    } catch (error) {
      console.error("Jey: Error toggling driver status:", error);
      Alert.alert("Error", "Failed to update driver status.");
    }
  };

  const handleOpenCompanyModal = (company = null) => {
    setCompanyToEdit(company);
    setIsCompanyModalVisible(true);
  };

  const handleOpenAssignDSPModal = (company) => {
    setSelectedCompanyForDSP(company);
    setIsAssignDSPModalVisible(true);
  };

  const handleAssignDSP = async (user, company) => {
    Alert.alert(
      "Confirm Assignment",
      `Are you sure you want to assign ${user.name} as the DSP for ${company.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', user.id);
              const companyRef = doc(db, 'companies', company.id);

              await updateDoc(userRef, {
                role: 'dsp',
                isDsp: true,
                dspName: company.name,
              });

              await updateDoc(companyRef, {
                dspUserId: user.id,
              });

              fetchData();
              setIsAssignDSPModalVisible(false);
              Alert.alert("Success", `${user.name} has been assigned as the DSP for ${company.name}.`);
            } catch (error) {
              console.error("Jey: Error assigning DSP:", error);
              Alert.alert("Error", "Failed to assign DSP. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleUnassignDSP = (company) => {
    const dspUser = allUsers.find(user => user.id === company.dspUserId);
    const dspName = dspUser ? dspUser.name : 'the assigned DSP';

    Alert.alert(
      "Confirm Unassignment",
      `Are you sure you want to unassign ${dspName} from ${company.name}? This will revoke their DSP privileges.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', company.dspUserId);
              const companyRef = doc(db, 'companies', company.id);

              await updateDoc(userRef, {
                role: 'driver',
                isDsp: false,
                dspName: null,
              });

              await updateDoc(companyRef, {
                dspUserId: null,
              });

              fetchData();
              Alert.alert("Success", `${dspName} has been unassigned from ${company.name}.`);
            } catch (error) {
              console.error("Jey: Error unassigning DSP:", error);
              Alert.alert("Error", "Failed to unassign DSP. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteCompany = (companyId, companyName) => {
    Alert.alert(
      "Delete Company",
      `Are you sure you want to delete the company '${companyName}'? This action cannot be undone and will not delete associated user accounts.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'companies', companyId));
              setCompanies(prev => prev.filter(c => c.id !== companyId));
              Alert.alert("Success", `Company '${companyName}' deleted.`);
            } catch (error) {
              console.error("Jey: Error deleting company:", error);
              Alert.alert("Error", "Failed to delete company. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderCompanyItem = ({ item }) => {
    const dspDrivers = drivers.filter(d => d.dspName === item.name);
    const activeDriverCount = dspDrivers.filter(d => d.activated).length;
    const isDSPAssigned = !!item.dspUserId;
    const assignedDSP = isDSPAssigned ? allUsers.find(user => user.id === item.dspUserId) : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="business" size={24} color="#6BB9F0" />
          <Text style={styles.cardTitle}>{item.name || 'No Name'}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>DSP Admin:</Text>
          <Text style={[styles.cardValue, { fontWeight: isDSPAssigned ? 'bold' : 'normal', color: isDSPAssigned ? '#FF9AA2' : '#666' }]}>
            {assignedDSP ? assignedDSP.name : 'Not Assigned'}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Total Drivers:</Text>
          <Text style={styles.cardValue}>{dspDrivers.length}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Active:</Text>
          <Text style={[styles.cardValue, { color: 'green', fontWeight: 'bold' }]}>{activeDriverCount}</Text>
        </View>
        <View style={styles.cardActions}>
          {isDSPAssigned ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.unassignButton]}
              onPress={() => handleUnassignDSP(item)}
            >
              <MaterialIcons name="remove-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Unassign</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.assignButton]}
              onPress={() => handleOpenAssignDSPModal(item)}
            >
              <MaterialIcons name="person-add" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Assign</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleOpenCompanyModal(item)}
          >
            <MaterialIcons name="edit" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteCompany(item.id, item.name)}
          >
            <MaterialIcons name="delete" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDriverItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.driverInfo}>
        <MaterialIcons name="person" size={24} color="#6BB9F0" />
        <View style={styles.driverTextContainer}>
          <Text style={styles.driverName}>{item.name}</Text>
          <Text style={styles.dspName}>{item.dspName || 'N/A'}</Text>
        </View>
      </View>
      <View style={styles.listActions}>
        <Text style={[styles.statusText, { color: item.activated ? 'green' : 'red' }]}>
          {item.activated ? 'Active' : 'Pending'}
        </Text>
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: item.activated ? '#FF5733' : '#6BB9F0' }]}
          onPress={() => toggleDriverActivation(item.id, item.activated)}
        >
          <Text style={styles.toggleButtonText}>
            {item.activated ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMoreTab = () => (
    <ScrollView contentContainerStyle={styles.settingsContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.settingsTitle}>More Options</Text>
      <TouchableOpacity
        style={styles.settingsCard}
        onPress={() => navigation.navigate('Settings')}
      >
        <MaterialIcons name="settings" size={24} color="#6BB9F0" />
        <Text style={styles.settingsCardText}>Settings</Text>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
      <View style={styles.settingsCard}>
        <MaterialIcons name="security" size={24} color="#FF9AA2" />
        <Text style={styles.settingsCardText}>Manage Safety Tips & Notices</Text>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </View>
      <View style={styles.settingsCard}>
        <MaterialIcons name="announcement" size={24} color="#6BB9F0" />
        <Text style={styles.settingsCardText}>Broadcast Global Notice</Text>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </View>
    </ScrollView>
  );

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDrivers = drivers.filter(driver =>
    driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.dspName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'companies':
        return (
          <View style={styles.tabContentContainer}>
            <View style={styles.searchAndCountContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search companies..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              <Text style={styles.countText}>Total: {filteredCompanies.length}</Text>
            </View>

            <TouchableOpacity
              style={styles.addCompanyButton}
              onPress={() => handleOpenCompanyModal()}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.addCompanyButtonText}>Add New Company</Text>
            </TouchableOpacity>
            <FlatList
              data={filteredCompanies}
              renderItem={renderCompanyItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContentContainer}
              ListEmptyComponent={<Text style={styles.emptyListText}>No companies found.</Text>}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          </View>
        );
      case 'drivers':
        return (
          <View style={styles.tabContentContainer}>
            <View style={styles.searchAndCountContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search drivers or DSPs..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              <Text style={styles.countText}>Total: {filteredDrivers.length}</Text>
            </View>
            <FlatList
              data={filteredDrivers}
              renderItem={renderDriverItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContentContainer}
              ListEmptyComponent={<Text style={styles.emptyListText}>No drivers found.</Text>}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          </View>
        );
      case 'more':
        return renderMoreTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6BB9F0" />
        <Text style={styles.loadingText}>Loading admin data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          {loggedInUser?.photoURL ? (
            <Image source={{ uri: loggedInUser.photoURL }} style={styles.profileImage} />
          ) : (
            <MaterialIcons name="account-circle" size={40} color="#666" />
          )}
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.userName}>{loggedInUser?.name || 'Admin User'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshIconContainer}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#6BB9F0" />
          ) : (
            <Ionicons name="refresh" size={24} color="#6BB9F0" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {['companies', 'drivers', 'more'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab);
              setSearchQuery('');
            }}
          >
            <MaterialIcons
              name={
                tab === 'companies' ? 'business' :
                tab === 'drivers' ? 'people' : 'more-horiz'
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

      <CompanyModal
        visible={isCompanyModalVisible}
        onClose={() => setIsCompanyModalVisible(false)}
        companyToEdit={companyToEdit}
        onCompanySaved={fetchData}
      />
      
      <AssignDSPModal
        visible={isAssignDSPModalVisible}
        onClose={() => setIsAssignDSPModalVisible(false)}
        users={allUsers.filter(u => !u.isDsp)}
        company={selectedCompanyForDSP}
        onAssign={handleAssignDSP}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderColor: '#6BB9F0',
    borderWidth: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6BB9F0',
  },
  userNameText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  refreshIconContainer: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF9AA2',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  activeTabText: {
    color: '#FF9AA2',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  tabContentContainer: {
    flex: 1,
  },
  searchAndCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchBar: {
    flex: 1,
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f1f1f1',
    color: '#333',
    marginRight: 10,
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6BB9F0',
  },
  addCompanyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6BB9F0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  addCompanyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6BB9F0',
    marginLeft: 10,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  cardLabel: {
    fontWeight: 'bold',
    width: 100,
    color: '#666',
  },
  cardValue: {
    flex: 1,
    color: '#333',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  assignButton: {
    backgroundColor: '#6BB9F0',
  },
  unassignButton: {
    backgroundColor: '#FF9AA2',
  },
  editButton: {
    backgroundColor: '#FF9AA2',
  },
  deleteButton: {
    backgroundColor: '#FF5733',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverTextContainer: {
    marginLeft: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dspName: {
    fontSize: 14,
    color: '#666',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 10,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  settingsContent: {
    padding: 15,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsCardText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginLeft: 15,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 16,
  },
  listContentContainer: {
    paddingBottom: 20,
  },
});

export default AdminScreen;