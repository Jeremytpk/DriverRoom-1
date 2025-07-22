import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Home from '../screens/Home'; // This should be your HomeScreen content
import Posts from '../screens/Posts/Posts';
import GateCodes from '../screens/GateCodes/GateCodes';
import Settings from '../screens/Settings';
import AdminScreen from '../screens/AdminScreen';
import CompanyScreen from '../screens/CompanyScreen';

const Tab = createBottomTabNavigator();

// Define your new color palette based on the logo
const Colors = {
  primaryTeal: '#008080', // A standard vibrant teal
  accentSalmon: '#FA8072', // A standard salmon/coral
  lightBackground: '#f8f8f8',
  white: '#FFFFFF',
  darkText: '#333333',
  mediumText: '#666666',
};

const CustomTabIcon = ({ icon, label, focused, badgeCount }) => {
  return (
    <View style={styles.tabIconContainer}>
      {icon}
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

export default function BottomTab() {
  const { userData } = useAuth();

  // Example badge counts - replace with your actual data
  const notificationCount = 3;
  const pendingApprovals = userData?.role === 'company' ? 5 : 0;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primaryTeal, // Active tab icon color
        tabBarInactiveTintColor: Colors.mediumText, // Inactive tab icon color
        tabBarStyle: {
          backgroundColor: Colors.white, // White background for tab bar
          borderTopWidth: 0, // Remove default border
          elevation: 5, // Subtle shadow for Android
          shadowColor: '#000', // Subtle shadow for iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
          height: 70,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -5,
        },
        headerShown: false, // Ensure headers are hidden by default in tabs
      }}
    >
      {/* Home Tab (Chat) */}
      <Tab.Screen
        name="Home"
        component={Home} // This should be your HomeScreen content from HomeWrapper
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon
              icon={<Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={24}
                color={focused ? Colors.primaryTeal : Colors.mediumText} // Use teal for focused, mediumText for unfocused
              />}
              label="Chat"
              focused={focused}
              badgeCount={notificationCount}
            />
          ),
        }}
      />

      {/* Posts Tab */}
      <Tab.Screen
        name="Posts"
        component={Posts}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon
              icon={<Ionicons
                name={focused ? 'image' : 'image-outline'}
                size={24}
                color={focused ? Colors.primaryTeal : Colors.mediumText}
              />}
              label="Posts"
              focused={focused}
            />
          ),
        }}
      />

      {/* Role-Specific Tabs */}
      {userData?.role === 'admin' && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabIcon
                icon={<MaterialIcons
                  name={focused ? 'admin-panel-settings' : 'admin-panel-settings'}
                  size={24}
                  color={focused ? Colors.primaryTeal : Colors.mediumText}
                />}
                label="Admin"
                focused={focused}
              />
            ),
          }}
        />
      )}

      {userData?.role === 'company' && (
        <Tab.Screen
          name="Company"
          component={CompanyScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabIcon
                icon={<MaterialIcons
                  name={focused ? 'business' : 'business'}
                  size={24}
                  color={focused ? Colors.primaryTeal : Colors.mediumText}
                />}
                label="Dashboard"
                focused={focused}
                badgeCount={pendingApprovals}
              />
            ),
          }}
        />
      )}

      {/* Gate Codes (for activated drivers) */}
      {userData?.activated && userData?.role === 'driver' && (
        <Tab.Screen
          name="GateCodes"
          component={GateCodes}
          options={{
            tabBarIcon: ({ focused }) => (
              <CustomTabIcon
                icon={<MaterialCommunityIcons
                  name={focused ? 'key-variant' : 'key-outline'}
                  size={24}
                  color={focused ? Colors.primaryTeal : Colors.mediumText}
                />}
                label="Gate Codes"
                focused={focused}
              />
            ),
          }}
        />
      )}

      {/* Settings Tab */}
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon
              icon={<Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={24}
                color={focused ? Colors.primaryTeal : Colors.mediumText}
              />}
              label="Settings"
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    color: Colors.mediumText, // Unfocused label color
    marginTop: 4,
  },
  tabLabelFocused: {
    color: Colors.primaryTeal, // Focused label color
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -5,
    backgroundColor: Colors.accentSalmon, // Use accent color for badge
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
