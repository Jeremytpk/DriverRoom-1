import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const Colors = {
  primaryTeal: '#2E8B57',
  white: '#FFFFFF',
  inactiveGray: '#9AA0A6',
  border: '#E8EAED',
  darkText: '#2C3E50',
};

const BottomTab = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData } = useAuth();

  const getActiveTab = () => {
    const routeName = route.name;
    if (routeName === 'Home' || routeName === 'HomeScreenContent') {
      return 'Home';
    } else if (routeName === 'Posts') {
      return 'Posts';
    } else if (routeName === 'Settings') {
      return 'Settings';
    }
    return 'Home';
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tabName) => {
    if (tabName === activeTab) return;

    switch (tabName) {
      case 'Home':
        navigation.navigate('Home');
        break;
      case 'Posts':
        navigation.navigate('Posts');
        break;
      case 'Settings':
        navigation.navigate('Settings');
        break;
    }
  };

  // Check if Posts tab should be visible
  const shouldShowPosts = userData?.allowPosts || userData?.isDsp || userData?.role === 'company';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress('Home')}
      >
        <Image
          source={require('../assets/png/home.png')}
          style={[
            styles.tabIcon,
            { tintColor: activeTab === 'Home' ? Colors.primaryTeal : Colors.inactiveGray }
          ]}
        />
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'Home' ? Colors.primaryTeal : Colors.inactiveGray }
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {shouldShowPosts && (
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabPress('Posts')}
        >
          <Image
            source={require('../assets/posts.png')}
            style={[
              styles.tabIcon,
              { tintColor: activeTab === 'Posts' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'Posts' ? Colors.primaryTeal : Colors.inactiveGray }
            ]}
          >
            Posts
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress('Settings')}
      >
        <Image
          source={require('../assets/png/settings.png')}
          style={[
            styles.tabIcon,
            { tintColor: activeTab === 'Settings' ? Colors.primaryTeal : Colors.inactiveGray }
          ]}
        />
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'Settings' ? Colors.primaryTeal : Colors.inactiveGray }
          ]}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    width: 22,
    height: 22,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BottomTab;