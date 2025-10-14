import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/CustomHeader';

const screenWidth = Dimensions.get('window').width;

const AnalyticsDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ total: 0, drivers: 0, trainers: 0 });
  const [companies, setCompanies] = useState(0);
  const [usageStats, setUsageStats] = useState({ messages: 0, gateCodes: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Users
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => doc.data());
        const drivers = users.filter(u => u.role === 'driver').length;
        const trainers = users.filter(u => u.role === 'trainer').length;
        setUserStats({ total: users.length, drivers, trainers });
        // Companies
        const companiesSnap = await getDocs(collection(db, 'companies'));
        setCompanies(companiesSnap.size);
        // Messages
        let messagesCount = 0;
        const teamChatsSnap = await getDocs(collection(db, 'teamChats'));
        for (const chat of teamChatsSnap.docs) {
          const messagesSnap = await getDocs(collection(db, 'teamChats', chat.id, 'messages'));
          messagesCount += messagesSnap.size;
        }
        // Gate Codes
        const gateCodesSnap = await getDocs(collection(db, 'gateCodes'));
        setUsageStats({ messages: messagesCount, gateCodes: gateCodesSnap.size });
      } catch (e) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

   return (
     <View style={{ flex: 1 }}>
      <CustomHeader navigation={navigation} title="Analytics Dashboard" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E8B57" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>User Statistics</Text>
            <View style={styles.row}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{userStats.total}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{userStats.drivers}</Text>
                <Text style={styles.statLabel}>Drivers</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{userStats.trainers}</Text>
                <Text style={styles.statLabel}>Trainers</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{companies}</Text>
                <Text style={styles.statLabel}>Companies</Text>
              </View>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>App Usage</Text>
            <View style={styles.row}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{usageStats.messages}</Text>
                <Text style={styles.statLabel}>Messages Sent</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{usageStats.gateCodes}</Text>
                <Text style={styles.statLabel}>Gate Codes</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text
              style={styles.graphicsButton}
              onPress={() => navigation.navigate('AnalyticsGraphicsScreen')}
            >
              📊 View Analytics Graphics
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  graphicsButton: {
    backgroundColor: '#2E8B57',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 8,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#2E8B57',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#2E8B57',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 14,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 15,
    color: '#888',
  },
});

export default AnalyticsDashboard;
