import GateCodes from './screens/GateCodes/GateCodes';
// Your App.js
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import CustomHeader from './components/CustomHeader';

import { AuthProvider, useAuth } from './context/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalNoticeProvider, useGlobalNotice } from './context/GlobalNoticeContext';

// Screens

import LoadingScreen from './components/LoadingScreen';
import Login from './screens/Auth/Login';
import Signup from './screens/Auth/Signup';
import PendingApproval from './components/PendingApproval';
import Home from './screens/Home';
import Posts from './screens/Posts';
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
import AnalyticsDashboard from './screens/AnalyticsDashboard';

const Stack = createNativeStackNavigator();

// Navigation without tabs - simple screen flow


// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <GlobalNoticeProvider>
            <Stack.Navigator 
              initialRouteName="Loading"
              screenOptions={{
                headerShown: false,
              }}
            >
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
                options={{ header: () => <CustomHeader title="Driver Detail" />, headerShown: true }}
              />
              <Stack.Screen
                name="CompanyDetail"
                component={CompanyDetailScreen}
                options={{ header: () => <CustomHeader title="Company Detail" />, headerShown: true }}
              />
              <Stack.Screen
                name="UpgradeModal"
                component={UpgradeModal}
                options={{ header: () => <CustomHeader title="Upgrade" />, headerShown: true }}
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
                options={{ header: () => <CustomHeader title="Sign Up" />, headerShown: true }}
              />
              <Stack.Screen
                name="ResetPassword"
                component={ResetPassword}
                options={{ header: () => <CustomHeader title="Reset Password" />, headerShown: true }}
              />
              <Stack.Screen
                name="PasswordResetConfirmation"
                component={PasswordResetConfirmation}
                options={{ header: () => <CustomHeader title="Password Reset Confirmation" />, headerShown: true }}
              />
              <Stack.Screen
                name="PendingApproval"
                component={PendingApproval}
                options={{ header: () => <CustomHeader title="Pending Approval" />, headerShown: true }}
              />
              <Stack.Screen
                name="Home"
                component={Home}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Posts"
                component={Posts}
                options={{ header: () => <CustomHeader title="Posts" />, headerShown: true }}
              />
              <Stack.Screen
                name="CompanyScreen"
                component={CompanyScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RescueModal"
                component={RescueModal}
                options={{ header: () => <CustomHeader title="Rescue" />, headerShown: true }}
              />
              <Stack.Screen
                name="ReturnsModal"
                component={ReturnsModal}
                options={{ header: () => <CustomHeader title="Returns" />, headerShown: true }}
              />
              <Stack.Screen
                name="ReturnsDetail"
                component={ReturnsDetail}
                options={{ header: () => <CustomHeader title="Returns Detail" />, headerShown: true }}
              />
              <Stack.Screen
                name="Team"
                component={Team}
                options={{ header: () => <CustomHeader title="Team" />, headerShown: true }}
              />
              <Stack.Screen
                name="TeamChat"
                component={TeamChat}
                options={{ header: () => <CustomHeader title="Team Chat" />, headerShown: true }}
              />
              <Stack.Screen
                name="Notice"
                component={Notice}
                options={{ header: () => <CustomHeader title="Notice" />, headerShown: true }}
              />
              <Stack.Screen
                name="SafetyTips"
                component={SafetyTips}
                options={{ header: () => <CustomHeader title="Safety Tips" />, headerShown: true }}
              />
  
              <Stack.Screen
                name="ManagePosts"
                component={ManagePosts}
                options={{ header: () => <CustomHeader title="Manage Posts" />, headerShown: true }}
              />
              <Stack.Screen
                name="PostDetail"
                component={PostDetail}
                options={{ header: () => <CustomHeader title="Post Detail" />, headerShown: true }}
              />
  
              {/* Main App */}
              <Stack.Screen
                name="Main"
                component={Home}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GateCodes"
                component={GateCodes}
                options={{ header: () => <CustomHeader title="Gate Codes" />, headerShown: true }}
              />
              <Stack.Screen
                name="GateCodeDetail"
                component={GateCodeDetail}
                options={{ header: () => <CustomHeader title="Detail Location" />, headerShown: true }}
              />
              <Stack.Screen
                name="CreatePost"
                component={CreatePost}
                options={{ header: () => <CustomHeader title="Create Post" />, headerShown: true }}
              />
              <Stack.Screen
                name="OnDutty"
                component={OnDutty}
                options={{ header: () => <CustomHeader title="On Duty" />, headerShown: true }}
              />
              <Stack.Screen
                name="OffDutty"
                component={OffDutty}
                options={{ header: () => <CustomHeader title="Off Duty" />, headerShown: true }}
              />
              <Stack.Screen
                name="Settings"
                component={Settings}
                options={{ header: () => <CustomHeader title="Settings" />, headerShown: true }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfile}
                options={{ header: () => <CustomHeader title="Edit Profile" />, headerShown: true }}
              />
              <Stack.Screen
                name="FeedBack"
                component={FeedBack}
                options={{ header: () => <CustomHeader title="Feedback" />, headerShown: true }}
              />
  
              {/* Chat Screens */}
              <Stack.Screen
                name="GroupChat"
                component={GroupChat}
                options={{ header: () => <CustomHeader title="Group Chat" />, headerShown: true }}
              />
              <Stack.Screen 
                name="OneChat"
                component={OneChat} 
                options={{ header: () => <CustomHeader title="Chat" />, headerShown: true }}
              />
              <Stack.Screen name="GroupConversation"
              component={GroupConversation}
              options={{ header: () => <CustomHeader title="Group Conversation" />, headerShown: true }}
              />
              <Stack.Screen name="OneConversation"
              component={OneConversation} 
              options={{ header: () => <CustomHeader title="Conversation" />, headerShown: true }}
              />
              <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboard} options={{ title: 'Analytics Dashboard' }} />
              <Stack.Screen name="AnalyticsGraphicsScreen" component={require('./screens/AnalyticsGraphicsScreen').default} options={{ title: 'Analytics Graphics' }} />
            </Stack.Navigator>
          </GlobalNoticeProvider>
        </NavigationContainer>
      </GestureHandlerRootView> 
    </AuthProvider>
  );
}