import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
  ScrollView, Dimensions, Modal, Platform, RefreshControl, Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Jey: Keep MaterialIcons for Admin/Company tabs
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import GroupChat from './Chat/GroupChat';
import GroupConversation from './Chat/GroupConversation';
import OneChat from './Chat/OneChat';
import OneConversation from './Chat/OneConversation';
import NewChatModal from '../screens/Chat/NewChatModal';
import GateCodes from './GateCodes/GateCodes';
import { doc, getDoc, getFirestore, collection, getDocs, orderBy, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import OffDutty from '../screens/OffDutty';

const Stack = createStackNavigator();

const Colors = {
  primaryTeal: '#008080',
  accentSalmon: '#FA8072',
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
  lightGray: '#ececec',
  border: '#e0e0e0',
  inactiveGray: '#A0A0A0',
};

const { width: screenWidth } = Dimensions.get('window');

// --- Extracted DriverProfileHeader Component ---
const DriverProfileHeader = ({ userData }) => (
  <View style={styles.driverProfileSection}>
    <View style={styles.avatarContainer}>
      {userData?.profilePictureUrl ? (
        <Image source={{ uri: userData.profilePictureUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          {/* Jey: Replaced Ionicons with profile.png */}
          <Image source={require('../assets/png/profile.png')} style={[styles.profilePng, { tintColor: Colors.white }]} />
        </View>
      )}
    </View>
    <Text style={styles.profileName}>{userData?.name || 'Driver'}</Text>
    {userData?.role === 'driver' && (
      <View style={styles.driverInfo}>
        {/* Jey: Replaced driver.png with business_outline.png */}
        <Image
          source={require('../assets/png/business_outline.png')}
          style={[styles.businessOutlinePng, { tintColor: Colors.mediumText }]}
        />
        <Text style={styles.dspName}>{userData?.dspName || 'Your DSP'}</Text>
      </View>
    )}
  </View>
);

const HomeScreen = ({ navigation }) => {
  const { userData, unreadCounts, setUserData } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [safetyTips, setSafetyTips] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const scrollViewRef = useRef(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const autoScrollIntervalRef = useRef(null);
  const [isSwipingForward, setIsSwipingForward] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentNavigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState('HomeTab');

  useEffect(() => {
    const currentRouteName = route.name;

    if (currentRouteName === 'HomeScreenContent') {
      setActiveTab('HomeTab');
    } else if (currentRouteName === 'Posts') {
      setActiveTab('PostsTab');
    } else if (currentRouteName === 'AdminTab') {
      setActiveTab('AdminTab');
    } else if (currentRouteName === 'CompanyTab') {
      setActiveTab('CompanyTab');
    } else if (currentRouteName === 'Settings') {
      setActiveTab('SettingsTab');
    }
  }, [route.name]);

  useEffect(() => {
    if (!userData?.uid) return;

    const db = getFirestore();
    const userRef = doc(db, 'users', userData.uid);

    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const updatedUserData = docSnapshot.data();
        setUserData(prevUserData => ({
          ...prevUserData,
          allowChat: updatedUserData.allowChat ?? true,
          allowPosts: updatedUserData.allowPosts ?? true
        }));
      }
    }, (error) => {
      console.error("Jey: Error listening to user document:", error);
    });

    return () => unsubscribe();
  }, [userData?.uid, setUserData]);

  const startAutoScroll = () => {
    clearInterval(autoScrollIntervalRef.current);
    if (safetyTips.length > 1) {
      autoScrollIntervalRef.current = setInterval(() => {
        setCurrentTipIndex((prevIndex) => {
          let currentDirection = isSwipingForward;

          let nextIndex = prevIndex;
          let newDirection = currentDirection;

          if (currentDirection) {
            if (prevIndex === safetyTips.length - 1) {
              newDirection = false;
              nextIndex = prevIndex - 1;
            } else {
              nextIndex = prevIndex + 1;
            }
          } else {
            if (prevIndex === 0) {
              newDirection = true;
              nextIndex = prevIndex + 1;
            } else {
              nextIndex = prevIndex - 1;
            }
          }

          if (newDirection !== currentDirection) {
              setIsSwipingForward(newDirection);
          }

          scrollViewRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
          return nextIndex;
        });
      }, 4000);
    }
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoadingTips(true);
      setLoadingNotices(true);
      try {
        const db = getFirestore();
        if (!userData?.dspName) {
            console.warn("Jey: HomeScreen - userData.dspName is not available. Cannot fetch data.");
            setSafetyTips([]);
            setNotices([]);
            setLoadingTips(false);
            setLoadingNotices(false);
            return;
        }

        const safetyCollectionRef = collection(db, 'safetyTips_by_dsp', userData.dspName, 'items');
        const safetyQuery = query(safetyCollectionRef, orderBy('createdAt', 'desc'));
        const safetySnapshot = await getDocs(safetyQuery);
        const tips = safetySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSafetyTips(tips);
        setLoadingTips(false);

        const noticesCollectionRef = collection(db, 'notices_by_dsp', userData.dspName, 'items');
        const noticesQuery = query(noticesCollectionRef, orderBy('createdAt', 'desc'));
        const noticesSnapshot = await getDocs(noticesQuery);
        const fetchedNotices = noticesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotices(fetchedNotices);
        setLoadingNotices(false);

      } catch (error) {
        console.error("Jey: Error fetching home screen data:", error);
        Alert.alert("Error", "Failed to load home screen data. Please try again.");
      } finally {
        setLoadingTips(false);
        setLoadingNotices(false);
      }
    };

    fetchHomeData();
  }, [userData?.dspName]);

  useEffect(() => {
    setIsSwipingForward(true);
    if (safetyTips.length > 0) {
      startAutoScroll();
    } else {
      clearInterval(autoScrollIntervalRef.current);
    }
    return () => clearInterval(autoScrollIntervalRef.current);
  }, [safetyTips.length]);

  const handleScrollEnd = (event) => {
    const newIndex = Math.floor(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentTipIndex(newIndex);
    setIsSwipingForward(true);
    startAutoScroll();
  };

  const handlePullToRefresh = () => {
    setIsRefreshing(true);
    if (userData?.uid) {
      const db = getFirestore();
      const userRef = doc(db, 'users', userData.uid);

      getDoc(userRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            const updatedUserData = docSnap.data();
            if (updatedUserData.role === 'driver' && !updatedUserData.isOnDutty) {
              navigation.replace('OffDutty');
            } else {
            }
          } else {
            console.warn("Jey: User document not found during refresh.");
          }
        })
        .catch(error => {
          console.error("Jey: Error checking status on refresh:", error);
          Alert.alert("Error", "Failed to refresh status. Please try again.");
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    } else {
      setIsRefreshing(false);
      console.warn("Jey: No user UID available to refresh status.");
    }
  };

  const handleTabPress = (tabName) => {
    if (tabName === activeTab) {
      if (tabName === 'HomeTab') {
        navigation.popToTop();
      }
      return;
    }

    setActiveTab(tabName);

    let screenNameToNavigate = '';
    switch (tabName) {
      case 'HomeTab':
        screenNameToNavigate = 'HomeScreenContent';
        break;
      case 'PostsTab':
        screenNameToNavigate = 'Posts';
        break;
      case 'AdminTab':
        screenNameToNavigate = 'AdminTab';
        break;
      case 'CompanyTab':
        screenNameToNavigate = 'CompanyTab';
        break;
      case 'SettingsTab':
        screenNameToNavigate = 'Settings';
        break;
      default:
        screenNameToNavigate = 'HomeScreenContent';
    }

    if (currentNavigation.getParent()) {
      currentNavigation.getParent().navigate(screenNameToNavigate);
    } else {
      console.warn(`Jey: Could not navigate to tab '${screenNameToNavigate}' via parent. Attempting direct navigation within current stack.`);
      navigation.navigate(screenNameToNavigate);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullToRefresh}
            tintColor={Colors.primaryTeal}
          />
        }
      >
        {loadingTips ? (
          <View style={styles.centralCardLoading}>
            <ActivityIndicator size="large" color={Colors.primaryTeal} />
          </View>
        ) : safetyTips.length > 0 ? (
          <View style={styles.centralCard}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={() => clearInterval(autoScrollIntervalRef.current)}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEventThrottle={16}
              contentContainerStyle={styles.swiperContentContainer}
            >
              {safetyTips.map((tip, index) => (
                <LinearGradient
                  key={tip.id}
                  colors={[Colors.primaryTeal, Colors.accentSalmon]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.swiperSlide, { width: screenWidth - 40 }]}
                >
                  <View style={styles.tipContentWrapper}>
                    {tip.imageUrl && (
                      <Image source={{ uri: tip.imageUrl }} style={styles.tipImage} />
                    )}
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipMessage}>{tip.message}</Text>
                  </View>
                </LinearGradient>
              ))}
            </ScrollView>
            <View style={styles.pagination}>
              {safetyTips.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentTipIndex ? styles.activeDot : null,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.centralCardNoTips}>
            <Image
              source={require('../assets/noSafety.png')}
              style={styles.noSafetyImage}
            />
            <Text style={styles.noSafetyText}>No safety tips for today.</Text>
          </View>
        )}

        {loadingNotices ? (
          <View style={styles.noticesCardLoading}>
            <ActivityIndicator size="large" color={Colors.primaryTeal} />
          </View>
        ) : notices.length > 0 ? (
          notices.map((notice, index) => (
            <View key={notice.id} style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                {/* Jey: Replaced Ionicons with Image for notices, tinted white for visibility on orange background */}
                <Image
                  source={require('../assets/png/infos.png')}
                  style={[styles.iconPng, { tintColor: Colors.white }]}
                />
                <Text style={styles.noticeTitle}>{notice.title}</Text>
              </View>
              <Text style={styles.noticeMessage}>{notice.message}</Text>
              {index < notices.length - 1 && <View style={styles.noticeDivider} />}
            </View>
          ))
        ) : (
          // Jey: ✨ Conditionally render this block only if notices.length is 0
          <View style={styles.noticesCardNoNotices}>
            {/* Jey: Replaced Ionicons with Image for no notices, tinted inactiveGray */}
            <Image
              source={require('../assets/png/infos.png')}
              style={[styles.iconPng, { tintColor: Colors.inactiveGray }]}
            />
            <Text style={styles.noNoticesText}>No new notices from your DSP.</Text>
          </View>
        )}

        {userData?.allowChat && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('GroupChat')}
            >
              {/* Jey: Replaced Ionicons with Image for Group Chats, tinted primaryTeal */}
              <Image
                source={require('../assets/png/users.png')}
                style={[styles.iconPng, { tintColor: Colors.primaryTeal }]}
              />
              <Text style={styles.buttonText}>Group Chats</Text>
              {unreadCounts.group > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCounts.group}</Text>
                </View>
              ) : (
                <Ionicons name="add" size={20} color={Colors.accentSalmon} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('OneChat')}
            >
              {/* Jey: Replaced Ionicons with Image for Direct Messages, tinted primaryTeal */}
              <Image
                source={require('../assets/png/user.png')}
                style={[styles.iconPng, { tintColor: Colors.primaryTeal }]}
              />
              <Text style={styles.buttonText}>Direct Messages</Text>
              {unreadCounts.one > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCounts.one}</Text>
                </View>
              ) : (
                <Ionicons name="add" size={20} color={Colors.accentSalmon} />
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.importantButton]}
            onPress={() => navigation.navigate('GateCodes')}
          >
            {/* Jey: Replaced Ionicons with Image for Gate Codes, tinted white */}
            <Image
              source={require('../assets/png/key.png')}
              style={[styles.iconPng, { tintColor: Colors.white }]}
            />
            <Text style={[styles.buttonText, styles.importantButtonText]}>Gate Codes</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      <View style={styles.toggleButtonContainer}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleTabPress('HomeTab')}
        >
          {/* Jey: Replaced Ionicons with Image for Home tab, tinted dynamically */}
          <Image
            source={require('../assets/png/home.png')}
            style={[
              styles.bottomTabIconPng,
              { tintColor: activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          />
          <Text
            style={[
              styles.toggleButtonText,
              { color: activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {userData?.allowPosts && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('PostsTab')}
          >
            {/* Jey: Replaced Ionicons with Image for Posts tab, tinted dynamically */}
            <Image
              source={require('../assets/png/post.png')}
              style={[
                styles.bottomTabIconPng,
                { tintColor: activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            />
            <Text
            style={[
                styles.toggleButtonText,
                { color: activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>
        )}

        {userData?.role === 'admin' && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('AdminTab')}
          >
            {/* Jey: Keeping MaterialIcons as no PNG was provided */}
            <MaterialIcons
              name="admin-panel-settings"
              size={20}
              color={activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'AdminTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Admin
            </Text>
          </TouchableOpacity>
        )}

        {userData?.role === 'company' && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('CompanyTab')}
          >
            {/* Jey: Keeping MaterialIcons as no PNG was provided */}
            <MaterialIcons
              name="business"
              size={20}
              color={activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray}
            />
            <Text
              style={[
                styles.toggleButtonText,
                { color: activeTab === 'CompanyTab' ? Colors.primaryTeal : Colors.inactiveGray }
              ]}
            >
              Company
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleTabPress('SettingsTab')}
        >
          {/* Jey: Replaced Ionicons with Image for Settings tab, tinted dynamically */}
          <Image
            source={require('../assets/png/settings.png')}
            style={[
              styles.bottomTabIconPng,
              { tintColor: activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          />
          <Text
            style={[
              styles.toggleButtonText,
              { color: activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <NewChatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        navigation={navigation}
      />
    </View>
  );
};

const PendingApprovalScreen = ({ navigation }) => {
  const { currentUser, setUserData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const internalNavigation = useNavigation();

  const checkApprovalStatus = async () => {
    if (!currentUser?.uid) return;

    setRefreshing(true);
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserData(userData);

        if (userData.activated) {
          internalNavigation.navigate('HomeScreenContent');
          return;
        }
      }
      setLastChecked(new Date());
    } catch (error) {
      console.error('Jey: Error checking approval:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkApprovalStatus();
      const interval = setInterval(checkApprovalStatus, 30000);
      return () => clearInterval(interval);
    }, [currentUser])
  );


  return (
    <View style={styles.pendingContainer}>
      <Text style={styles.pendingTitle}>Account Pending Approval</Text>
      <Ionicons name="hourglass-outline" size={80} color={Colors.primaryTeal} style={styles.pendingIcon} />
      <Text style={styles.pendingMessage}>
        Thank you for registering! Your account is currently pending approval
        from your DSP or Company.
      </Text>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={checkApprovalStatus}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={Colors.primaryTeal} />
        ) : (
          <>
            <Ionicons name="refresh" size={20} color={Colors.primaryTeal} />
            <Text style={styles.refreshText}>Check Approval Status</Text>
          </>
        )}
      </TouchableOpacity>

      {lastChecked && (
        <Text style={styles.lastChecked}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const HomeWrapper = () => {
  const { userData, loading } = useAuth();
  const navigation = useNavigation();
  const [localIsOnDutyStatus, setLocalIsOnDutyStatus] = useState(false);

  // Jey: useRef to store the timer ID for the fixed 1-minute timeout
  const fixedTimerRef = useRef(null);
  
  // Jey: Function to update the isOnDutty status in Firestore
  const updateIsOnDuttyStatus = async (status) => {
    if (userData?.uid && userData?.role === 'driver') {
      const db = getFirestore();
      const userRef = doc(db, 'users', userData.uid);
      try {
        await updateDoc(userRef, { isOnDutty: status });
        console.log(`Jey: Driver status updated to ${status}.`);
      } catch (error) {
        console.error("Jey: Error updating isOnDutty status:", error);
      }
    }
  };
  
  // Jey: This useEffect hook now handles the onSnapshot listener and the new timer logic
  useEffect(() => {
    if (!userData?.uid || userData?.role !== 'driver') {
      setLocalIsOnDutyStatus(false);
      // Jey: Clean up timer if role is not a driver or no UID exists
      if (fixedTimerRef.current) {
        clearTimeout(fixedTimerRef.current);
      }
      return;
    }

    const db = getFirestore();
    const userRef = doc(db, 'users', userData.uid);

    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocalIsOnDutyStatus(data.isOnDutty || false);

        // Jey: New logic: if the driver is on-duty, start a new timer
        if (data.isOnDutty) {
          // Jey: Clear any existing timer to prevent multiple timers from running
          if (fixedTimerRef.current) {
            clearTimeout(fixedTimerRef.current);
          }
          // Jey: Set a new timer for 1 minute (60,000 milliseconds)
          fixedTimerRef.current = setTimeout(() => {
            console.log('Jey: 1 minute has passed. Setting driver to off-duty automatically.');
            updateIsOnDuttyStatus(false);
          }, 600000);
        } else {
          // Jey: If the driver is off-duty, clear the timer just in case
          if (fixedTimerRef.current) {
            clearTimeout(fixedTimerRef.current);
          }
        }
      } else {
        console.warn("Jey: User document not found during isOnDutty listener for UID:", userData.uid);
        setLocalIsOnDutyStatus(false);
      }
    }, (error) => {
      console.error("Jey: Error listening to driver's isOnDutty status:", error);
      setLocalIsOnDutyStatus(false);
    });

    // Jey: Clean up the Firestore listener and the timer on component unmount
    return () => {
      unsubscribe();
      if (fixedTimerRef.current) {
        clearTimeout(fixedTimerRef.current);
      }
    };
  }, [userData?.uid, userData?.role]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryTeal} />
      </View>
    );
  }

  if (userData?.role === 'driver' && !userData?.activated) {
    return <PendingApprovalScreen />;
  }

  if (userData?.role === 'driver' && userData?.activated && !localIsOnDutyStatus) {
    return <OffDutty />;
  }

  // Jey: Removed the onResponderGrant prop since we no longer need to track user interaction
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: styles.headerStyle,
          headerTitleStyle: styles.headerTitleStyle,
          headerTintColor: Colors.darkText,
          headerTitleAlign: 'center',
          headerBackVisible: true,
        }}
      >
        <Stack.Screen
          name="HomeScreenContent"
          component={HomeScreen}
          options={{
            headerShown: true,
            header: () => <DriverProfileHeader userData={userData} />,
          }}
        />
        <Stack.Screen
          name="GroupChat"
          component={GroupChat}
          options={{ title: 'Group Chats' }}
        />
        <Stack.Screen
          name="OneChat"
          component={OneChat}
          options={{ title: 'Direct Messages' }}
        />
        <Stack.Screen
          name="GateCodes"
          component={GateCodes}
          options={{ title: 'Gate Codes' }}
        />
        <Stack.Screen
          name="GroupConversation"
          component={GroupConversation}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="OneConversation"
          component={OneConversation}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
    paddingTop: 25,
    alignItems: 'center',
  },
  scrollViewContent: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 80,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: Colors.lightBackground,
  },
  headerStyle: {
    backgroundColor: Colors.white,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitleStyle: {
    fontWeight: 'bold',
    color: Colors.darkText,
    fontSize: 18,
  },
  driverProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    top: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Jey: New style for profile.png
  profilePng: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    flex: 1,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Jey: New style for business_outline.png
  businessOutlinePng: {
    width: 20,
    height: 20,
    marginRight: 8,
    resizeMode: 'contain',
  },
  dspName: {
    fontSize: 12,
    color: Colors.mediumText,
    fontWeight: '500',
  },
  centralCard: {
    width: screenWidth - 40,
    height: 180,
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  centralCardLoading: {
    width: screenWidth - 40,
    height: 150,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  centralCardNoTips: {
    width: screenWidth - 40,
    height: 180,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: Colors.white,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  swiperContentContainer: {
  },
  swiperSlide: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderRadius: 15,
    padding: 15,
  },
  tipContentWrapper: {
    flex: 1,
    width: '100%',
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: 'cover',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    flex: 1,
  },
  tipMessage: {
    fontSize: 14,
    color: Colors.white,
    lineHeight: 20,
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
  },
  noticesCardLoading: {
    width: screenWidth - 40,
    height: 150,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  noticesCardNoNotices: {
    width: screenWidth - 40,
    height: 150,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: Colors.white,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  noNoticesText: {
    fontSize: 16,
    color: Colors.mediumText,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 10,
  },
  noticeCard: {
    width: screenWidth - 40,
    backgroundColor: 'orange',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  noticeMessage: {
    fontSize: 14,
    color: Colors.mediumText,
    lineHeight: 20,
  },
  noticeDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 15,
  },
  noSafetyImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    tintColor: Colors.inactiveGray,
    marginBottom: 10,
  },
  noSafetyText: {
    fontSize: 16,
    color: Colors.mediumText,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginVertical: 8,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  importantButton: {
    backgroundColor: Colors.accentSalmon,
  },
  importantButtonText: {
    color: Colors.white,
  },
  // Jey: ✨ New style for PNG icons in buttons
  iconPng: {
    width: 24,
    height: 24,
    marginRight: 15,
    resizeMode: 'contain',
  },
  buttonText: {
    flex: 1,
    color: Colors.darkText,
    fontWeight: '600',
    fontSize: 16,
  },
  startNewChatButtonGradient: {
    width: '90%',
    borderRadius: 12,
    position: 'absolute',
    bottom: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  startNewChatButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  bottomChatButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  toggleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 0,
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 0,
  },
  // Jey: ✨ New style for PNG icons in bottom tabs
  bottomTabIconPng: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  pendingTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 25,
    textAlign: 'center',
  },
  pendingIcon: {
    marginBottom: 30,
    alignSelf: 'center',
  },
  pendingMessage: {
    fontSize: 16,
    color: Colors.mediumText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 15,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primaryTeal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  refreshText: {
    marginLeft: 10,
    color: Colors.primaryTeal,
    fontWeight: '600',
    fontSize: 15,
  },
  lastChecked: {
    marginTop: 20,
    fontSize: 13,
    color: Colors.mediumText,
  },
  badge: {
    backgroundColor: Colors.accentSalmon,
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeWrapper;
