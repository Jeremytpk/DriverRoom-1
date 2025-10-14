import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image, Switch,
  TextInput, RefreshControl, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import dashboardIcon from '../assets/png/dashboard.png';
import businessIcon from '../assets/png/business_outline.png';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, updateDoc, doc,
  orderBy, deleteDoc, getDoc, onSnapshot, setDoc
} from 'firebase/firestore';

// Jey: Importing custom components
import NoticeModal from '../components/Notice';
import SafetyTipsModal from '../components/SafetyTips';
import GateCodes from './GateCodes/GateCodes';

const CompanyScreen = ({ navigation }) => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([]);

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);
  const [noticesCount, setNoticesCount] = useState(0);
  const [safetyTipsCount, setSafetyTipsCount] = useState(0);
  const [initialNotices, setInitialNotices] = useState([]);
  const [initialSafetyTips, setInitialSafetyTips] = useState([]);
  const [allowChat, setAllowChat] = useState(true);
  const [allowPosts, setAllowPosts] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNoticeModalVisible, setIsNoticeModalVisible] = useState(false);
  const [isSafetyTipModalVisible, setIsSafetyTipModalVisible] = useState(false);

  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [onDutyDrivers, setOnDutyDrivers] = useState([]);
  const [onDutyCount, setOnDutyCount] = useState(0);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState(new Set());
  
  const [companyPlan, setCompanyPlan] = useState('Essentials');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);

  const updateSettingsAndDrivers = useCallback(async (field, value) => {
    if (!userData?.uid || !userData?.dspName) {
      console.warn("Jey: User data (UID or dspName) not available to update settings.");
      Alert.alert("Error", "User data not available. Cannot update settings.");
      return;
    }

    setSettingsLoading(true);

    try {
      const companyRef = doc(db, 'users', userData.uid);
      await updateDoc(companyRef, { [field]: value });
      console.log(`Jey: Successfully updated company's ${field} setting to ${value}`);

      const driversQuery = query(
          collection(db, 'users'),
          where('dspName', '==', userData.dspName),
          where('role', 'in', ['driver', 'trainer'])
      );
      const driversSnapshot = await getDocs(driversQuery);

      const driverUpdatePromises = driversSnapshot.docs.map(driverDoc => {
          return updateDoc(doc(db, 'users', driverDoc.id), { [field]: value });
      });

      await Promise.all(driverUpdatePromises);
      console.log(`Jey: Successfully propagated ${field} setting to all drivers and trainers of DSP: ${userData.dspName}`);
      Alert.alert("Success", `Settings for all drivers and trainers have been updated.`);

    } catch (error) {
      console.error(`Jey: Error updating company or driver settings:`, error);
      Alert.alert("Error", `Failed to update settings. Please try again. Detailed error: ${error.message}`);

      if (field === 'allowChat') {
          setAllowChat(!value);
      } else if (field === 'allowPosts') {
          setAllowPosts(!value);
      }
    } finally {
        setSettingsLoading(false);
    }
  }, [userData]);

  const handleAddToOnDuty = async (driverId, driverName) => {
    try {
      const userRef = doc(db, 'users', driverId);
      // Jey: Added onDutySince timestamp for live tracking
      await updateDoc(userRef, { isOnDutty: true, onDutySince: new Date() });
      Alert.alert("Success", `${driverName} has been added to the on-duty list.`);
    } catch (error) {
      console.error("Jey: Error adding driver to on-duty list:", error);
      Alert.alert("Error", "Failed to add driver to on-duty list. Please try again.");
    }
  };

  const handleMultiSelectOnDuty = async () => {
    if (selectedDrivers.size === 0) {
      Alert.alert("No Drivers Selected", "Please select at least one driver to mark as on-duty.");
      return;
    }

    setLoading(true);
    const updatePromises = [];
    const currentTime = new Date(); // Use a single timestamp for all drivers

    for (const driverId of selectedDrivers) {
      const userRef = doc(db, 'users', driverId);
      // Jey: Added onDutySince timestamp for live tracking
      updatePromises.push(updateDoc(userRef, { isOnDutty: true, onDutySince: currentTime }));
    }

    try {
      await Promise.all(updatePromises);
      Alert.alert("Success", `${selectedDrivers.size} drivers have been marked as on-duty.`);
      setSelectedDrivers(new Set());
      setMultiSelectMode(false);
    } catch (error) {
      console.error("Jey: Error adding multiple drivers to on-duty list:", error);
      Alert.alert("Error", "Failed to add drivers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromOnDuty = async (driverId, driverName) => {
    try {
      const userRef = doc(db, 'users', driverId);
      await updateDoc(userRef, { isOnDutty: false });
      Alert.alert("Success", `${driverName} has been removed from on-duty.`);
    } catch (error) {
      console.error("Jey: Error removing driver from on-duty:", error);
      Alert.alert("Error", "Failed to remove driver. Please try again.");
    }
  };

  const toggleAllowChat = (newValue) => {
    setAllowChat(newValue);
    updateSettingsAndDrivers('allowChat', newValue);
  };

  const toggleAllowPosts = (newValue) => {
    setAllowPosts(newValue);
    updateSettingsAndDrivers('allowPosts', newValue);
  };

  const fetchCompanyData = async () => {
    setLoading(true);
    setRefreshing(true);
    setSettingsLoading(true);

    try {
      if (!userData?.uid || !userData?.dspName) {
        console.warn("Jey: User data (UID or dspName) not available to fetch company data.");
        return;
      }
      
      const teamQuery = query(
        collection(db, 'users'),
        where('dspName', '==', userData.dspName),
        where('role', 'in', ['driver', 'trainer'])
      );
      const teamSnapshot = await getDocs(teamQuery);
      const teamData = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const allActiveDriversAndTrainers = teamData.filter(d => d.activated);
      const pendingDriversOnly = teamData.filter(d => !d.activated);
      
      const sortedActiveList = allActiveDriversAndTrainers.sort((a, b) => {
          if (a.role === 'trainer' && b.role !== 'trainer') return -1;
          if (a.role !== 'trainer' && b.role === 'trainer') return 1;
          return a.name.localeCompare(b.name);
      });
      setDrivers(sortedActiveList);
      setPendingDrivers(pendingDriversOnly);

      const noticesQuery = query(
        collection(db, 'notices_by_dsp', userData.dspName, 'items'),
        orderBy('createdAt', 'desc')
      );
      const noticesSnapshot = await getDocs(noticesQuery);
      const fetchedNotices = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNoticesCount(fetchedNotices.length);
      setInitialNotices(fetchedNotices);

      const safetyTipsQuery = query(
        collection(db, 'safetyTips_by_dsp', userData.dspName, 'items'),
        orderBy('createdAt', 'desc')
      );
      const safetyTipsSnapshot = await getDocs(safetyTipsQuery);
      const fetchedSafetyTips = safetyTipsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSafetyTipsCount(fetchedSafetyTips.length);
      setInitialSafetyTips(fetchedSafetyTips);
    } catch (error) {
      console.error("Jey: Error fetching company data:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSettingsLoading(false);
    }
  };
  
  useEffect(() => {
    if (!userData?.dspName) return;

    const onDutyQuery = query(
      collection(db, 'users'),
      where('dspName', '==', userData.dspName),
      where('role', 'in', ['driver', 'trainer']),
      where('isOnDutty', '==', true)
    );
    const unsubscribe = onSnapshot(onDutyQuery, (snapshot) => {
      const onDutyDriversList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOnDutyDrivers(onDutyDriversList);
      setOnDutyCount(onDutyDriversList.length);
    }, (error) => {
      console.error("Jey: Error listening to on-duty drivers:", error);
    });

    return () => unsubscribe();
  }, [userData?.dspName]);

  useEffect(() => {
    if (!userData?.uid) return;

    const userRef = doc(db, 'users', userData.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data();
        setCompanyPlan(settingsData.plan || 'Essentials');
        setAllowChat(settingsData.allowChat ?? true);
        setAllowPosts(settingsData.allowPosts ?? true);
      }
    });

    return () => unsubscribe();
  }, [userData?.uid]);
  
  useEffect(() => {
    if (!userData?.dspName) return;
    
    const companiesQuery = query(
      collection(db, 'companies'),
      where('name', '==', userData.dspName)
    );
    
    const unsubscribe = onSnapshot(companiesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const companyData = snapshot.docs[0].data();
        setCompanyLogoUrl(companyData.logoUrl || null);
      }
    });
    
    return () => unsubscribe();
  }, [userData?.dspName]);

  useEffect(() => {
    fetchCompanyData();
  }, [userData]);

  const handleNoticesUpdated = (updatedNotices) => {
    setNoticesCount(updatedNotices.length);
    setInitialNotices(updatedNotices);
  };

  const handleSafetyTipsUpdated = (updatedTips) => {
    setSafetyTipsCount(updatedTips.length);
    setInitialSafetyTips(updatedTips);
  };

  const handleRefresh = () => {
    fetchCompanyData();
  };

  const handleActivation = async (driverId, activate) => {
    try {
      await updateDoc(doc(db, 'users', driverId), {
        activated: activate
      });
      if (activate) {
        const activatedDriver = pendingDrivers.find(d => d.id === driverId);
        if (activatedDriver) {
          setDrivers(prev => [...prev, { ...activatedDriver, activated: true }]);
          setPendingDrivers(prev => prev.filter(d => d.id !== driverId));
        }
      } else {
        const deactivatedDriver = drivers.find(d => d.id === driverId);
        if (deactivatedDriver) {
          setPendingDrivers(prev => [...prev, { ...deactivatedDriver, activated: false }]);
          setDrivers(prev => prev.filter(d => d.id !== driverId));
        }
      }
      Alert.alert("Success", `Driver ${activate ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error("Jey: Error updating driver activation status:", error);
      Alert.alert("Error", "Failed to update driver status. Please try again.");
    }
  };

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(driverSearchQuery.toLowerCase())
  );
  const filteredPendingDrivers = pendingDrivers.filter(d =>
    d.name.toLowerCase().includes(pendingSearchQuery.toLowerCase())
  );

  const toggleDriverSelection = (driverId) => {
    setSelectedDrivers(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(driverId)) {
        newSelected.delete(driverId);
      } else {
        newSelected.add(driverId);
      }
      return newSelected;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDrivers.size === filteredDrivers.length) {
      setSelectedDrivers(new Set());
    } else {
      const allDriverIds = new Set(filteredDrivers.map(d => d.id));
      setSelectedDrivers(allDriverIds);
    }
  };

  const renderDriverItem = ({ item }) => {
    const isPending = !item.activated;
    const isOnDuty = onDutyDrivers.some(d => d.id === item.id);
    const isTrainer = item.role === 'trainer';

    return (
      <View style={[styles.listItem, isTrainer && { borderLeftColor: '#f7a680' }]}>
        <View style={styles.driverInfo}>
          {multiSelectMode && !isPending && (
            <TouchableOpacity onPress={() => toggleDriverSelection(item.id)} style={styles.checkboxContainer}>
              <Ionicons
                name={selectedDrivers.has(item.id) ? "checkbox-outline" : "square-outline"}
                size={24}
                // Jey: Updated checkbox color to professional salmon
                color={selectedDrivers.has(item.id) ? '#f7a680' : '#999'} 
              />
            </TouchableOpacity>
          )}
          {item.profilePhotoURL ? (
            <Image
              key={item.id}
              source={{ uri: item.profilePhotoURL }}
              style={styles.driverProfilePhoto}
            />
          ) : (
            // Jey: Updated placeholder color to a more neutral blue/gray
            <FontAwesome name="user-circle" size={30} color="#a0b8c8" style={styles.driverProfilePhotoPlaceholder} />
          )}
          <View style={styles.nameAndRole}>
            <Text style={styles.driverName}>{item.name}</Text>
            {/* Jey: Updated role tag color for professionalism */}
            {isTrainer && <Text style={[styles.roleTag, {backgroundColor: '#555'}]}>Trainer</Text>} 
          </View>
          {isPending ? (
            <MaterialIcons name="pending" size={20} color="#f7a680" /> // Use salmon for pending
          ) : (
            <MaterialIcons name="verified" size={20} color="#007a82" /> // Use teal for verified/active
          )}
        </View>
        <View style={styles.actionButtons}>
          {isPending ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.activateBtn]}
              onPress={() => handleActivation(item.id, true)}
            >
              <Text style={styles.btnText}>Activate</Text>
            </TouchableOpacity>
          ) : (
            !multiSelectMode && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, isOnDuty && styles.activeActionBtn]}
                  onPress={() => isOnDuty ? handleRemoveFromOnDuty(item.id, item.name) : handleAddToOnDuty(item.id, item.name)}
                >
                  <Ionicons name="car-outline" size={20} color={isOnDuty ? '#fff' : '#007a82'} /> {/* Use teal icon */}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deactivateBtn]}
                  onPress={() => handleActivation(item.id, false)}
                >
                  <MaterialIcons name="person-remove" size={20} color="#fff" />
                </TouchableOpacity>
              </>
            )
          )}
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'drivers':
        return (
          <ScrollView contentContainerStyle={styles.scrollContentContainer} refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#007a82" />
          }>
            <TextInput
              style={styles.searchBar}
              placeholder="Search active drivers..."
              value={driverSearchQuery}
              onChangeText={setDriverSearchQuery}
              placeholderTextColor="#999"
            />
            <View style={styles.statsCard}>
                <View style={styles.statsCountRow}>
                    <View>
                        <Text style={styles.statsTitle}>Total Active Drivers</Text>
                        <Text style={styles.statsValue}>{drivers.length}</Text>
                    </View>
                    <View style={styles.onDutyContainer}>
                        <Text style={styles.onDutyTitle}>On-Duty</Text>
                        <Text style={[styles.statsValue, {color: '#fff'}]}>{onDutyCount}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.onDutyButton}
                    onPress={() => navigation.navigate('OnDutty')}
                >
                    <Text style={styles.onDutyButtonText}>Manage On-Duty List</Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.selectDriversButton}
              onPress={() => {
                setMultiSelectMode(!multiSelectMode);
                if (multiSelectMode) {
                  setSelectedDrivers(new Set());
                }
              }}
            >
              <Text style={styles.selectDriversButtonText}>
                {multiSelectMode ? 'Cancel Selection' : 'Select Drivers'}
              </Text>
            </TouchableOpacity>

            <FlatList
              data={filteredDrivers}
              renderItem={renderDriverItem}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyListText}>No active drivers or trainers found.</Text>}
              scrollEnabled={false}
            />
          </ScrollView>
        );
      case 'requests':
        return (
          <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search pending requests..."
              value={pendingSearchQuery}
              onChangeText={setPendingSearchQuery}
              placeholderTextColor="#999"
            />
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Pending Approvals</Text>
              <Text style={[styles.statsValue, {color: '#f7a680'}]}>{pendingDrivers.length}</Text>
            </View>
            <FlatList
              data={filteredPendingDrivers}
              renderItem={renderDriverItem}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyListText}>No pending driver requests.</Text>}
              scrollEnabled={false}
            />
          </ScrollView>
        );
      case 'gatecodes':
        return <GateCodes />;
      case 'chat':
        return (
          <ScrollView style={styles.chatSectionScrollView} contentContainerStyle={styles.chatSectionContentContainer}>
            <View style={styles.chatInfoSection}>
              <Text style={styles.chatInfoSectionTitle}>Safety Tips</Text>
              <Text style={styles.chatInfoSummaryText}>Total: {safetyTipsCount} tips available.</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => setIsSafetyTipModalVisible(true)}>
                <Text style={styles.viewAllButtonText}>View/Manage Safety Tips</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chatInfoSection}>
              <Text style={styles.chatInfoSectionTitle}>Company Notices</Text>
              <Text style={styles.chatInfoSummaryText}>Total: {noticesCount} notices published.</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => setIsNoticeModalVisible(true)}>
                <Text style={styles.viewAllButtonText}>View/Manage Notices</Text>
              </TouchableOpacity>
            </View>
            
            {(companyPlan === 'Professional' || companyPlan === 'Executive') && (
              <View style={styles.gridContainer}>
                {companyPlan === 'Executive' && (
                  <TouchableOpacity
                    style={[styles.gridButton, { backgroundColor: '#f7a680' }]} // Salmon
                    onPress={() => navigation.navigate('ManagePosts')}
                  >
                    <MaterialIcons name="post-add" size={30} color="#fff" />
                    <Text style={styles.gridButtonText}>Manage Posts</Text>
                  </TouchableOpacity>
                )}
                
                {companyPlan === 'Executive' && (
                  <TouchableOpacity
                    style={[styles.gridButton, { backgroundColor: '#336699' }]} // Darker Blue
                    onPress={() => navigation.navigate('Team')}
                  >
                    <Ionicons name="people-outline" size={30} color="#fff" />
                    <Text style={styles.gridButtonText}>Manage Team</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.gridButton, { backgroundColor: '#007a82' }]} // Teal
                  onPress={() => navigation.navigate('GroupChat')}
                >
                  <Ionicons name="people-circle-outline" size={30} color="#fff" />
                  <Text style={styles.gridButtonText}>Create Group Chat</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.gridButton, { backgroundColor: '#d1904c' }]} // Gold/Brown
                  onPress={() => navigation.navigate('OneChat')}
                >
                  <Ionicons name="chatbubbles-outline" size={30} color="#fff" />
                  <Text style={styles.gridButtonText}>Start One-on-One Chat</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        );
      case 'more':
        return (
          <ScrollView contentContainerStyle={styles.moreContentContainer}>
            {(companyPlan === 'Professional' || companyPlan === 'Executive') && (
              <>
                <View style={styles.moreOptionButton}>
                  <View style={styles.moreOptionTextContainer}>
                    <MaterialIcons name="chat" size={24} color="#007a82" />
                    <Text style={styles.moreOptionText}>Allow Chat</Text>
                  </View>
                  {settingsLoading ? (
                    <ActivityIndicator size="small" color="#007a82" />
                  ) : (
                    <Switch
                      onValueChange={toggleAllowChat}
                      value={allowChat}
                      // Jey: Updated track colors for professional look
                      trackColor={{ false: "#d9d9d9", true: "#007a82" }}
                      thumbColor={allowChat ? "#fff" : "#f4f3f4"}
                    />
                  )}
                </View>

                <View style={styles.moreOptionButton}>
                  <View style={styles.moreOptionTextContainer}>
                    <MaterialIcons name="post-add" size={24} color="#007a82" />
                    <Text style={styles.moreOptionText}>Allow Posts</Text>
                  </View>
                  {settingsLoading ? (
                    <ActivityIndicator size="small" color="#007a82" />
                  ) : (
                    <Switch
                      onValueChange={toggleAllowPosts}
                      value={allowPosts}
                      // Jey: Updated track colors for professional look
                      trackColor={{ false: "#d9d9d9", true: "#007a82" }}
                      thumbColor={allowPosts ? "#fff" : "#f4f3f4"}
                    />
                  )}
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.moreOptionButton}
              onPress={() => setIsNoticeModalVisible(true)}
            >
              <MaterialIcons name="announcement" size={24} color="#007a82" />
              <Text style={styles.moreOptionText}>Notices ({noticesCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreOptionButton}
              onPress={() => setIsSafetyTipModalVisible(true)}
            >
              <MaterialIcons name="security" size={24} color="#007a82" />
              <Text style={styles.moreOptionText}>Safety Tips ({safetyTipsCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreOptionButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialIcons name="settings" size={24} color="#007a82" />
              <Text style={styles.moreOptionText}>Settings</Text>
            </TouchableOpacity>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007a82" /> {/* Teal spinner */}
        <Text style={styles.loadingText}>Loading company data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Jey: REVISED PROFESSIONAL HEADER STRUCTURE */}
      <View style={styles.header}>
        <View style={styles.headerContentWrapper}>
          {/* Company Logo/Placeholder */}
          {companyLogoUrl ? (
            <Image source={{ uri: companyLogoUrl }} style={styles.companyLogo} />
          ) : userData?.profilePhotoURL ? (
            <Image source={{ uri: userData.profilePhotoURL }} style={styles.companyLogo} />
          ) : (
            <MaterialIcons name="business" size={30} color="#a0b8c8" style={styles.companyLogoPlaceholder} />
          )}

          {/* Title and Plan */}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {userData.dspName}
            </Text>
            <View style={styles.planBadge}>
              <Text style={styles.planLabel}>{companyPlan} Plan</Text>
            </View>
          </View>
        </View>

        {/* Refresh Button (always on the right) */}
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshIconContainer}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#007a82" />
          ) : (
            <Ionicons name="refresh" size={24} color="#007a82" />
          )}
        </TouchableOpacity>
      </View>
      {/* Jey: END REVISED HEADER */}

      <View style={styles.tabContainer}>
        {['drivers', 'requests', 'gatecodes', 'chat', 'more'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <MaterialIcons
              name={
                tab === 'drivers' ? 'people' :
                tab === 'requests' ? 'notifications' :
                tab === 'gatecodes' ? 'vpn-key' :
                tab === 'chat' ? 'chat' : 'more-horiz'
              }
              size={24}
              // Jey: Updated tab icon color to teal
              color={activeTab === tab ? '#007a82' : '#666'}
            />
            {/* Jey: Notification badge for the requests tab using salmon for warning */}
            {tab === 'requests' && pendingDrivers.length > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: '#f7a680' }]}>
                <Text style={styles.notificationText}>{pendingDrivers.length}</Text>
              </View>
            )}
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'more' ? 'More' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {multiSelectMode && (
        <View style={styles.multiSelectActionContainer}>
          <TouchableOpacity style={styles.multiSelectButton} onPress={toggleSelectAll}>
            <Text style={styles.multiSelectButtonText}>
              {selectedDrivers.size === filteredDrivers.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            // Jey: Updated confirmation button to the primary teal accent color
            style={[styles.multiSelectButton, styles.confirmButton, selectedDrivers.size === 0 && styles.disabledButton]}
            onPress={handleMultiSelectOnDuty}
            disabled={selectedDrivers.size === 0}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={[styles.multiSelectButtonText, {marginLeft: 5, color: '#fff'}]}>Mark {selectedDrivers.size} On-Duty</Text>
          </TouchableOpacity>
        </View>
      )}

      <NoticeModal
        isVisible={isNoticeModalVisible}
        onClose={() => setIsNoticeModalVisible(false)}
        initialNotices={initialNotices}
        onNoticesUpdated={handleNoticesUpdated}
      />

      <SafetyTipsModal
        isVisible={isSafetyTipModalVisible}
        onClose={() => setIsSafetyTipModalVisible(false)}
        initialSafetyTips={initialSafetyTips}
        onSafetyTipsUpdated={handleSafetyTipsUpdated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Jey: --- Global Container ---
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4', // Lighter, more professional background
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  // Jey: --- REVISED PROFESSIONAL HEADER STYLES ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  headerContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 8, // Corporate square logo
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  companyLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9e9e9',
  },
  headerTitleContainer: {
    marginLeft: 12,
    flex: 1, // Allows title to take up remaining space
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 2,
  },
  planBadge: {
    backgroundColor: '#e6f7f8', // Light Teal background
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start', // Important to wrap content horizontally
  },
  planLabel: {
    fontSize: 12,
    color: '#007a82', // Teal text
    fontWeight: '600',
  },
  refreshIconContainer: {
    padding: 8,
    marginLeft: 15,
  },
  // Jey: --- END REVISED HEADER STYLES ---

  // Jey: --- Tab Bar ---
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 3, // Thicker underline for emphasis
    borderBottomColor: '#007a82', // Teal accent
  },
  tabText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  activeTabText: {
    color: '#007a82', // Teal accent
    fontWeight: '700',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 25,
    backgroundColor: '#f7a680', // Professional Salmon/Orange for warnings
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  scrollContentContainer: {
    paddingBottom: 20,
    paddingTop: 10,
  },

  // Jey: --- Search and Stats ---
  searchBar: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#ffffff', // White search bar
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, // Lighter shadow for premium look
    shadowRadius: 6,
    elevation: 3,
  },
  statsCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsTitle: {
    fontSize: 16,
    color: '#555555',
  },
  statsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007a82', // Teal accent for primary count
    marginTop: 4,
  },
  onDutyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007a82', // Teal background
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  onDutyTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  onDutyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007a82', // Teal button
    borderRadius: 8,
    paddingVertical: 12,
  },
  onDutyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  
  // Jey: --- Driver List Items ---
  selectDriversButton: {
    backgroundColor: '#e6f7f8', // Light teal background
    borderColor: '#007a82',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  selectDriversButtonText: {
    color: '#007a82', // Teal text
    fontWeight: 'bold',
    fontSize: 14,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4, // Visual weight
    borderLeftColor: '#e0e0e0', // Neutral color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, // Very subtle lift
    shadowRadius: 2,
    elevation: 1,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  driverProfilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  driverProfilePhotoPlaceholder: {
    marginRight: 10,
  },
  nameAndRole: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 16,
    flexShrink: 1,
    marginRight: 5,
  },
  roleTag: {
    backgroundColor: '#555', // Neutral dark gray for Trainer
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 10,
    backgroundColor: '#e6f7f8', // Light teal background
  },
  activeActionBtn: {
    backgroundColor: '#007a82', // Teal
  },
  deactivateBtn: {
    backgroundColor: '#f7a680', // Professional Salmon/Orange for danger/removal
  },
  activateBtn: {
    backgroundColor: '#007a82', // Teal for activation
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },

  // Jey: --- Multi-Select ---
  checkboxContainer: {
    marginRight: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiSelectActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  multiSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e6f7f8', // Light teal for secondary action
  },
  multiSelectButtonText: {
    color: '#007a82', // Teal text
    fontWeight: 'bold',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#007a82', // Teal for primary action
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },

  // Jey: --- Chat/More Sections ---
  chatSectionScrollView: {
    flex: 1,
  },
  chatSectionContentContainer: {
    padding: 0, // Padding is handled by content
    paddingBottom: 20,
  },
  chatInfoSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chatInfoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
    textAlign: 'center',
  },
  chatInfoSummaryText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  viewAllButton: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: '#e6f7f8',
    borderRadius: 5,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#007a82',
    fontWeight: 'bold',
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 15,
  },
  gridButton: {
    width: '48%',
    borderRadius: 10,
    paddingVertical: 20,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gridButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  moreContentContainer: {
    padding: 0, // Padding is handled by content
    paddingBottom: 20,
  },
  moreOptionButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  moreOptionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moreOptionText: {
    marginLeft: 15,
    fontSize: 17,
    fontWeight: '500', // Slightly lighter weight for better readability
    color: '#333',
  },
});

export default CompanyScreen;