// Your App.js
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native'; // Jey: Added Platform here
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalNoticeProvider, useGlobalNotice } from './context/GlobalNoticeContext';

// Screens

import LoadingScreen from './components/LoadingScreen';

import Login from './screens/Auth/Login';

import Signup from './screens/Auth/Signup';

import PendingApproval from './components/PendingApproval';

import Home from './screens/Home';

import Posts from './screens/Posts/Posts';

import PostDetail from './screens/Posts/PostDetail';

import Settings from './screens/Settings';

import AdminPanel from './screens/AdminScreen';

import CompanyDashboard from './screens/CompanyScreen';

import CreatePost from './screens/Posts/CreatePost';

import GroupChat from './screens/Chat/GroupChat';

import EditProfile from './screens/EditProfile';

import CompanyScreen from './screens/CompanyScreen';

import GroupConversation from './screens/Chat/GroupConversation';

import Notice from './components/Notice';

import SafetyTips from './components/SafetyTips';

import OneConversation from './screens/Chat/OneConversation';

import OneChat from './screens/Chat/OneChat';

import OnDutty from './screens/OnDutty';

import OffDutty from './screens/OffDutty';

import AdminScreen from './screens/AdminScreen';

import ResetPassword from './screens/ResetPassword';

import PasswordResetConfirmation from './screens/PasswordResetConfirmation';

import Team from './screens/Team';

import TeamChat from './screens/TeamChat';

import FeedBack from './screens/FeedBack';

import ManagePosts from './screens/ManagePosts';

import DriverDetailScreen from './screens/DriverDetail';

import CompanyDetailScreen from './screens/CompanyDetail';

import GateCodeDetail from './screens/GateCodes/GateCodeDetail';

import UpgradeModal from './components/UpgradeModal';

import RescueModal from './components/RescueModal';

import ReturnsModal from './components/ReturnsModal';

import ReturnsDetail from './screens/ReturnsDetail';

import GlobalNoticeModal from './components/GlobalNoticeModal';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar Component
const CustomTabBarIcon = ({ label, focused, iconName, badgeCount }) => {
  return (
    <View style={styles.tabContainer}>
      <Ionicons
        name={focused ? iconName : `${iconName}-outline`}
        size={24}
        color={focused ? '#FF9AA2' : '#888'}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </View>
  );
};

// Main Tabs with the modal logic
const MainTabs = () => {
  const { userData } = useAuth();
  const { isGlobalNoticeModalVisible, hideGlobalNoticeModal, modalRefreshKey } = useGlobalNotice();

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#f0f0f0',
            height: 70,
            paddingBottom: 10,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={Home}
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon
                label="Chat"
                focused={focused}
                iconName="chatbubbles"
                badgeCount={3}
              />
            ),
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="PostsTab"
          component={Posts}
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon
                label="Posts"
                focused={focused}
                iconName="image"
              />
            ),
            headerShown: false,
          }}
        />
  
        {/* Role-Specific Tabs */}
        {userData?.role === 'admin' && (
          <Tab.Screen
            name="AdminTab"
            component={AdminPanel}
            options={{
              tabBarIcon: ({ focused }) => (
                <MaterialIcons
                  name="admin-panel-settings"
                  size={24}
                  color={focused ? '#FF9AA2' : '#888'}
                />
              ),
              tabBarLabel: 'Admin',
              headerShown: false,
            }}
          />
        )}
  
        {userData?.role === 'company' && (
          <Tab.Screen
            name="CompanyTab"
            component={CompanyDashboard}
            options={{
              tabBarIcon: ({ focused }) => (
                <MaterialIcons
                  name="business"
                  size={24}
                  color={focused ? '#FF9AA2' : '#888'}
                />
              ),
              tabBarLabel: 'Dashboard',
              headerShown: false,
            }}
          />
        )}
  
        <Tab.Screen
          name="SettingsTab"
          component={Settings}
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabBarIcon
                label="Settings"
                focused={focused}
                iconName="settings"
              />
            ),
            headerShown: false,
          }}
        />
      </Tab.Navigator>
      <GlobalNoticeModal
        key={modalRefreshKey}
        visible={isGlobalNoticeModalVisible}
        onClose={hideGlobalNoticeModal}
        onNoticeSent={() => {}}
      />
    </>
  );
};


// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <GlobalNoticeProvider>
            <Stack.Navigator initialRouteName="Loading">
              {/* Auth Flow */}
              <Stack.Screen
                name="Loading"
                component={LoadingScreen}
                options={{ headerShown: false }}
              />
              {/* Admin */}
              <Stack.Screen
                name="AdminScreen"
                component={AdminScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="DriverDetail"
                component={DriverDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CompanyDetail"
                component={CompanyDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="UpgradeModal"
                component={UpgradeModal}
                options={{ headerShown: false }}
              />
  
  
            {/* Auth */}
              <Stack.Screen
                name="Login"
                component={Login}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Signup"
                component={Signup}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ResetPassword"
                component={ResetPassword}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PasswordResetConfirmation"
                component={PasswordResetConfirmation}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PendingApproval"
                component={PendingApproval}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Home"
                component={Home}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CompanyScreen"
                component={CompanyScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RescueModal"
                component={RescueModal}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ReturnsModal"
                component={ReturnsModal}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ReturnsDetail"
                component={ReturnsDetail}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Team"
                component={Team}
                options={{ headerShown: true, title: 'Team', headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="TeamChat"
                component={TeamChat}
                options={{ headerShown: true, title: 'Team Chat', headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="Notice"
                component={Notice}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SafetyTips"
                component={SafetyTips}
                options={{ headerShown: false }}
              />
  
              <Stack.Screen
                name="ManagePosts"
                component={ManagePosts}
                options={{ headerShown: true, title: 'Manage Post', headerTitleAlign: 'center' }}
              />
              
              <Stack.Screen
                name="Posts"
                component={Posts}
                options={{ headerShown: true, title: 'Posts', headerBackVisible: true ,headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="PostDetail"
                component={PostDetail}
                options={{ headerShown: true, title: 'Post Detail', headerTitleAlign: 'center' }}
              />
  
              {/* Main App with Tabs */}
              <Stack.Screen
                name="Main"
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GateCodeDetail"
                component={GateCodeDetail}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CreatePost"
                component={CreatePost}
                options={{ headerShown: false, title: 'Create Post', headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="OnDutty"
                component={OnDutty}
                options={{ headerShown: true, title: '', headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="OffDutty"
                component={OffDutty}
                options={{ headerShown: false, title: 'Create Post', headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="Settings"
                component={Settings}
                options={{ headerShown: true, title: 'Settings', headerBackVisible: true , headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfile}
                options={{ headerShown: true, title: '' , headerTitleAlign: 'center' }}
              />
              <Stack.Screen
                name="FeedBack"
                component={FeedBack}
                options={{ headerShown: true, title: '', headerTitleAlign: 'center' }}
              />
  
              {/* Chat Screens */}
              <Stack.Screen
                name="GroupChat"
                component={GroupChat}
                options={{ headerShown: true }}
              />
              <Stack.Screen name="OneChat"
              component={OneChat} options={{ headerShown: true }}
              />
              <Stack.Screen name="GroupConversation"
              component={GroupConversation}
              options={{ headerShown: false, title: '' , headerTitleAlign: 'center'}}
              />
              <Stack.Screen name="OneConversation"
              component={OneConversation} 
              options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </GlobalNoticeProvider>
        </NavigationContainer>
      </GestureHandlerRootView> 
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  tabLabelFocused: {
    color: '#FF9AA2',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});