import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Image, ScrollView, FlatList, TextInput
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import CompanyModal from '../components/CompanyModal';
import AssignDSPModal from '../components/AssignDSPModal';
import UpgradeModal from '../components/UpgradeModal';

const CompanyDetailScreen = ({ route, navigation }) => {
  const { companyId } = route.params;
  const [company, setCompany] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [isAssignDSPModalVisible, setIsAssignDSPModalVisible] = useState(false);
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);
  // Jey: New state for the company plan
  const [companyPlan, setCompanyPlan] = useState(null);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      if (companyDoc.exists()) {
        const companyData = { id: companyDoc.id, ...companyDoc.data() };
        setCompany(companyData);
        // Jey: Set the company plan from the fetched data
        setCompanyPlan(companyData.plan || 'Essentials');

        const [usersSnapshot, driversSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'users'), where('dspName', '==', companyData.name)))
        ]);
        setAllUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setDrivers(driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        Alert.alert("Error", "Company not found.");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Jey: Error fetching company details:", error);
      Alert.alert("Error", "Failed to load company details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [companyId, navigation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCompanyModal = () => {
    setIsCompanyModalVisible(true);
  };

  const handleOpenAssignDSPModal = () => {
    setIsAssignDSPModalVisible(true);
  };
  
  const handleOpenUpgradeModal = () => {
    setIsUpgradeModalVisible(true);
  };

  const handleUpgrade = async (plan, days) => {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);
      const companyData = companyDoc.data();
      
      if (!companyData.dspUserId) {
          throw new Error("DSP Admin not assigned to this company.");
      }
      
      const userRef = doc(db, 'users', companyData.dspUserId);
      
      // Jey: Calculate the expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + days);

      const batch = writeBatch(db);
      batch.update(companyRef, { 
        plan: plan,
        planExpiresAt: expirationDate.toISOString(), // Store as ISO string
      });
      batch.update(userRef, { 
        plan: plan,
        planExpiresAt: expirationDate.toISOString(),
      });
      await batch.commit();

      Alert.alert("Success", `Company plan updated to ${plan} for ${days} days.`);
      fetchData();
    } catch (error) {
      console.error("Jey: Error updating company plan:", error);
      Alert.alert("Error", "Failed to update company plan. Please try again.");
    }
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

  const handleUnassignDSP = () => {
    if (!company || !company.dspUserId) return;
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

  const handleDeleteCompany = () => {
    if (!company) return;
    Alert.alert(
      "Delete Company",
      `Are you sure you want to delete the company '${company.name}'? This action cannot be undone and will not delete associated user accounts.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'companies', company.id));
              Alert.alert("Success", `Company '${company.name}' deleted.`);
              navigation.goBack();
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

  const renderDriverItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('DriverDetail', { driverId: item.id })} style={companyDetailStyles.driverListItem}>
      <View style={companyDetailStyles.driverInfo}>
        <MaterialIcons name="person" size={20} color="#666" />
        <Text style={companyDetailStyles.driverName}>{item.name}</Text>
      </View>
      <View style={companyDetailStyles.driverRightSide}>
        <Text style={companyDetailStyles.driverRoleLabel}>{item.role}</Text>
        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
  
  const filteredDrivers = drivers.filter(driver =>
    (driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) || driver.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <View style={companyDetailStyles.centeredContainer}>
        <ActivityIndicator size="large" color="#6BB9F0" />
        <Text style={companyDetailStyles.loadingText}>Loading company details...</Text>
      </View>
    );
  }

  if (!company) {
    return (
      <View style={companyDetailStyles.centeredContainer}>
        <Text style={companyDetailStyles.loadingText}>Company data not available.</Text>
        <TouchableOpacity style={companyDetailStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={companyDetailStyles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDSPAssigned = !!company.dspUserId;
  const assignedDSP = isDSPAssigned ? allUsers.find(user => user.id === company.dspUserId) : null;
  const planExpirationDate = company.planExpiresAt ? new Date(company.planExpiresAt) : null;

  return (
    <View style={companyDetailStyles.container}>
      <View style={companyDetailStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#666" />
        </TouchableOpacity>
        <Text style={companyDetailStyles.headerTitle}>Company Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={companyDetailStyles.scrollViewContent}>
        <View style={companyDetailStyles.logoCard}>
          {company.logoUrl ? (
            <Image source={{ uri: company.logoUrl }} style={companyDetailStyles.logoImage} />
          ) : (
            <MaterialIcons name="business" size={100} color="#ccc" />
          )}
          <Text style={companyDetailStyles.companyName}>{company.name}</Text>
          <Text style={companyDetailStyles.companyEmail}>{company.email}</Text>
        </View>

        <View style={companyDetailStyles.detailsCard}>
          <View style={companyDetailStyles.detailRow}>
            <MaterialIcons name="location-on" size={24} color="#6BB9F0" />
            <Text style={companyDetailStyles.detailLabel}>Station/Location</Text>
            <Text style={companyDetailStyles.detailValue}>{company.stationLocation}</Text>
          </View>
          <View style={companyDetailStyles.detailRow}>
            <MaterialIcons name="person" size={24} color="#FF9AA2" />
            <Text style={companyDetailStyles.detailLabel}>DSP Admin</Text>
            <Text style={companyDetailStyles.detailValue}>{assignedDSP ? assignedDSP.name : 'Not Assigned'}</Text>
          </View>
          <View style={companyDetailStyles.detailRow}>
            <MaterialIcons name="people" size={24} color="#6BB9F0" />
            <Text style={companyDetailStyles.detailLabel}>Total Drivers</Text>
            <Text style={companyDetailStyles.detailValue}>{drivers.length}</Text>
          </View>
        </View>
        
        {/* Jey: The new subscription plan card with expiration date */}
        {companyPlan && (
            <View style={companyDetailStyles.planCard}>
                <Text style={companyDetailStyles.planTitle}>Subscription Plan</Text>
                <Text style={companyDetailStyles.planValue}>{companyPlan}</Text>
                {planExpirationDate && (
                    <Text style={companyDetailStyles.planExpiration}>
                        Expires: {planExpirationDate.toLocaleDateString()}
                    </Text>
                )}
            </View>
        )}
        
        <View style={companyDetailStyles.buttonContainer}>
          <TouchableOpacity onPress={handleOpenCompanyModal} style={[companyDetailStyles.actionButton, companyDetailStyles.editButton]}>
            <MaterialIcons name="edit" size={20} color="#fff" />
            <Text style={companyDetailStyles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          {isDSPAssigned ? (
            <TouchableOpacity onPress={handleUnassignDSP} style={[companyDetailStyles.actionButton, companyDetailStyles.unassignButton]}>
              <MaterialIcons name="person-off" size={20} color="#fff" />
              <Text style={companyDetailStyles.actionButtonText}>Unassign</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleOpenAssignDSPModal} style={[companyDetailStyles.actionButton, companyDetailStyles.assignButton]}>
              <MaterialIcons name="person-add" size={20} color="#fff" />
              <Text style={companyDetailStyles.actionButtonText}>Assign DSP</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleOpenUpgradeModal} style={[companyDetailStyles.actionButton, companyDetailStyles.upgradeButton]}>
            <MaterialIcons name="upgrade" size={20} color="#fff" />
            <Text style={companyDetailStyles.actionButtonText}>Upgrade</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteCompany} style={[companyDetailStyles.actionButton, companyDetailStyles.deleteButton]}>
            <MaterialIcons name="delete" size={20} color="#fff" />
            <Text style={companyDetailStyles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={companyDetailStyles.driversListContainer}>
          <View style={companyDetailStyles.driversListHeader}>
            <Text style={companyDetailStyles.driversListTitle}>Associated Drivers</Text>
            <Text style={companyDetailStyles.driverCountText}>Total: {drivers.length}</Text>
          </View>
          <TextInput
            style={companyDetailStyles.searchBar}
            placeholder="Search drivers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {filteredDrivers.length > 0 ? (
            <FlatList
              data={filteredDrivers}
              renderItem={renderDriverItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={companyDetailStyles.noDriversText}>No drivers found.</Text>
          )}
        </View>
      </ScrollView>

      <CompanyModal
        visible={isCompanyModalVisible}
        onClose={() => setIsCompanyModalVisible(false)}
        companyToEdit={company}
        onCompanySaved={fetchData}
      />
      <AssignDSPModal
        visible={isAssignDSPModalVisible}
        onClose={() => setIsAssignDSPModalVisible(false)}
        users={allUsers.filter(u => !u.isDsp)}
        company={company}
        onAssign={(user, company) => handleAssignDSP(user, company)}
      />
      <UpgradeModal
        visible={isUpgradeModalVisible}
        onClose={() => setIsUpgradeModalVisible(false)}
        onUpgrade={handleUpgrade}
      />
    </View>
  );
};

const companyDetailStyles = StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 20,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollViewContent: {
    padding: 15,
  },
  logoCard: {
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
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderColor: '#6BB9F0',
    borderWidth: 3,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  companyEmail: {
    fontSize: 16,
    color: '#999',
    marginTop: 5,
  },
  detailsCard: {
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
  planCard: {
    backgroundColor: '#e6f3ff', // Light blue background
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b3e0ff',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  planValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6BB9F0',
  },
  planExpiration: {
      fontSize: 14,
      color: '#888',
      marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#6BB9F0',
  },
  assignButton: {
    backgroundColor: '#6BB9F0',
  },
  unassignButton: {
    backgroundColor: '#FF9AA2',
  },
  deleteButton: {
    backgroundColor: '#FF5733',
  },
  upgradeButton: {
    backgroundColor: '#9b59b6',
  },
  editButton: {
    backgroundColor: '#6BB9F0',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  driversListContainer: {
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
  driversListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  driversListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  driverCountText: {
    fontSize: 16,
    color: '#6BB9F0',
    fontWeight: 'bold',
  },
  searchBar: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f1f1f1',
    color: '#333',
  },
  driverListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  driverRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRoleLabel: {
    backgroundColor: '#e6f3ff',
    color: '#6BB9F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
    textTransform: 'uppercase',
  },
  noDriversText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#6BB9F0',
    padding: 15,
    borderRadius: 10,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CompanyDetailScreen;