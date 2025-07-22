import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
  ScrollView, Dimensions, Modal, Platform, RefreshControl, Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; // Jey: Make sure this path is correct for your AuthContext
import GroupChat from './Chat/GroupChat';
import GroupConversation from './Chat/GroupConversation';
import OneChat from './Chat/OneChat';
import OneConversation from './Chat/OneConversation';
import NewChatModal from '../screens/Chat/NewChatModal';
import GateCodes from './GateCodes/GateCodes';
import { doc, getDoc, getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

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
          <Ionicons name="person" size={30} color={Colors.white} />
        </View>
      )}
    </View>
    <Text style={styles.profileName}>{userData?.name || 'Driver'}</Text>
    {userData?.role === 'driver' && (
      <View style={styles.driverInfo}>
        <Image
          source={require('../assets/driver.png')}
          style={styles.driverIcon}
        />
        <Text style={styles.dspName}>{userData?.dspName || 'Your DSP'}</Text>
      </View>
    )}
  </View>
);

const HomeScreen = ({ navigation }) => {
  // Jey: Destructure unreadCounts from useAuth
  const { userData, unreadCounts } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [safetyTips, setSafetyTips] = useState([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const scrollViewRef = useRef(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const autoScrollIntervalRef = useRef(null);
  const [isSwipingForward, setIsSwipingForward] = useState(true); // For the bounce effect

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

  // --- Start Auto Scroll Function (unchanged from previous fix) ---
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
    const fetchSafetyTips = async () => {
      setLoadingTips(true);
      try {
        const db = getFirestore();
        if (!userData?.dspName) {
            console.warn("Jey: HomeScreen - userData.dspName is not available. Cannot fetch DSP-specific safety tips yet.");
            setSafetyTips([]);
            setLoadingTips(false);
            return;
        }

        console.log(`Jey: HomeScreen - Attempting to fetch safety tips for DSP: ${userData.dspName}`);
        const safetyCollectionRef = collection(db, 'safetyTips_by_dsp', userData.dspName, 'items');
        const q = query(safetyCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const tips = querySnapshot.docs.map(doc => {
            const data = doc.data();
            console.log(`Jey: Fetched tip ID: ${doc.id}, Data:`, data);
            return { id: doc.id, ...data };
        });

        console.log(`Jey: HomeScreen - Found ${tips.length} safety tips for ${userData.dspName}.`);
        setSafetyTips(tips);
      } catch (error) {
        console.error("Jey: Error fetching safety tips from DSP collection:", error);
        Alert.alert("Error", "Failed to load safety tips. Please try again.");
      } finally {
        setLoadingTips(false);
      }
    };

    fetchSafetyTips();
  }, [userData?.dspName]);

  useEffect(() => {
    setIsSwipingForward(true); // Reset direction when tips change
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
    setIsSwipingForward(true); // Reset direction to forward after manual scroll
    startAutoScroll();
  };

  const handlePullToRefresh = () => {
    setIsRefreshing(true);
    navigation.replace('Loading');
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
        {/* Safety Tips Swiper or No Tips Message - Conditional Rendering */}
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
                    <View style={styles.tipHeaderRow}>
                      {tip.imageUrl && (
                        <Image source={{ uri: tip.imageUrl }} style={styles.tipImage} />
                      )}
                      <Text style={styles.tipTitle}>{tip.title}</Text>
                    </View>
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

        {/* Main Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('GroupChat')}
          >
            <Ionicons name="people-outline" size={24} color={Colors.primaryTeal} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Group Chats</Text>
            {/* Jey: Conditional rendering for Group Chats unread count (aggregated) */}
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
            <Ionicons name="person-outline" size={24} color={Colors.primaryTeal} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Direct Messages</Text>
            {/* Jey: Conditional rendering for Direct Messages unread count (aggregated) */}
            {unreadCounts.one > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCounts.one}</Text>
              </View>
            ) : (
              <Ionicons name="add" size={20} color={Colors.accentSalmon} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.importantButton]}
            onPress={() => navigation.navigate('GateCodes')}
          >
            <Ionicons name="key-outline" size={24} color={Colors.white} style={styles.buttonIcon} />
            <Text style={[styles.buttonText, styles.importantButtonText]}>Gate Codes</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer Navigation Buttons (assuming it's here, or managed by MainTabs) */}
      <View style={styles.toggleButtonContainer}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleTabPress('HomeTab')}
        >
          <Ionicons
            name="home-outline"
            size={20}
            color={activeTab === 'HomeTab' ? Colors.primaryTeal : Colors.inactiveGray}
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

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handleTabPress('PostsTab')}
        >
          <Ionicons
            name="newspaper-outline"
            size={20}
            color={activeTab === 'PostsTab' ? Colors.primaryTeal : Colors.inactiveGray}
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

        {userData?.role === 'admin' && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleTabPress('AdminTab')}
          >
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
          <Ionicons
            name="settings-outline"
            size={20}
            color={activeTab === 'SettingsTab' ? Colors.primaryTeal : Colors.inactiveGray}
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryTeal} />
      </View>
    );
  }

  if (!userData?.activated) {
    return <PendingApprovalScreen />;
  }

  return (
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
        options={({ route }) => ({ title: route.params.userName })}
      />
    </Stack.Navigator>
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
  driverIcon: {
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
    height: 150, // Fixed height for the card
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden', // Crucial to clip content
    backgroundColor: 'transparent', // Gradient will show through
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
    padding: 10,
  },
  swiperContentContainer: {
    // This allows the ScrollView to properly size its content horizontally
    // and the pagingEnabled prop to work correctly for full-width slides.
  },
  swiperSlide: {
    justifyContent: 'flex-start', // Align content to the top
    alignItems: 'flex-start', // Align content to the left
    borderRadius: 15,
    padding: 15, // Padding inside the gradient slide
    // width is set inline as `screenWidth - 40`
  },
  tipContentWrapper: {
    flex: 1, // Allows the content to take up available space in the slide
    width: '100%', // Ensure content stretches
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Space below header row
  },
  tipImage: {
    width: 60,
    height: 60,
    borderRadius: 8, // Slightly rounded corners for the image
    marginRight: 10,
    resizeMode: 'cover', // Ensures image fills the space
    backgroundColor: Colors.white, // Placeholder color
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)', // Subtle border
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    flex: 1, // Allow title to take up remaining space
  },
  tipMessage: {
    fontSize: 14,
    color: Colors.white,
    lineHeight: 20,
    flex: 1, // Allow message to take up remaining vertical space
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: Colors.white,
    width: 12,
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
  buttonIcon: {
    marginRight: 15,
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
  // Jey: New styles for the unread badge
  badge: {
    backgroundColor: Colors.accentSalmon,
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 26, // Ensure it's visually appealing for single/double digits
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Space from the text
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeWrapper;