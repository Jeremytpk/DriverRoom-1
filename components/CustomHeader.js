import React from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CustomHeader = ({ title }) => {
  const navigation = useNavigation();
  const BackButton = (
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
      <Image
        source={require('../assets/png/back_circle.png')}
        style={[styles.backIcon, { tintColor: 'black' }]}
      />
    </TouchableOpacity>
  );
  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.headerContainer}>
          {BackButton}
          <View style={styles.titleContainer}>
            <View style={{ flex: 1 }} />
            <View style={styles.titleWrapper}>
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            </View>
            <View style={{ flex: 1 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <View style={styles.headerContainer}>
      {BackButton}
      <View style={styles.titleContainer}>
        <View style={{ flex: 1 }} />
        <View style={styles.titleWrapper}>
          <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
        </View>
        <View style={{ flex: 1 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    padding: 6,
    zIndex: 2,
  },
  backIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    tintColor: 'black',
  },
  safeArea: {
    backgroundColor: '#fff',
  },
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  backButton: {
    padding: 6,
    zIndex: 2,
  },
  backIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    tintColor: 'black',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    maxWidth: 250,
  },
});

export default CustomHeader;
