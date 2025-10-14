import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
  ScrollView, Dimensions, Modal, Platform, RefreshControl, Alert, Linking
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import GroupChat from './Chat/GroupChat';
import GroupConversation from './Chat/GroupConversation';
import OneChat from './Chat/OneChat';
import OneConversation from './Chat/OneConversation';
import NewChatModal from '../screens/Chat/NewChatModal';
import GateCodes from './GateCodes/GateCodes';
import { doc, getDoc, getFirestore, collection, getDocs, orderBy, query, where, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import OffDutty from '../screens/OffDutty';
import Team from '../screens/Team';
import TeamChat from '../screens/TeamChat';
import ReturnsModal from '../components/ReturnsModal';
import ReturnsDetail from '../screens/ReturnsDetail';
import BottomTab from '../components/BottomTab';
import CustomHeader from '../components/CustomHeader';

const Stack = createStackNavigator();

const Colors = {
  primaryTeal: '#2E8B57', // Warmer sea green
  accentSalmon: '#FF6B6B', // Friendlier coral
  checkInGreen: '#4CAF50', // Modern green
  lightBackground: '#F8FAFB', // Softer background
  white: '#FFFFFF',
  darkText: '#2C3E50', // Warmer dark text
  mediumText: '#5A6C7D', // Friendlier medium text
  lightGray: '#F0F2F5', // Modern gray
  border: '#E8EAED', // Subtle borders
  inactiveGray: '#9AA0A6', // Modern inactive
  checkOutRed: '#F44336', // Material red
  cardBackground: '#FFFFFF',
  successGreen: '#00C851',
  warningOrange: '#FF8A00',
  safetyBlue: '#2196F3',
};

const { width: screenWidth } = Dimensions.get('window');

// --- Enhanced Friendly Driver Profile Header Component ---
const DriverProfileHeader = ({ userData }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      'Ready for another great day? 🚛',
      'Let\'s make it a safe day! 🛡️',
      'Drive safe, drive smart! 💪',
      'Your safety is our priority! ⭐',
      'Another day, another opportunity! 🌟'
    ];
    return messages[new Date().getDay() % messages.length];
  };

  return (
    <LinearGradient
      colors={[Colors.primaryTeal, '#3A9B6C']}
      style={styles.driverProfileSection}
    >
      <View style={styles.profileContent}>
        <View style={styles.profileLeft}>
          <View style={styles.avatarContainer}>
            {userData?.profilePictureUrl ? (
              <Image source={{ uri: userData.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={28} color={Colors.white} />
              </View>
            )}
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.profileName}>{userData?.name?.split(' ')[0] || 'Driver'}! 👋</Text>
            <Text style={styles.motivationalText}>{getMotivationalMessage()}</Text>
            {(userData?.role === 'driver' || userData?.role === 'trainer') && (
              <View style={styles.driverInfo}>
                <MaterialIcons name="business" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.dspName}>{userData?.dspName || 'Your Company'}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.profileRight}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const HomeScreen = ({ navigation }) => {
  const { userData, unreadCounts, setUserData } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [safetyTips, setSafetyTips] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loadingTips, setLoadingTips] = useState(true);

  // Configure navigation header for iOS - hide back button title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: Platform.OS === 'ios' ? '' : undefined,
      headerBackTitleVisible: false,
    });
  }, [navigation]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const scrollViewRef = useRef(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const autoScrollIntervalRef = useRef(null);
  const [isSwipingForward, setIsSwipingForward] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(userData?.isCheckedIn || false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentNavigation = useNavigation();
  const route = useRoute();
  const [isReturnsModalVisible, setIsReturnsModalVisible] = useState(false);
  const [isRTSConfirmed, setIsRTSConfirmed] = useState(userData?.isRTSConfirmed || false);
  const [rescueRequest, setRescueRequest] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInAction, setCheckInAction] = useState(null); // 'in' or 'out'

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
          allowPosts: updatedUserData.allowPosts ?? true,
          isCheckedIn: updatedUserData.isCheckedIn ?? false,
          isRTSConfirmed: updatedUserData.isRTSConfirmed ?? false,
        }));
        setIsCheckedIn(updatedUserData.isCheckedIn ?? false);
        setIsRTSConfirmed(updatedUserData.isRTSConfirmed ?? false);
      }
    }, (error) => {
      console.error("Jey: Error listening to user document:", error);
    });

    return () => unsubscribe();
  }, [userData?.uid, setUserData]);

  useEffect(() => {
    if (!userData?.uid) return;

    const db = getFirestore();
    const rescuesRef = collection(db, 'rescues');
    const q = query(rescuesRef, where('rescuerId', '==', userData.uid), where('status', '==', 'dispatched'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const rescueData = snapshot.docs[0].data();
        setRescueRequest({ id: snapshot.docs[0].id, ...rescueData });
      } else {
        setRescueRequest(null);
      }
    });
    
    return () => unsubscribe();
  }, [userData?.uid]);

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
            if ((updatedUserData.role === 'driver' || updatedUserData.role === 'trainer') && !updatedUserData.isOnDutty) {
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



  const handleCheckIn = () => {
    setCheckInAction(isCheckedIn ? 'out' : 'in');
    setShowCheckInModal(true);
  };

  const performCheckIn = async () => {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, { isCheckedIn: true });
      setIsCheckedIn(true);
      setShowCheckInModal(false);
    } catch (error) {
      console.error("Jey: Error checking in:", error);
      Alert.alert("Error", "Failed to check in. Please try again.");
    }
  };

  const performCheckOut = async () => {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, { isCheckedIn: false });
      setIsCheckedIn(false);
      setShowCheckInModal(false);
    } catch (error) {
      console.error("Jey: Error checking out:", error);
      Alert.alert("Error", "Failed to check out. Please try again.");
    }
  };

  const handleLogRouteCompletion = async (returnsData) => {
      try {
          const db = getFirestore();
          const returnsRef = collection(db, 'returns');
          
          await addDoc(returnsRef, {
              driverId: userData.uid,
              driverName: userData.name,
              dspName: userData.dspName,
              ...returnsData,
              timestamp: serverTimestamp(),
          });
          
          Alert.alert("Success", "Route completion and returns logged successfully!");
      } catch (error) {
          console.error("Jey: Error logging route completion:", error);
          Alert.alert("Error", "Failed to log route completion. Please try again.");
          throw error;
      }
  };
  
  const handleAcknowledgeRTS = async () => {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, { isRTSConfirmed: false, isOnDutty: false, isCheckedIn: false }); 
    } catch (error)
      {
      console.error("Jey: Error acknowledging RTS:", error);
      Alert.alert("Error", "Failed to acknowledge return to station. Please try again.");
    }
  };

  const handleAcknowledgeRescue = async () => {
    if (!rescueRequest) return;
    try {
      const db = getFirestore();
      const rescueRef = doc(db, 'rescues', rescueRequest.id);
      await updateDoc(rescueRef, { status: 'acknowledged' });

      // Jey: This is the new block to set the 'isRescuing' flag on the user's profile
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, { isRescuing: true });

      setRescueRequest(null);
      Alert.alert("Rescue Acknowledged", "You have acknowledged the rescue request. Stay safe!");
    } catch (error) {
      console.error("Jey: Error acknowledging rescue:", error);
      Alert.alert("Error", "Failed to acknowledge rescue request. Please try again.");
    }
  };
  
  const handleOpenMaps = (address) => {
    const platformAddress = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
    });

    Linking.openURL(platformAddress).catch(err => console.error('Jey: Failed to open maps:', err));
  };


  if (isRTSConfirmed) {
    return (
      <View style={styles.rtsConfirmedContainer}>
        <MaterialIcons name="local-shipping" size={100} color={Colors.primaryTeal} />
        <Text style={styles.rtsConfirmedTitle}>Route Completed!</Text>
        <Text style={styles.rtsConfirmedMessage}>
          Your route for today has been safely completed. You can safely your return to the station. Thank you!
        </Text>
        <TouchableOpacity style={styles.rtsConfirmedButton} onPress={handleAcknowledgeRTS}>
          <Text style={styles.rtsConfirmedButtonText}>Acknowledge</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        {/* Jey: Moved DriverProfileHeader inside ScrollView */}
        <DriverProfileHeader userData={userData} />

        {/* Enhanced Rescue Request Card */}
        {rescueRequest && (
          <View style={styles.modernRescueCard}>
            <LinearGradient
              colors={['#E53E3E', '#C53030']}
              style={styles.rescueCardGradient}
            >
              <View style={styles.rescueUrgentBadge}>
                <Ionicons name="alert-circle" size={18} color={Colors.white} />
                <Text style={styles.rescueUrgentText}>URGENT</Text>
              </View>
              <View style={styles.modernRescueHeader}>
                <View style={styles.rescueIconContainer}>
                  <Ionicons name="medkit" size={28} color={Colors.white} />
                </View>
                <View style={styles.rescueHeaderText}>
                  <Text style={styles.modernRescueTitle}>Rescue Mission!</Text>
                  <Text style={styles.rescueSubtitle}>You've been assigned to help a fellow driver</Text>
                </View>
              </View>
              <View style={styles.rescueDetails}>
                <View style={styles.rescueDetailItem}>
                  <Ionicons name="person" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.rescueDetailText}>Driver: {rescueRequest.rescueeName}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.modernAddressButton} 
                  onPress={() => handleOpenMaps(rescueRequest.rescueAddress)}
                >
                  <Ionicons name="navigate" size={18} color={Colors.safetyBlue} />
                  <Text style={styles.modernAddressText}>{rescueRequest.rescueAddress}</Text>
                  <Ionicons name="open-outline" size={16} color={Colors.safetyBlue} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.modernRescueButton} 
                onPress={handleAcknowledgeRescue}
              >
                <LinearGradient
                  colors={['#38A169', '#2F855A']}
                  style={styles.rescueButtonGradient}
                >
                  <Ionicons name="checkmark-done" size={20} color={Colors.white} />
                  <Text style={styles.modernRescueButtonText}>Acknowledge & Start Mission</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {loadingTips ? (
          <View style={styles.modernCardLoading}>
            <ActivityIndicator size="large" color={Colors.primaryTeal} />
            <Text style={styles.loadingText}>Loading your safety tips...</Text>
          </View>
        ) : safetyTips.length > 0 ? (
          <View style={styles.safetyTipsContainer}>
            <View style={styles.safetyTipsHeader}>
              <MaterialIcons name="shield" size={24} color={Colors.safetyBlue} />
              <Text style={styles.sectionTitle}>Today's Safety Tips</Text>
              <View style={styles.tipCounter}>
                <Text style={styles.tipCounterText}>{currentTipIndex + 1}/{safetyTips.length}</Text>
              </View>
            </View>
            <View style={styles.modernCentralCard}>
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
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.modernSwiperSlide, { width: screenWidth - 40 }]}
                  >
                    <View style={styles.modernTipContent}>
                      <View style={styles.tipHeader}>
                        <MaterialIcons name="lightbulb" size={20} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.tipBadge}>Safety Tip</Text>
                      </View>
                      {tip.imageUrl && (
                        <Image source={{ uri: tip.imageUrl }} style={styles.modernTipImage} />
                      )}
                      <Text style={styles.modernTipTitle}>{tip.title}</Text>
                      <Text style={styles.modernTipMessage}>{tip.message}</Text>
                    </View>
                  </LinearGradient>
                ))}
              </ScrollView>
              <View style={styles.modernPagination}>
                {safetyTips.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.modernDot,
                      index === currentTipIndex ? styles.modernActiveDot : null,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.modernNoTipsCard}>
            <View style={styles.noTipsIconContainer}>
              <MaterialIcons name="shield" size={40} color={Colors.inactiveGray} />
            </View>
            <Text style={styles.noTipsTitle}>All caught up!</Text>
            <Text style={styles.noTipsMessage}>No new safety tips today. Keep up the great work! 🎉</Text>
          </View>
        )}

        {loadingNotices ? (
          <View style={styles.modernCardLoading}>
            <ActivityIndicator size="large" color={Colors.primaryTeal} />
            <Text style={styles.loadingText}>Loading your notices...</Text>
          </View>
        ) : notices.length > 0 ? (
          <View style={styles.noticesContainer}>
            <View style={styles.noticesHeader}>
              <MaterialIcons name="notifications" size={24} color={Colors.warningOrange} />
              <Text style={styles.sectionTitle}>Important</Text>
              <View style={styles.noticesBadge}>
                <Text style={styles.noticesBadgeText}>{notices.length} New</Text>
              </View>
            </View>
            {notices.map((notice) => (
              <View key={notice.id} style={styles.modernNoticeCard}>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  style={styles.noticeCardGradient}
                >
                  <View style={styles.modernNoticeHeader}>
                    <View style={styles.noticeIconContainer}>
                      <MaterialIcons name="campaign" size={20} color={Colors.white} />
                    </View>
                    <Text style={styles.modernNoticeTitle}>{notice.title}</Text>
                  </View>
                  <Text style={styles.modernNoticeMessage}>{notice.message}</Text>
                  <View style={styles.noticeFooter}>
                    <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.noticeTime}>
                      {notice.createdAt ? new Date(notice.createdAt.toDate()).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.modernNoNoticesCard}>
            <View style={styles.noNoticesIconContainer}>
              <MaterialIcons name="notifications_none" size={40} color={Colors.inactiveGray} />
            </View>
            <Text style={styles.noNoticesTitle}>All clear!</Text>
            <Text style={styles.noNoticesMessage}>No new notices from your company. You're all set! ✅</Text>
          </View>
        )}

        {userData?.allowChat && (
          <View style={styles.actionSection}>
            <View style={styles.sectionHeaderSimple}>
              <MaterialIcons name="forum" size={22} color={Colors.primaryTeal} />
              <Text style={styles.sectionTitleSimple}>Stay Connected</Text>
            </View>
            <View style={styles.modernButtonContainer}>
              <TouchableOpacity
                style={styles.modernButton}
                onPress={() => navigation.navigate('GroupChat')}
              >
                <LinearGradient
                  colors={['#4FC3F7', '#29B6F6']}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonIconContainer}>
                      <MaterialIcons name="groups" size={24} color={Colors.white} />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.modernButtonTitle}>Team Chat</Text>
                      <Text style={styles.modernButtonSubtitle}>Connect with your team</Text>
                    </View>
                    {unreadCounts.group > 0 ? (
                      <View style={styles.modernBadge}>
                        <Text style={styles.modernBadgeText}>{unreadCounts.group}</Text>
                      </View>
                    ) : (
                      <Image 
                        source={require('../assets/png/arrow_rightShort.png')} 
                        style={{ width: 16, height: 16, tintColor: 'rgba(255,255,255,0.8)' }} 
                      />
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modernButton}
                onPress={() => navigation.navigate('OneChat')}
              >
                <LinearGradient
                  colors={['#66BB6A', '#4CAF50']}
                  style={styles.buttonGradient}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonIconContainer}>
                      <MaterialIcons name="chat" size={24} color={Colors.white} />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.modernButtonTitle}>Direct Messages</Text>
                      <Text style={styles.modernButtonSubtitle}>Private conversations</Text>
                    </View>
                    {unreadCounts.one > 0 ? (
                      <View style={styles.modernBadge}>
                        <Text style={styles.modernBadgeText}>{unreadCounts.one}</Text>
                      </View>
                    ) : (
                      <Image 
                        source={require('../assets/png/arrow_rightShort.png')} 
                        style={{ width: 16, height: 16, tintColor: 'rgba(255,255,255,0.8)' }} 
                      />
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.actionSection}>
          <View style={styles.sectionHeaderSimple}>
            <MaterialIcons name="work" size={22} color={Colors.primaryTeal} />
            <Text style={styles.sectionTitleSimple}>Quick Actions</Text>
          </View>
          <View style={styles.modernButtonContainer}>
            <TouchableOpacity
              style={styles.modernButton}
              onPress={() => navigation.navigate('GateCodes')}
            >
              <LinearGradient
                colors={['#FF7043', '#FF5722']}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <MaterialIcons name="dialpad" size={24} color={Colors.white} />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.modernButtonTitle}>Gate Codes</Text>
                    <Text style={styles.modernButtonSubtitle}>Access your delivery codes</Text>
                  </View>
                  <Image 
                    source={require('../assets/png/arrow_rightShort.png')} 
                    style={{ width: 16, height: 16, tintColor: 'rgba(255,255,255,0.8)' }} 
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modernButton}
              onPress={handleCheckIn}
            >
              <LinearGradient
                colors={isCheckedIn ? ['#F44336', '#D32F2F'] : ['#4CAF50', '#388E3C']}
                style={styles.buttonGradient}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <MaterialIcons 
                      name={isCheckedIn ? "logout" : "login"} 
                      size={24} 
                      color={Colors.white} 
                    />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.modernButtonTitle}>
                      {isCheckedIn ? 'Check Out' : 'Check In'}
                    </Text>
                    <Text style={styles.modernButtonSubtitle}>
                      {isCheckedIn ? 'End your shift safely' : 'Start your shift'}
                    </Text>
                  </View>
                  <Image 
                    source={require('../assets/png/arrow_rightShort.png')} 
                    style={{ width: 16, height: 16, tintColor: 'rgba(255,255,255,0.8)' }} 
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {(userData?.role === 'driver' || userData?.role === 'trainer') && isCheckedIn && (
        <TouchableOpacity
          style={styles.floatingReturnsButton}
          onPress={() => setIsReturnsModalVisible(true)}
        >
          <MaterialIcons name="done-all" size={30} color={Colors.white} />
        </TouchableOpacity>
      )}



      <NewChatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        navigation={navigation}
      />
      
      <ReturnsModal
        visible={isReturnsModalVisible}
        onClose={() => setIsReturnsModalVisible(false)}
        onLogReturns={handleLogRouteCompletion}
      />

      {/* Custom Check In/Out Modal */}
      <Modal
        visible={showCheckInModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.checkInModalOverlay}>
          <View style={styles.checkInModalContainer}>
            <LinearGradient
              colors={checkInAction === 'in' ? ['#4CAF50', '#388E3C'] : ['#F44336', '#D32F2F']}
              style={styles.checkInModalGradient}
            >
              <View style={styles.checkInModalHeader}>
                <View style={styles.checkInModalIconContainer}>
                  <MaterialIcons 
                    name={checkInAction === 'in' ? "login" : "logout"} 
                    size={32} 
                    color={Colors.white} 
                  />
                </View>
                <Text style={styles.checkInModalTitle}>
                  {checkInAction === 'in' ? 'Check In for Your Shift' : 'Check Out from Your Shift'}
                </Text>
                <Text style={styles.checkInModalSubtitle}>
                  {checkInAction === 'in' 
                    ? 'Ready to start your delivery day?' 
                    : 'Finishing up for today?'
                  }
                </Text>
              </View>

              <View style={styles.checkInModalContent}>
                <View style={styles.checkInModalInfo}>
                  <MaterialIcons name="schedule" size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.checkInModalTime}>
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>
                <View style={styles.checkInModalInfo}>
                  <MaterialIcons name="today" size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.checkInModalDate}>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
                {userData?.dspName && (
                  <View style={styles.checkInModalInfo}>
                    <MaterialIcons name="business" size={20} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.checkInModalCompany}>{userData.dspName}</Text>
                  </View>
                )}
              </View>

              <View style={styles.checkInModalActions}>
                <TouchableOpacity
                  style={styles.checkInModalCancelButton}
                  onPress={() => setShowCheckInModal(false)}
                >
                  <Text style={styles.checkInModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkInModalConfirmButton}
                  onPress={checkInAction === 'in' ? performCheckIn : performCheckOut}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.checkInModalConfirmGradient}
                  >
                    <MaterialIcons 
                      name="check" 
                      size={20} 
                      color={Colors.white} 
                    />
                    <Text style={styles.checkInModalConfirmText}>
                      {checkInAction === 'in' ? 'Check In' : 'Check Out'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
      <BottomTab />
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
  const { userData, loading, setUserData } = useAuth();
  const navigation = useNavigation();
  const [localIsOnDutyOrTrainerStatus, setLocalIsOnDutyOrTrainerStatus] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const fixedTimerRef = useRef(null);

  const updateIsOnDuttyStatus = async (status) => {
    if (userData?.uid && (userData?.role === 'driver' || userData?.role === 'trainer')) {
      const db = getFirestore();
      const userRef = doc(db, 'users', userData.uid);
      try {
        await updateDoc(userRef, { isOnDutty: status });
        console.log(`Jey: User status updated to ${status}.`);
      } catch (error) {
        console.error("Jey: Error updating isOnDutty status:", error);
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkUserRole = async () => {
        if (!userData?.uid) return;

        const db = getFirestore();
        const userRef = doc(db, 'users', userData.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const updatedUserData = userSnap.data();
          setUserData(updatedUserData);
          setShowFloatingButton(updatedUserData?.isTrainer);
        }
      };

      checkUserRole();
      
      return () => {
      };
    }, [userData?.uid, setUserData])
  );

  useEffect(() => {
    const rolesToMonitor = ['driver', 'trainer'];
    if (!userData?.uid || !rolesToMonitor.includes(userData?.role)) {
      setLocalIsOnDutyOrTrainerStatus(false);
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
        setLocalIsOnDutyOrTrainerStatus(data.isOnDutty || false);

        if (data.isOnDutty && data.onDutySince) {
          if (fixedTimerRef.current) {
            clearTimeout(fixedTimerRef.current);
          }
          // Calculate time left until 30 seconds after onDutySince
          // NOTE: The original code used 32,400,000 ms (9 hours), which is likely a fixed shift duration.
          let onDutyTime = data.onDutySince.toDate ? data.onDutySince.toDate() : new Date(data.onDutySince);
          let now = new Date();
          let msLeft = 32400000 - (now - onDutyTime);
          if (msLeft < 0) msLeft = 0;
          fixedTimerRef.current = setTimeout(() => {
            console.log('Jey: 30 seconds have passed. Setting user to off-duty automatically.');
            updateIsOnDuttyStatus(false);
          }, msLeft);
        } else {
          if (fixedTimerRef.current) {
            clearTimeout(fixedTimerRef.current);
          }
        }
      } else {
        console.warn("Jey: User document not found during isOnDutty listener for UID:", userData.uid);
        setLocalIsOnDutyOrTrainerStatus(false);
      }
    }, (error) => {
      console.error("Jey: Error listening to user's isOnDutty status:", error);
      setLocalIsOnDutyOrTrainerStatus(false);
    });

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

  if (userData?.activated && (userData?.role === 'driver' || userData?.role === 'trainer') && !localIsOnDutyOrTrainerStatus) {
    return <OffDutty />;
  }

  if (!userData?.activated) {
    return <PendingApprovalScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: styles.headerStyle,
          headerTitleStyle: styles.headerTitleStyle,
          headerTintColor: Colors.darkText,
          headerTitleAlign: 'center',
          headerBackVisible: true,
          headerBackTitle: '',
          headerBackTitleVisible: false,
          headerBackButtonMenuEnabled: false,
          ...(Platform.OS === 'ios' && {
            headerBackTitle: '',
            headerBackTitleVisible: false,
            headerBackButtonMenuEnabled: false,
            headerBackDisplayMode: 'minimal',
          }),
        }}
      >
        <Stack.Screen
          name="HomeScreenContent"
          component={HomeScreen}
          options={{
            headerShown: false, 
            header: undefined,
          }}
        />
        <Stack.Screen
          name="GroupChat"
          component={GroupChat}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OneChat"
          component={OneChat}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GateCodes"
          component={GateCodes}
          options={{
            header: () => <CustomHeader title="Gate Codes" />, 
            headerShown: true
          }}
        />
        <Stack.Screen
          name="Team"
          component={Team}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeamChat"
          component={TeamChat}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GroupConversation"
          component={GroupConversation}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OneConversation"
          component={OneConversation}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReturnsDetail"
          component={ReturnsDetail}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>

      {showFloatingButton && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate('Team')}
        >
          <Image
            source={require('../assets/png/team.png')}
            style={styles.floatingButtonIcon}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
    // Removed paddingTop: 25 here since the header is now removed.
    alignItems: 'center',
  },
  scrollViewContent: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 80,
    paddingHorizontal: 20,
    // Added paddingTop here to match the old header's top spacing plus the padding
    paddingTop: 0, 
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
    width: screenWidth, // Make sure it spans the full width
    marginHorizontal: -20, // Negative margin to fill the horizontal padding of the ScrollView
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20, // Add spacing before the next section
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileRight: {
    alignItems: 'flex-end',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: Colors.lightGray,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.successGreen,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  motivationalText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dspName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginLeft: 4,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  // Modern Loading Card
  modernCardLoading: {
    width: screenWidth - 40,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.mediumText,
    fontWeight: '500',
  },

  // Safety Tips Section
  safetyTipsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  safetyTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkText,
    flex: 1,
    marginLeft: 8,
  },
  tipCounter: {
    backgroundColor: Colors.safetyBlue,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tipCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  modernCentralCard: {
    width: screenWidth - 40,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modernSwiperSlide: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 20,
  },
  modernTipContent: {
    flex: 1,
    width: '100%',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernTipImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modernTipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
    lineHeight: 22,
  },
  modernTipMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    flex: 1,
  },
  modernPagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
  },
  modernDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  modernActiveDot: {
    width: 20,
    backgroundColor: Colors.white,
  },

  // No Tips Card
  modernNoTipsCard: {
    width: screenWidth - 40,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noTipsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noTipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkText,
    marginBottom: 8,
  },
  noTipsMessage: {
    fontSize: 14,
    color: Colors.mediumText,
    textAlign: 'center',
    lineHeight: 20,
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
  // Notices Section
  noticesContainer: {
    width: '100%',
    marginBottom: 20,
  },
  noticesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  noticesBadge: {
    backgroundColor: Colors.warningOrange,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noticesBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  modernNoticeCard: {
    width: screenWidth - 40,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  noticeCardGradient: {
    padding: 20,
  },
  modernNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noticeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernNoticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
  },
  modernNoticeMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 12,
  },
  noticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },

  // No Notices Card
  modernNoNoticesCard: {
    width: screenWidth - 40,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noNoticesIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noNoticesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkText,
    marginBottom: 8,
  },
  noNoticesMessage: {
    fontSize: 14,
    color: Colors.mediumText,
    textAlign: 'center',
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
  // Action Sections
  actionSection: {
    width: '100%',
    marginBottom: 24,
  },
  sectionHeaderSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleSimple: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkText,
    marginLeft: 8,
  },
  modernButtonContainer: {
    width: '100%',
  },
  modernButton: {
    width: screenWidth - 40,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    padding: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  modernButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  modernButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  modernBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
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
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  floatingButtonIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    tintColor: Colors.white,
  },
  floatingReturnsButton: {
    position: 'absolute',
    bottom: 90,
    left: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accentSalmon,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  rtsConfirmedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
    padding: 20,
  },
  rtsConfirmedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 20,
    marginBottom: 10,
  },
  rtsConfirmedMessage: {
    fontSize: 16,
    color: Colors.mediumText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  rtsConfirmedButton: {
    backgroundColor: Colors.primaryTeal,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  rtsConfirmedButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Enhanced Rescue Card Styles
  modernRescueCard: {
    width: screenWidth - 40,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  rescueCardGradient: {
    padding: 20,
  },
  rescueUrgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  rescueUrgentText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 4,
    letterSpacing: 1,
  },
  modernRescueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rescueIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rescueHeaderText: {
    flex: 1,
  },
  modernRescueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  rescueSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  rescueDetails: {
    marginBottom: 20,
  },
  rescueDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rescueDetailText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 8,
    fontWeight: '600',
  },
  modernAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  modernAddressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.darkText,
    fontWeight: '600',
  },
  modernRescueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rescueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modernRescueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 8,
  },

  // Check In/Out Modal Styles
  checkInModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  checkInModalContainer: {
    width: screenWidth - 40,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  checkInModalGradient: {
    padding: 0,
  },
  checkInModalHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  checkInModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkInModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  checkInModalSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  checkInModalContent: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  checkInModalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  checkInModalTime: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 12,
  },
  checkInModalDate: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
    fontWeight: '500',
  },
  checkInModalCompany: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
    fontWeight: '600',
  },
  checkInModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingBottom: 30,
    gap: 12,
  },
  checkInModalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  checkInModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  checkInModalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkInModalConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  checkInModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 8,
  },

  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: Colors.white,
  },
});

export default HomeWrapper;