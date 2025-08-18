import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Home from '../screens/Home';
import Posts from '../screens/Posts/Posts';
import GateCodes from '../screens/GateCodes/GateCodes';
import Settings from '../screens/Settings';
import AdminScreen from '../screens/AdminScreen';
import CompanyScreen from '../screens/CompanyScreen';

const Tab = createBottomTabNavigator();

const Colors = {
  primaryTeal: '#008080',
  accentSalmon: '#FA8072',
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
  
  const notificationCount = 3;
  const pendingApprovals = userData?.role === 'company' ? 5 : 0;

  // Jey: Only render the Tab.Navigator for non-DSP users
  if (userData?.isDsp) {
    return (
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: Colors.primaryTeal,
          tabBarInactiveTintColor: Colors.mediumText,
          tabBarStyle: {
            backgroundColor: Colors.white,
            borderTopWidth: 0,
            elevation: 5,
            shadowColor: '#000',
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
          headerShown: false,
        }}
      >
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

  // Jey: Render the full tab bar for all other roles
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primaryTeal,
        tabBarInactiveTintColor: Colors.mediumText,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          elevation: 5,
          shadowColor: '#000',
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
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon
              icon={<Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={24}
                color={focused ? Colors.primaryTeal : Colors.mediumText}
              />}
              label="Chat"
              focused={focused}
              badgeCount={notificationCount}
            />
          ),
        }}
      />

      {userData?.allowPosts && (
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
      )}

      {userData?.activated && (userData?.role === 'driver' || userData?.role === 'trainer') && (
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
    color: Colors.mediumText,
    marginTop: 4,
  },
  tabLabelFocused: {
    color: Colors.primaryTeal,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -5,
    backgroundColor: Colors.accentSalmon,
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