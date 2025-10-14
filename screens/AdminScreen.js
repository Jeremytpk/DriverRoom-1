import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Image, ScrollView, RefreshControl, TextInput,
  SafeAreaView, StatusBar, Platform
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import { db } from '../firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, where, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import CompanyModal from '../components/CompanyModal';
import AssignDSPModal from '../components/AssignDSPModal';
import TransferDSPModal from '../components/TransferDSPModal';
import AnalyticsDashboard from './AnalyticsDashboard';

const AdminScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState(null);

  const [isAssignDSPModalVisible, setIsAssignDSPModal] = useState(false);
  const [selectedCompanyForDSP, setSelectedCompanyForDSP] = useState(null);
  
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [showStats, setShowStats] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const [
        usersSnapshot,
        companiesSnapshot,
        driversSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'companies')),
        getDocs(query(collection(db, 'users'), where('role', 'in', ['driver', 'trainer'])))
      ]);

      const allUsersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompanies(companiesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        })
      );
      setDrivers(driversSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        })
      );
      setAllUsers(allUsersData);

    } catch (error) {
      console.error("Jey: Error fetching admin data:", error);
      Alert.alert("Error", "Failed to load admin data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setLoggedInUser({ id: userDoc.id, ...userDoc.data() });
          } else {
            console.warn("Jey: No user profile found in Firestore for UID:", user.uid);
            setLoggedInUser({ name: 'Admin User', photoURL: null });
          }
        } catch (error) {
          console.error("Jey: Error fetching user profile:", error);
          setLoggedInUser({ name: 'Admin User', photoURL: null });
        }
      } else {
        setLoggedInUser(null);
      }
      setIsProfileLoading(false);
    });

    fetchData();

    return () => unsubscribe();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleStats = () => {
    setShowStats(!showStats);
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

  const navigateToCompanyDetail = (companyId) => {
    navigation.navigate('CompanyDetail', { companyId });
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Essentials':
        return '#4FC3F7';
      case 'Professional':
        return '#66BB6A';
      case 'Executive':
        return '#AB47BC';
      default:
        return '#90A4AE';
    }
  };

  const getStatistics = () => {
    const totalCompanies = companies.length;
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter(d => d.activated).length;
    const companiesWithDSP = companies.filter(c => c.dspUserId).length;
    
    return {
      totalCompanies,
      totalDrivers,
      activeDrivers,
      companiesWithDSP,
      inactiveDrivers: totalDrivers - activeDrivers,
      companiesWithoutDSP: totalCompanies - companiesWithDSP
    };
  };

  const renderStatCard = (title, value, icon, color, subtitle) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <FontAwesome5 name={icon} size={16} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderDashboardStats = () => {
    const stats = getStatistics();
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {renderStatCard("Companies", stats.totalCompanies, "building", "#4FC3F7", `${stats.companiesWithDSP} with DSP`)}
          {renderStatCard("Total Drivers", stats.totalDrivers, "users", "#FF7043", `${stats.activeDrivers} active`)}
        </View>
        <View style={styles.statsRow}>
          {renderStatCard("Active Drivers", stats.activeDrivers, "user-check", "#66BB6A", `${stats.inactiveDrivers} pending`)}
          {renderStatCard("DSP Assigned", stats.companiesWithDSP, "user-tie", "#AB47BC", `${stats.companiesWithoutDSP} unassigned`)}
        </View>
      </View>
    );
  };

  const renderCompanyItem = ({ item }) => {
    const companyDrivers = allUsers.filter(user => user.dspName === item.name && user.role === 'driver');
    const activeDriverCount = companyDrivers.filter(d => d.activated).length;
    const isDSPAssigned = !!item.dspUserId;
    const assignedDSP = isDSPAssigned ? allUsers.find(user => user.id === item.dspUserId) : null;
    const plan = item.plan || 'Essentials';
    const planColor = getPlanColor(plan);

    // Logic to calculate remaining days
    let remainingDaysText = null;
    let remainingDaysColor = '#666';
    if (item.planExpiresAt) {
      const expirationDate = new Date(item.planExpiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = expirationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 7) {
        remainingDaysText = `${diffDays} days left`;
        remainingDaysColor = '#66BB6A';
      } else if (diffDays > 0) {
        remainingDaysText = `${diffDays} days left`;
        remainingDaysColor = '#FF7043';
      } else if (diffDays === 0) {
        remainingDaysText = 'Expires today';
        remainingDaysColor = '#F44336';
      } else {
        remainingDaysText = 'Expired';
        remainingDaysColor = '#F44336';
      }
    }

    return (
      <TouchableOpacity onPress={() => navigateToCompanyDetail(item.id)} style={styles.professionalCard}>
        <LinearGradient
          colors={['#FFFFFF', '#F8F9FA']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.companyIconContainer}>
                <FontAwesome5 name="building" size={20} color="#2196F3" />
              </View>
              <View style={styles.companyTitleContainer}>
                <Text style={styles.professionalCardTitle}>{item.name || 'No Name'}</Text>
                <View style={styles.companySubInfo}>
                  <FontAwesome5 name="calendar-alt" size={12} color="#666" />
                  <Text style={styles.companyCreatedText}>
                    Created {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.planContainer}>
              <View style={[styles.modernPlanBadge, { backgroundColor: planColor }]}>
                <Text style={styles.planBadgeText}>{plan}</Text>
              </View>
              {remainingDaysText && (
                <Text style={[styles.remainingDaysText, { color: remainingDaysColor }]}>
                  {remainingDaysText}
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.cardMetrics}>
            <View style={styles.metricItem}>
              <FontAwesome5 name="user-tie" size={14} color={isDSPAssigned ? '#66BB6A' : '#F44336'} />
              <Text style={styles.metricLabel}>DSP Admin</Text>
              <Text style={[styles.metricValue, { color: isDSPAssigned ? '#66BB6A' : '#F44336' }]}>
                {assignedDSP ? assignedDSP.name : 'Not Assigned'}
              </Text>
            </View>
            
            <View style={styles.metricItem}>
              <FontAwesome5 name="users" size={14} color="#2196F3" />
              <Text style={styles.metricLabel}>Total Drivers</Text>
              <Text style={styles.metricValue}>{companyDrivers.length}</Text>
            </View>
            
            <View style={styles.metricItem}>
              <FontAwesome5 name="user-check" size={14} color="#66BB6A" />
              <Text style={styles.metricLabel}>Active</Text>
              <Text style={[styles.metricValue, { color: '#66BB6A', fontWeight: '600' }]}>
                {activeDriverCount}
              </Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Activation Rate</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: companyDrivers.length > 0 ? `${(activeDriverCount / companyDrivers.length) * 100}%` : '0%' }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {companyDrivers.length > 0 ? Math.round((activeDriverCount / companyDrivers.length) * 100) : 0}%
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };
  
  const renderDriverItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('DriverDetail', { driverId: item.id })} 
      style={styles.professionalDriverCard}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        style={styles.driverCardGradient}
      >
        <View style={styles.driverCardContent}>
          <View style={styles.driverInfo}>
            <View style={[styles.driverAvatar, { backgroundColor: item.activated ? '#E8F5E8' : '#FFF3E0' }]}>
              <FontAwesome5 
                name="user" 
                size={18} 
                color={item.activated ? '#66BB6A' : '#FF7043'} 
              />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.professionalDriverName}>{item.name}</Text>
              <View style={styles.driverMetaInfo}>
                <FontAwesome5 name="building" size={12} color="#666" />
                <Text style={styles.driverCompany}>{item.dspName || 'No Company'}</Text>
              </View>
              {item.email && (
                <View style={styles.driverMetaInfo}>
                  <FontAwesome5 name="envelope" size={12} color="#666" />
                  <Text style={styles.driverEmail}>{item.email}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.driverActions}>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: item.activated ? '#E8F5E8' : '#FFF3E0' }
              ]}>
                <FontAwesome5 
                  name={item.activated ? "check-circle" : "clock"} 
                  size={12} 
                  color={item.activated ? '#66BB6A' : '#FF7043'} 
                />
                <Text style={[
                  styles.statusBadgeText, 
                  { color: item.activated ? '#66BB6A' : '#FF7043' }
                ]}>
                  {item.activated ? 'Active' : 'Pending'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[
                styles.modernToggleButton, 
                { backgroundColor: item.activated ? '#F44336' : '#2196F3' }
              ]}
              onPress={() => toggleDriverActivation(item.id, item.activated)}
            >
              <FontAwesome5 
                name={item.activated ? "user-times" : "user-check"} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.modernToggleButtonText}>
                {item.activated ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderMoreTab = () => (
    <ScrollView
      contentContainerStyle={styles.settingsContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.settingsTitle}>Administrative Tools</Text>
      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={styles.modernSettingsCard}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.settingsIconContainer}>
            <Ionicons name="settings" size={24} color="#2E8B57" />
          </View>
          <View style={styles.settingsTextContainer}>
            <Text style={styles.settingsCardTitle}>System Settings</Text>
            <Text style={styles.settingsCardSubtitle}>Configure application preferences</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={styles.modernSettingsCard}
          onPress={() => navigation.navigate('AnalyticsDashboard')}
        >
          <View style={styles.settingsIconContainer}>
            <Ionicons name="stats-chart" size={24} color="#2E8B57" />
          </View>
          <View style={styles.settingsTextContainer}>
            <Text style={styles.settingsCardTitle}>Analytics Dashboard</Text>
            <Text style={styles.settingsCardSubtitle}>View detailed usage statistics</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.settingsSection}>
        <View style={[styles.modernSettingsCard, { backgroundColor: '#F8FAFB', elevation: 0 }]}
          pointerEvents="none"
        >
          <View style={styles.settingsIconContainer}>
            <Ionicons name="information-circle" size={24} color="#2E8B57" />
          </View>
          <View style={styles.settingsTextContainer}>
            <Text style={styles.settingsCardTitle}>App Information</Text>
            <Text style={styles.settingsCardSubtitle}>Version 2.1.0 • Build 2024.10</Text>
          </View>
        </View>
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
            <View style={styles.modernSearchContainer}>
              <View style={styles.searchInputContainer}>
                <FontAwesome5 name="search" size={16} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.modernSearchBar}
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                    <FontAwesome5 name="times" size={14} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.countContainer}>
                <Text style={styles.modernCountText}>
                  {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modernAddButton}
              onPress={() => handleOpenCompanyModal()}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                style={styles.addButtonGradient}
              >
                <FontAwesome5 name="plus" size={18} color="#fff" />
                <Text style={styles.modernAddButtonText}>Add New Company</Text>
              </LinearGradient>
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
            <View style={styles.modernSearchContainer}>
              <View style={styles.searchInputContainer}>
                <FontAwesome5 name="search" size={16} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.modernSearchBar}
                  placeholder="Search drivers or DSPs..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                    <FontAwesome5 name="times" size={14} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.countContainer}>
                <Text style={styles.modernCountText}>
                  {filteredDrivers.length} {filteredDrivers.length === 1 ? 'driver' : 'drivers'}
                </Text>
              </View>
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
  
  if (loading || isProfileLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6BB9F0" />
        <Text style={styles.loadingText}>Loading admin data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
      <LinearGradient
        colors={['#1565C0', '#2196F3', '#42A5F5']}
        style={styles.headerGradient}
      >
        <View style={styles.modernHeader}>
          <View style={styles.headerTop}>
            <View style={styles.headerProfile}>
              <View style={styles.profileImageContainer}>
                {loggedInUser?.profilePictureUrl ? (
                  <Image source={{ uri: loggedInUser.profilePictureUrl }} style={styles.modernProfileImage} />
                ) : (
                  <View style={styles.defaultProfileContainer}>
                    <FontAwesome5 name="user-shield" size={24} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.modernHeaderTitle}>Admin Dashboard</Text>
                <Text style={styles.modernUserName}>{loggedInUser?.name || 'Administrator'}</Text>
                <Text style={styles.headerDate}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {activeTab === 'companies' && (
                <TouchableOpacity 
                  onPress={toggleStats} 
                  style={styles.modernToggleStatsButton}
                  activeOpacity={0.7}
                >
                  <FontAwesome5 
                    name={showStats ? "eye-slash" : "eye"} 
                    size={16} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleRefresh} style={styles.modernRefreshButton}>
                {refreshing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FontAwesome5 name="sync-alt" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {activeTab === 'companies' && showStats && renderDashboardStats()}
        </View>
      </LinearGradient>

      <View style={styles.modernTabContainer}>
        {[
          { key: 'companies', icon: 'building', label: 'Companies' },
          { key: 'drivers', icon: 'users', label: 'Drivers' },
          { key: 'more', icon: 'ellipsis-h', label: 'More' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.modernTabButton, activeTab === tab.key && styles.modernActiveTab]}
            onPress={() => {
              setActiveTab(tab.key);
              setSearchQuery('');
            }}
          >
            <FontAwesome5
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? '#2196F3' : '#666'}
            />
            <Text style={[styles.modernTabText, activeTab === tab.key && styles.modernActiveTabText]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.modernContent}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    marginRight: 15,
  },
  modernProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  defaultProfileContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modernUserName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modernToggleStatsButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modernRefreshButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statsContainer: {
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    borderLeftWidth: 4,
    backdropFilter: 'blur(10px)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modernTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  modernActiveTab: {
    backgroundColor: '#F8F9FA',
  },
  modernTabText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    fontWeight: '500',
  },
  modernActiveTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '80%',
    height: 3,
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  modernContent: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  tabContentContainer: {
    flex: 1,
    padding: 16,
  },
  modernSearchContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 10,
  },
  modernSearchBar: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 5,
  },
  countContainer: {
    alignItems: 'center',
  },
  modernCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  modernAddButton: {
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modernAddButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  professionalCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyTitleContainer: {
    flex: 1,
  },
  professionalCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  companySubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyCreatedText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  planContainer: {
    alignItems: 'flex-end',
  },
  modernPlanBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remainingDaysText: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  cardMetrics: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  cardFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#66BB6A',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    fontWeight: '600',
  },
  professionalDriverCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  driverCardGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  driverCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  professionalDriverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  driverMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  driverCompany: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  driverEmail: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  driverActions: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modernToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modernToggleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 6,
  },
  settingsContent: {
    padding: 16,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernSettingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsCardTitle: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsCardSubtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
  settingsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsCardText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
    marginLeft: 15,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 16,
    fontStyle: 'italic',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
});

export default AdminScreen;