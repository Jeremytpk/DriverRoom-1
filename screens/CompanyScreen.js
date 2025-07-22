import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, Image } from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore'; // Jey: Added deleteDoc

// Jey: Import the new modal components
import NoticeModal from '../components/Notice'; // Adjust path as needed
import SafetyTipsModal from '../components/SafetyTips'; // Adjust path as needed

const CompanyScreen = ({ navigation }) => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [gateCodes, setGateCodes] = useState([]);

  // Jey: States for notices and safety tips (now for initial display and counts)
  const [noticesCount, setNoticesCount] = useState(0);
  const [safetyTipsCount, setSafetyTipsCount] = useState(0);
  const [initialNotices, setInitialNotices] = useState([]);
  const [initialSafetyTips, setInitialSafetyTips] = useState([]);


  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Jey: New state to control visibility of external modals
  const [isNoticeModalVisible, setIsNoticeModalVisible] = useState(false);
  const [isSafetyTipModalVisible, setIsSafetyTipModalVisible] = useState(false);


  // Function to fetch all company-related data
  const fetchCompanyData = async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      if (!userData?.uid || !userData?.dspName) {
        console.warn("Jey: User data (UID or dspName) not available to fetch company data.");
        return;
      }

      // Fetch drivers
      const driversQuery = query(
        collection(db, 'users'),
        where('dspName', '==', userData.dspName),
        where('role', '==', 'driver')
      );
      const driversSnapshot = await getDocs(driversQuery);
      const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setDrivers(driversData.filter(d => d.activated));
      setPendingDrivers(driversData.filter(d => !d.activated));

      // Fetch gate codes
      const codesQuery = query(
        collection(db, 'gateCodes'),
        where('companyId', '==', userData.uid)
      );
      const codesSnapshot = await getDocs(codesQuery);
      setGateCodes(codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Jey: Fetch Notices for initial count and pass to modal
      const noticesQuery = query(
        collection(db, 'notices_by_dsp', userData.dspName, 'items'),
        orderBy('createdAt', 'desc')
      );
      const noticesSnapshot = await getDocs(noticesQuery);
      const fetchedNotices = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNoticesCount(fetchedNotices.length);
      setInitialNotices(fetchedNotices); // Store initial fetched data

      // Jey: Fetch Safety Tips for initial count and pass to modal
      const safetyTipsQuery = query(
        collection(db, 'safetyTips_by_dsp', userData.dspName, 'items'),
        orderBy('createdAt', 'desc')
      );
      const safetyTipsSnapshot = await getDocs(safetyTipsQuery);
      const fetchedSafetyTips = safetyTipsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSafetyTipsCount(fetchedSafetyTips.length);
      setInitialSafetyTips(fetchedSafetyTips); // Store initial fetched data

      // Jey: Fetch App Information (still here as it's not a modal content)
      const appInfoQuery = query(
        collection(db, 'appInfo'),
        orderBy('createdAt', 'desc')
      );
      const appInfoSnapshot = await getDocs(appInfoQuery);
      // setAppInfo(appInfoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); // Uncomment if AppInfo is implemented

    } catch (error) {
      console.error("Jey: Error fetching company data:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [userData]);

  // Jey: Callbacks to update counts from the modal components
  const handleNoticesUpdated = (updatedNotices) => {
    setNoticesCount(updatedNotices.length);
    setInitialNotices(updatedNotices); // Keep initial data in sync
  };

  const handleSafetyTipsUpdated = (updatedTips) => {
    setSafetyTipsCount(updatedTips.length);
    setInitialSafetyTips(updatedTips); // Keep initial data in sync
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

  // Jey: New function to handle gate code deletion
  const handleDeleteGateCode = async (codeId) => {
    Alert.alert(
      "Delete Gate Code",
      "Are you sure you want to delete this gate code?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'gateCodes', codeId));
              setGateCodes(prev => prev.filter(code => code.id !== codeId));
              Alert.alert("Success", "Gate code deleted successfully!");
            } catch (error) {
              console.error("Jey: Error deleting gate code:", error);
              Alert.alert("Error", "Failed to delete gate code. Please try again.");
            }
          }
        }
      ],
      { cancelable: true }
    );
  };


  const renderDriverItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.driverInfo}>
        {item.profilePhotoURL ? (
          <Image source={{ uri: item.profilePhotoURL }} style={styles.driverProfilePhoto} />
        ) : (
          <FontAwesome name="user-circle" size={30} color="#6BB9F0" style={styles.driverProfilePhotoPlaceholder} />
        )}
        <Text style={styles.driverName}>{item.name}</Text>
        {item.activated ? (
          <MaterialIcons name="verified" size={20} color="green" />
        ) : (
          <MaterialIcons name="pending" size={20} color="orange" />
        )}
      </View>
      {!item.activated && (
        <TouchableOpacity
          style={styles.activateBtn}
          onPress={() => handleActivation(item.id, true)}
        >
          <Text style={styles.btnText}>Activate</Text>
        </TouchableOpacity>
      )}
      {item.activated && (
        <TouchableOpacity
          style={[styles.activateBtn, styles.deactivateBtn]}
          onPress={() => handleActivation(item.id, false)}
        >
          <Text style={styles.btnText}>Deactivate</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'drivers':
        return (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Total Active Drivers</Text>
              <Text style={styles.statsValue}>{drivers.length}</Text>
            </View>
            <FlatList
              data={drivers}
              renderItem={renderDriverItem}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyListText}>No active drivers found.</Text>}
              contentContainerStyle={styles.listContentContainer}
            />
          </>
        );
      case 'requests':
        return (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Pending Approvals</Text>
              <Text style={styles.statsValue}>{pendingDrivers.length}</Text>
            </View>
            <FlatList
              data={pendingDrivers}
              renderItem={renderDriverItem}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyListText}>No pending driver requests.</Text>}
              contentContainerStyle={styles.listContentContainer}
            />
          </>
        );
      case 'gatecodes':
        return (
          <>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddGateCode')}
            >
              <Text style={styles.addBtnText}>+ Add New Gate Code</Text>
            </TouchableOpacity>
            <FlatList
              data={gateCodes}
              renderItem={({ item }) => (
                <View style={styles.codeItem}>
                  <View> {/* Jey: Added a View to group text elements */}
                    <Text style={styles.codeText}>{item.code}</Text>
                    <Text style={styles.codeLocation}>{item.location}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteGateCode(item.id)}
                    style={styles.deleteIcon}
                  >
                    <MaterialIcons name="delete" size={24} color="#FF5733" />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyListText}>No gate codes added yet.</Text>}
              contentContainerStyle={styles.listContentContainer}
            />
          </>
        );
      case 'chat':
        return (
          <ScrollView style={styles.chatSectionScrollView} contentContainerStyle={styles.chatSectionContentContainer}>
            {/* Jey: Safety Tips Section - simplified display */}
            <View style={styles.chatInfoSection}>
              <Text style={styles.chatInfoSectionTitle}>Safety Tips</Text>
              <Text style={styles.chatInfoSummaryText}>Total: {safetyTipsCount} tips available.</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => setIsSafetyTipModalVisible(true)}>
                <Text style={styles.viewAllButtonText}>View/Manage Safety Tips</Text>
              </TouchableOpacity>
            </View>

            {/* Jey: Notices Section - simplified display */}
            <View style={styles.chatInfoSection}>
              <Text style={styles.chatInfoSectionTitle}>Company Notices</Text>
              <Text style={styles.chatInfoSummaryText}>Total: {noticesCount} notices published.</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => setIsNoticeModalVisible(true)}>
                <Text style={styles.viewAllButtonText}>View/Manage Notices</Text>
              </TouchableOpacity>
            </View>

            {/* Jey: Chat Buttons */}
            <View style={styles.chatButtonsContainer}>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => navigation.navigate('GroupChat')}
              >
                <Ionicons name="people-circle-outline" size={30} color="#fff" />
                <Text style={styles.chatButtonText}>Create Group Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => navigation.navigate('OneChat')}
              >
                <Ionicons name="chatbubbles-outline" size={30} color="#fff" />
                <Text style={styles.chatButtonText}>Start One-on-One Chat</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      case 'more':
        return (
          <ScrollView contentContainerStyle={styles.moreContentContainer}>
            <TouchableOpacity
              style={styles.moreOptionButton}
              onPress={() => setIsNoticeModalVisible(true)} // Jey: Open the Notice modal
            >
              <MaterialIcons name="announcement" size={24} color="#6BB9F0" />
              <Text style={styles.moreOptionText}>Notices ({noticesCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreOptionButton}
              onPress={() => setIsSafetyTipModalVisible(true)} // Jey: Open the Safety Tips modal
            >
              <MaterialIcons name="security" size={24} color="#6BB9F0" />
              <Text style={styles.moreOptionText}>Safety Tips ({safetyTipsCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreOptionButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialIcons name="settings" size={24} color="#6BB9F0" />
              <Text style={styles.moreOptionText}>Company Settings</Text>
            </TouchableOpacity>

            {/* App Information Section */}
            {/* <View style={styles.appInfoSection}>
              <Text style={styles.appInfoSectionTitle}>App Information & Updates</Text>
              <FlatList
                data={appInfo}
                renderItem={({ item }) => renderContentItem({ item, collectionName: 'appInfo' })}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.emptyListText}>No app updates available.</Text>}
                scrollEnabled={false}
              />
            </View> */}
          </ScrollView>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6BB9F0" />
        <Text style={styles.loadingText}>Loading company data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {userData?.profilePhotoURL ? (
          <Image source={{ uri: userData.profilePhotoURL }} style={styles.companyLogo} />
        ) : (
          <MaterialIcons name="business" size={30} color="#6BB9F0" style={styles.companyLogoPlaceholder} />
        )}
        <Text style={styles.headerTitle}>{userData.dspName} Dashboard</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshIconContainer}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#6BB9F0" />
          ) : (
            <Ionicons name="refresh" size={24} color="#6BB9F0" />
          )}
        </TouchableOpacity>
      </View>

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
              color={activeTab === tab ? '#FF9AA2' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabText]}>
              {tab === 'more' ? 'More' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Jey: Render the extracted Notice and Safety Tips Modals */}
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6BB9F0',
    flex: 1,
    marginLeft: 10,
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  companyLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
  listContentContainer: {
    paddingBottom: 20,
  },
  statsCard: {
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
  statsTitle: {
    fontSize: 16,
    color: '#666',
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6BB9F0',
    marginTop: 5,
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
    flexShrink: 1,
  },
  driverProfilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  driverProfilePhotoPlaceholder: {
    marginRight: 10,
  },
  driverName: {
    fontSize: 16,
    flexShrink: 1,
    marginRight: 5,
  },
  activateBtn: {
    backgroundColor: '#6BB9F0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  deactivateBtn: {
    backgroundColor: '#FF5733',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  codeItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row', // Jey: Add flexDirection to align items horizontally
    justifyContent: 'space-between', // Jey: Distribute space between code info and delete icon
    alignItems: 'center', // Jey: Vertically align items
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  codeLocation: {
    color: '#666',
    marginTop: 5,
  },
  // Jey: New style for the delete icon button
  deleteIcon: {
    padding: 5, // Add some padding for easier tapping
  },
  addBtn: {
    backgroundColor: '#FF9AA2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chatSectionScrollView: {
    flex: 1,
  },
  chatSectionContentContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  chatInfoSection: {
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
  chatInfoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6BB9F0',
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
    backgroundColor: '#E0F2F7',
    borderRadius: 5,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#6BB9F0',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatButtonsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  chatButton: {
    backgroundColor: '#FF9AA2',
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  moreContentContainer: {
    paddingBottom: 20,
  },
  moreOptionButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  moreOptionText: {
    marginLeft: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  appInfoSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appInfoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6BB9F0',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default CompanyScreen;